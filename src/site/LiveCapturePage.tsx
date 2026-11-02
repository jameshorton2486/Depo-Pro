import { useEffect, useRef, useState } from "react";
import { browserFingerprint, licensingApi } from "../lib/licensingApi";
import { listRecordings, loadLatestTranscript, persistChunk, persistTranscript, recordingBlob } from "../lib/browserRecordingStore";
import { supabase } from "../lib/supabase";
import { deepgramListenUrl, finalizeTranscriptionSocket, parseLiveTranscript, reconnectDelay, waitForRecorderStop } from "../lib/liveTranscription";
import { createCaptureIdentity, observeStorageOperation } from "../lib/liveCaptureSession";

type Line = { speaker: number; text: string; final: boolean };

export function LiveCapturePage() {
  const [status, setStatus] = useState("Ready to record locally.");
  const [lines, setLines] = useState<Line[]>([]);
  const [recording, setRecording] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [savedSessions, setSavedSessions] = useState<Array<{ sessionId: string; createdAt: number; chunks: number }>>([]);
  const localRecorder = useRef<MediaRecorder | null>(null);
  const cloudRecorder = useRef<MediaRecorder | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const sessionId = useRef<string>(crypto.randomUUID());
  const licenseSessionId = useRef<string | null>(null);
  const startedAt = useRef(0);
  const heartbeat = useRef<number | null>(null);
  const recordingActive = useRef(false);
  const stopping = useRef(false);
  const mimeTypeRef = useRef("audio/webm");
  const pendingCloud = useRef<ArrayBuffer[]>([]);
  const cloudGeneration = useRef(0);
  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<number | null>(null);
  const persistence = useRef(new Set<Promise<void>>());
  const cloudSends = useRef(new Set<Promise<void>>());
  const storageFailed = useRef(false);

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    listRecordings().then(setSavedSessions).catch(() => setStatus("Saved-recording storage is unavailable in this browser."));
    loadLatestTranscript().then(saved => saved && setLines(saved.lines)).catch(() => setStatus("Saved transcript recovery is unavailable in this browser."));
    return () => {
      if (heartbeat.current) window.clearInterval(heartbeat.current);
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
    };
  }, []);

  function trackPersistence(operation: Promise<void>) {
    const observed = observeStorageOperation(operation, message => {
      storageFailed.current = true;
      setStatus(message);
    });
    persistence.current.add(observed);
    observed.catch(() => undefined).finally(() => persistence.current.delete(observed));
  }

  function beginLocalRecorder(mimeType: string) {
    if (!stream.current) return;
    let localSequence = 0;
    const next = new MediaRecorder(stream.current, { mimeType });
    localRecorder.current = next;
    next.ondataavailable = (event) => {
      if (!event.data.size) return;
      trackPersistence(persistChunk({ sessionId: sessionId.current, segment: 0, sequence: localSequence++, mimeType, createdAt: Date.now(), data: event.data }));
    };
    next.start(1000);
  }

  function beginCloudRecorder(mimeType: string) {
    if (!stream.current) return;
    const generation = cloudGeneration.current;
    const next = new MediaRecorder(stream.current, { mimeType });
    cloudRecorder.current = next;
    next.ondataavailable = event => {
      if (!event.data.size || generation !== cloudGeneration.current) return;
      const operation = event.data.arrayBuffer().then(bytes => {
        if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(bytes);
        else pendingCloud.current.push(bytes);
      });
      cloudSends.current.add(operation);
      operation.then(() => cloudSends.current.delete(operation), () => cloudSends.current.delete(operation));
    };
    next.start(1000);
  }

  function rotateRecorderForReconnect() {
    cloudGeneration.current += 1;
    pendingCloud.current = [];
    if (cloudRecorder.current?.state !== "inactive") cloudRecorder.current?.stop();
    beginCloudRecorder(mimeTypeRef.current);
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
      const incoming = parseLiveTranscript(String(event.data));
      if (!incoming.length) return;
      setLines(previous => {
        const next = incoming[0]?.final ? [...previous.filter(existing => existing.final), ...incoming] : [...previous.filter(existing => existing.final), ...incoming];
        if (incoming[0]?.final) trackPersistence(persistTranscript(sessionId.current, next.filter(line => line.final)));
        return next;
      });
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
      const identity = createCaptureIdentity();
      sessionId.current = identity.recordingSessionId;
      licenseSessionId.current = identity.licensingSessionId;
      setLines(identity.lines);
      cloudGeneration.current = 0;
      pendingCloud.current = [];
      persistence.current = new Set();
      cloudSends.current = new Set();
      storageFailed.current = false;
      stopping.current = false;
      recordingActive.current = true;
      beginLocalRecorder(mimeType);
      if (signedIn) beginCloudRecorder(mimeType);
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
      setStatus(`Recording could not start. ${error instanceof Error ? error.message : "Microphone access failed."}`);
      stream.current?.getTracks().forEach(track => track.stop());
    }
  }

  async function stop() {
    stopping.current = true;
    recordingActive.current = false;
    if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
    await Promise.all([localRecorder.current && waitForRecorderStop(localRecorder.current), cloudRecorder.current && waitForRecorderStop(cloudRecorder.current)].filter(Boolean));
    await Promise.allSettled([...persistence.current]);
    await Promise.allSettled([...cloudSends.current]);
    await finalizeTranscriptionSocket(socket.current);
    await Promise.allSettled([...persistence.current]);
    stream.current?.getTracks().forEach(track => track.stop());
    if (heartbeat.current) window.clearInterval(heartbeat.current);
    const seconds = (Date.now() - startedAt.current) / 1000;
    if (licenseSessionId.current) await licensingApi.close(licenseSessionId.current, seconds).catch(() => undefined);
    setRecording(false);
    setSavedSessions(await listRecordings().catch(() => []));
    licenseSessionId.current = null;
    socket.current = null;
    localRecorder.current = null;
    cloudRecorder.current = null;
    setStatus(storageFailed.current ? "Recording stopped, but browser storage reported a failure. Download and verify the available audio before closing this page." : "Recording stopped. Audio and final transcript remain saved in this browser until you download or import them.");
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
