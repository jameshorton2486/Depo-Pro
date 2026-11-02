export type CaptureIdentity = { recordingSessionId: string; licensingSessionId: null; lines: [] };

export function createCaptureIdentity(makeId: () => string = () => crypto.randomUUID()): CaptureIdentity {
  return { recordingSessionId: makeId(), licensingSessionId: null, lines: [] };
}

export function storageFailureMessage(error: unknown): string {
  return `Recording storage failed. Keep this page open and stop recording safely. ${error instanceof Error ? error.message : "Browser storage is unavailable."}`;
}

export function observeStorageOperation(operation: Promise<void>, onFailure: (message: string) => void): Promise<void> {
  return operation.catch(error => {
    onFailure(storageFailureMessage(error));
    throw error;
  });
}
