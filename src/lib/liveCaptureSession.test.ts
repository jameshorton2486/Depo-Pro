import { describe, expect, it } from "vitest";
import { createCaptureIdentity, observeStorageOperation, storageFailureMessage } from "./liveCaptureSession";

describe("consecutive browser recordings", () => {
  it("always starts with a fresh recording ID, no closed licensing session, and no prior transcript", () => {
    const ids = ["recording-one", "recording-two"];
    const first = createCaptureIdentity(() => ids.shift() as string);
    const second = createCaptureIdentity(() => ids.shift() as string);
    expect(second).toEqual({ recordingSessionId: "recording-two", licensingSessionId: null, lines: [] });
    expect(second.recordingSessionId).not.toBe(first.recordingSessionId);
  });

  it("turns a browser-storage rejection into an explicit safety warning", () => {
    expect(storageFailureMessage(new Error("quota exceeded"))).toContain("Recording storage failed");
    expect(storageFailureMessage(new Error("quota exceeded"))).toContain("quota exceeded");
  });

  it("reports a rejected IndexedDB write to the interface", async () => {
    const messages: string[] = [];
    await expect(observeStorageOperation(Promise.reject(new Error("write failed")), message => messages.push(message))).rejects.toThrow("write failed");
    expect(messages[0]).toContain("Recording storage failed");
  });
});
