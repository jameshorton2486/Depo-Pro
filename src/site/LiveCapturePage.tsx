import { useEffect, useRef, useState } from "react";
import { browserFingerprint, licensingApi } from "../lib/licensingApi";
import { listRecordings, persistChunk, recordingBlob } from "../lib/browserRecordingStore";
import { supabase } from "../lib/supabase";
import { deepgramListenUrl, parseLiveTranscript, reconnectDelay } from "../lib/liveTranscription";

type Line = { speaker: number; text: string; final: boolean };

export function LiveCapturePage() {
  const [status, setStatus] = useState("Ready to record locally.");
  const [lines, setLines] = useState<Line[]>([]);
  const [recording, setRecording] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [savedSessions, setSavedSessions] = useState<Array<{ sessionId: string; createdAt: number; chunks: number }>>([]);
  const recorder = useRef<MediaRecorder | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const sessionId = useRef<string>(crypto.randomUUID());
  const licenseSessionId = useRef<string | null>(null);
  const segment = useRef(0);
  const startedAt = useRef(0);
  const heartbeat = useRef<number | null>(null);
  const recordingActive = useRef(false);
  const stopping = useRef(false);
  const mimeTypeRef = useRef("audio/webm");
  const pendingCloud = useRef<ArrayBuffer[]>([]);
  const cloudGeneration = useRef(0);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<number | null>(null);

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    listRecordings().then(setSavedSessions).catch(() => undefined);
    return () => {
      if (heartbeat.current) window.clearInterval(heartbeat.current);
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
    };
  }, []);

  function beginRecorder(mimeType: string) {
    if (!stream.current) return;
    const generation = cloudGeneration.current;
    const localSegment = segment.current++;
    let localSequence = 0;
    const next = new MediaRecorder(stream.current, { mimeType });
    recorder.current = next;
    next.ondataavailable = async (event) => {
      if (!event.data.size) return;
      await persistChunk({ sessionId: sessionId.current, segment: localSegment, sequence: localSequence++, mimeType, createdAt: Date.now(), data: event.data });
      if (generation !== cloudGeneration.current) return;
      const bytes = await event.data.arrayBuffer();
      if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(bytes);
      else pendingCloud.current.push(bytes);
    };
    next.start(1000);
  }

  function rotateRecorderForReconnect() {
    cloudGeneration.current += 1;
    pendingCloud.current = [];
    if (recorder.current?.state !== "inactive") recorder.current?.stop();
    beginRecorder(mimeTypeRef.current);
  }

  function scheduleReconnect() {
    if (!recordingActive.current || stopping.current || reconnectTimer.current) return;
    const delay = reconnectDelay(reconnectAttempt.current++);
    setStatus(`Local recording continues. Reconnecting cloud transcription in ${Math.ceil(delay / 1000)} seconds…`);
    reconnectTimer.current = window.setTimeout(() => {
      reconnectTimer.current = null;
      connectCloud(mimeTypeRef.current).catch(error => {
        setStatus(`Local recording continues. Cloud reconnect failed: ${error instanceof Error ? error.message : "connection failed"}`);
        scheduleReconnect();
      });
    }, delay);
  }

  async function connectCloud(mimeType: string) {
    const fingerprint = await browserFingerprint();
    let activeSessionId = licenseSessionId.current;
    if (!activeSessionId) {
      const grant = await licensingApi.startSession(fingerprint);
      activeSessionId = grant.session_id;
      licenseSessionId.current = activeSessionId;
      heartbeat.current = window.setInterval(() => licensingApi.heartbeat(activeSessionId as string).catch(() => undefined), grant.heartbeat_interval_seconds * 1000);
    }
    const credential = await licensingApi.credential(activeSessionId, fingerprint);
    const ws = new WebSocket(deepgramListenUrl(mimeType), ["token", credential.access_token]);
    socket.current = ws;
    ws.onopen = () => {
      reconnectAttempt.current = 0;
      for (const chunk of pendingCloud.current) ws.send(chunk);
      pendingCloud.current = [];
      setStatus("Local recording protected. Cloud transcription connected.");
    };
    ws.onmessage = (event) => {
      const line = parseLiveTranscript(String(event.data));
      if (!line) return;
      setLines(previous => line.final ? [...previous.filter(existing => existing.final), line] : [...previous.filter(existing => existing.final), line]);
    };
    ws.onerror = () => ws.close();
    ws.onclose = () => {
      if (!recordingActive.current || stopping.current) return;
      rotateRecorderForReconnect();
      scheduleReconnect();
    };
  }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder || !window.indexedDB) {
      setStatus("This browser cannot provide protected live recording. Use current Chrome or Edge over HTTPS.");
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      mimeTypeRef.current = mimeType;
      sessionId.current = crypto.randomUUID();
      segment.current = 0;
      cloudGeneration.current = 0;
      pendingCloud.current = [];
      stopping.current = false;
      recordingActive.current = true;
      beginRecorder(mimeType);
      startedAt.current = Date.now();
      setRecording(true);
      setStatus(signedIn ? "Recording locally; connecting cloud transcription…" : "Recording locally. Sign in to add cloud transcription.");
      if (signedIn) {
        connectCloud(mimeType).catch(error => {
          setStatus(`Local recording continues. Cloud transcription is unavailable: ${error instanceof Error ? error.message : "connection failed"}`);
          scheduleReconnect();
        });
      }
    } catch (error) {
      setStatus(`Cloud transcription unavailable. No audio was lost before this point. ${error instanceof Error ? error.message : ""}`);
      stream.current?.getTracks().forEach(track => track.stop());
    }
  }

  async function stop() {
    stopping.current = true;
    recordingActive.current = false;
    if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
    recorder.current?.stop();
    stream.current?.getTracks().forEach(track => track.stop());
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify({ type: "CloseStream" }));
    socket.current?.close();
    if (heartbeat.current) window.clearInterval(heartbeat.current);
    const seconds = (Date.now() - startedAt.current) / 1000;
    if (licenseSessionId.current) await licensingApi.close(licenseSessionId.current, seconds).catch(() => undefined);
    setRecording(false);
    setSavedSessions(await listRecordings().catch(() => []));
    setStatus("Recording stopped. Audio remains saved in this browser until you download or import it.");
    stopping.current = false;
  }

  async function download(savedSessionId = sessionId.current) {
    const blob = await recordingBlob(savedSessionId);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `depo-pro-live-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`; anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div className="space-y-6">
    <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap gap-3"><button onClick={start} disabled={recording} className="rounded bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-40">Start protected recording</button><button onClick={stop} disabled={!recording} className="rounded border border-slate-400 px-5 py-3 font-semibold disabled:opacity-40">Stop</button><button onClick={() => download()} className="rounded border border-slate-400 px-5 py-3 font-semibold">Download saved audio</button></div>
      <p role="status" className="mt-4 text-sm font-medium text-slate-700">{status}</p>
      {!signedIn && <p className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-950"><a className="font-semibold underline" href="/app">Sign in</a> to authorize cloud transcription. Local recording remains available without payment or sign-in.</p>}
      <p className="mt-2 text-xs text-slate-500">Microphone only. Chrome/Edge, HTTPS, and an active tab are recommended. Closing the browser may stop capture. Internet or billing failures stop cloud text, not the local chunks already saved.</p>
    </div>
    {savedSessions.length > 0 && <div className="rounded-lg border border-slate-300 bg-white p-6"><h2 className="font-semibold">Recover saved browser recordings</h2><div className="mt-3 space-y-2">{savedSessions.map(saved => <button key={saved.sessionId} onClick={() => download(saved.sessionId)} className="block text-left text-sm font-semibold text-blue-700 underline">Download {new Date(saved.createdAt).toLocaleString()} ({saved.chunks} protected chunks)</button>)}</div></div>}
    <div className="min-h-72 rounded-lg border border-slate-300 bg-white p-6 text-slate-950 shadow-sm"><h2 className="text-lg font-semibold">Live working draft</h2><div className="mt-5 space-y-4">{lines.length ? lines.map((line, index) => <div key={`${index}-${line.text}`} className={line.final ? "" : "opacity-50"}><b className="mr-3 text-blue-700">Speaker {line.speaker + 1}</b>{line.text}</div>) : <p className="text-slate-500">Speech will appear here after cloud transcription connects.</p>}</div></div>
  </div>;
}
