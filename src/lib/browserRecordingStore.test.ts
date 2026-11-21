import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { loadLatestTranscript, loadRecording, persistChunk, persistTranscript, recordingBlob } from "./browserRecordingStore";

beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("depo-pro-live-recordings");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
});

describe("browser recording recovery", () => {
  it("persists the final audio chunk before producing one continuous recording", async () => {
    await persistChunk({ sessionId: "one", segment: 0, sequence: 0, mimeType: "audio/webm", createdAt: 1, data: new Blob(["header"]) });
    const finalWrite = persistChunk({ sessionId: "one", segment: 0, sequence: 1, mimeType: "audio/webm", createdAt: 2, data: new Blob(["final"]) });
    await finalWrite;
    expect((await loadRecording("one")).map(row => row.sequence)).toEqual([0, 1]);
    expect(await (await recordingBlob("one")).text()).toBe("headerfinal");
  });

  it("keeps consecutive recordings isolated", async () => {
    await persistChunk({ sessionId: "first", segment: 0, sequence: 0, mimeType: "audio/webm", createdAt: 1, data: new Blob(["first"]) });
    await persistChunk({ sessionId: "second", segment: 0, sequence: 0, mimeType: "audio/webm", createdAt: 2, data: new Blob(["second"]) });
    expect(await (await recordingBlob("first")).text()).toBe("first");
    expect(await (await recordingBlob("second")).text()).toBe("second");
  });

  it("recovers the newest final transcript after a reload", async () => {
    await persistTranscript("first", [{ speaker: 0, text: "Old", final: true }]);
    await new Promise(resolve => setTimeout(resolve, 2));
    await persistTranscript("second", [{ speaker: 1, text: "Recovered testimony", final: true }]);
    expect(await loadLatestTranscript()).toEqual({ sessionId: "second", lines: [{ speaker: 1, text: "Recovered testimony", final: true }] });
  });
});
