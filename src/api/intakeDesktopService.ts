import { externalJsonRequest } from "./client";

type OpenInNotepadResponse = {
  ok: boolean;
  path?: string;
  reason?: string;
};

const LOCAL_INTAKE_BASE_URL = "http://localhost:8787";

function downloadJson(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function openJsonPreviewInNotepad(filename: string, content: string): Promise<"notepad" | "download"> {
  try {
    const response = await externalJsonRequest<OpenInNotepadResponse>(
      "POST",
      `${LOCAL_INTAKE_BASE_URL}/api/intake/open-in-notepad`,
      {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, content }),
      },
    );

    if (response.ok) {
      return "notepad";
    }
  } catch (error) {
    // Intentional: desktop service unavailable in web context; log for diagnostics.
    console.error("[intakeDesktopService] Desktop service call failed:", error);
  }

  downloadJson(filename, content);
  return "download";
}
