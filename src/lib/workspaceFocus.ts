type WorkspaceSidebarTab = "speakers" | "suggestions" | "confidence" | "exhibits" | "changelog";

interface WorkspaceFocusTarget {
  transcriptId: string | null;
  sidebarTab: WorkspaceSidebarTab;
}

function transcriptFocusKey(caseId: string) {
  return `depo-pro.workspace.focus.transcript.${caseId}`;
}

function sidebarFocusKey(caseId: string) {
  return `depo-pro.workspace.focus.sidebar.${caseId}`;
}

export function queueWorkspaceFocusTarget(caseId: string, target: WorkspaceFocusTarget) {
  try {
    if (target.transcriptId) {
      window.localStorage.setItem(transcriptFocusKey(caseId), target.transcriptId);
    } else {
      window.localStorage.removeItem(transcriptFocusKey(caseId));
    }
    window.localStorage.setItem(sidebarFocusKey(caseId), target.sidebarTab);
  } catch {
    return;
  }
}

export function consumeWorkspaceFocusTranscript(caseId: string): string | null {
  try {
    const value = window.localStorage.getItem(transcriptFocusKey(caseId));
    if (value) {
      window.localStorage.removeItem(transcriptFocusKey(caseId));
    }
    return value;
  } catch {
    return null;
  }
}

export function consumeWorkspaceSidebarTab(caseId: string): WorkspaceSidebarTab | null {
  try {
    const value = window.localStorage.getItem(sidebarFocusKey(caseId));
    if (!value) {
      return null;
    }
    window.localStorage.removeItem(sidebarFocusKey(caseId));
    return (
      value === "speakers"
      || value === "suggestions"
      || value === "confidence"
      || value === "exhibits"
      || value === "changelog"
    )
      ? value
      : null;
  } catch {
    return null;
  }
}

export type { WorkspaceFocusTarget, WorkspaceSidebarTab };
