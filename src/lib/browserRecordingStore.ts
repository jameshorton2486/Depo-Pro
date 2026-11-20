export type StoredChunk = { sessionId: string; segment: number; sequence: number; mimeType: string; createdAt: number; data: Blob };
const DB_NAME = "depo-pro-live-recordings";
const STORE = "chunks";
const TRANSCRIPTS = "transcripts";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        const store = request.result.createObjectStore(STORE, { keyPath: ["sessionId", "segment", "sequence"] });
        store.createIndex("session", "sessionId");
      }
      if (!request.result.objectStoreNames.contains(TRANSCRIPTS)) request.result.createObjectStore(TRANSCRIPTS, { keyPath: "sessionId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function persistChunk(chunk: StoredChunk): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(chunk);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadRecording(sessionId: string): Promise<StoredChunk[]> {
  const db = await openDatabase();
  const rows = await new Promise<StoredChunk[]>((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).index("session").getAll(sessionId);
    request.onsuccess = () => resolve(request.result as StoredChunk[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return rows.sort((a, b) => a.segment - b.segment || a.sequence - b.sequence);
}

export async function listRecordings(): Promise<Array<{ sessionId: string; createdAt: number; chunks: number }>> {
  const db = await openDatabase();
  const rows = await new Promise<StoredChunk[]>((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as StoredChunk[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  const sessions = new Map<string, { sessionId: string; createdAt: number; chunks: number }>();
  for (const row of rows) {
    const existing = sessions.get(row.sessionId);
    sessions.set(row.sessionId, { sessionId: row.sessionId, createdAt: Math.min(existing?.createdAt ?? row.createdAt, row.createdAt), chunks: (existing?.chunks ?? 0) + 1 });
  }
  return [...sessions.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export async function recordingBlob(sessionId: string): Promise<Blob> {
  const chunks = await loadRecording(sessionId);
  return new Blob(chunks.map(row => row.data), { type: chunks[0]?.mimeType || "audio/webm" });
}

export type StoredTranscriptLine = { speaker: number; text: string; final: boolean };

export async function persistTranscript(sessionId: string, lines: StoredTranscriptLine[]): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(TRANSCRIPTS, "readwrite");
    tx.objectStore(TRANSCRIPTS).put({ sessionId, updatedAt: Date.now(), lines });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadLatestTranscript(): Promise<{ sessionId: string; lines: StoredTranscriptLine[] } | null> {
  const db = await openDatabase();
  const rows = await new Promise<Array<{ sessionId: string; updatedAt: number; lines: StoredTranscriptLine[] }>>((resolve, reject) => {
    const request = db.transaction(TRANSCRIPTS).objectStore(TRANSCRIPTS).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  const latest = rows.sort((a, b) => b.updatedAt - a.updatedAt)[0];
  return latest ? { sessionId: latest.sessionId, lines: latest.lines } : null;
}
