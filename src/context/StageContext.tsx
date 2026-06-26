import type React from "react";
import { createContext, useContext, useState } from "react";

// The seven official DEPO-PRO workflow stages.
export type AppStage =
  | "intake"          // Stage 1 — Case intake & metadata
  | "creation"        // Stage 2 — Transcript creation / Deepgram
  | "workspace"       // Stage 3 — Transcript editing workspace
  | "exhibits"        // Stage 4 — Exhibit management
  | "ufm"             // Stage 5 — UFM insertions
  | "certification"   // Stage 6 — Certification
  | "export";         // Stage 7 — Export

// Legacy alias — the editor still calls setStage("editor") in some places.
// Map "editor" → "workspace" so old code doesn't break.
export type Stage = AppStage | "editor";

export const STAGE_LABELS: Record<AppStage, string> = {
  intake:        "Intake",
  creation:      "Transcript Creation",
  workspace:     "Transcript Workspace",
  exhibits:      "Exhibits",
  ufm:           "UFM Insertions",
  certification: "Certification",
  export:        "Export",
};

export const STAGE_ORDER: AppStage[] = [
  "intake", "creation", "workspace", "exhibits", "ufm", "certification", "export",
];

interface StageContextValue {
  stage: AppStage;
  setStage: (s: Stage) => void;
  workspaceTargetId: string | null;
  setWorkspaceTargetId: (targetId: string | null) => void;
  openWorkspace: (targetId?: string | null) => void;
}

const StageContext = createContext<StageContextValue | null>(null);

export function StageProvider({
  initialStage = "intake",
  children,
}: {
  initialStage?: AppStage;
  children: React.ReactNode;
}) {
  const [stage, setStageInternal] = useState<AppStage>(initialStage);
  const [workspaceTargetId, setWorkspaceTargetId] = useState<string | null>(null);

  function setStage(s: Stage) {
    // Map legacy "editor" alias to "workspace"
    const nextStage = s === "editor" ? "workspace" : s;
    if (nextStage !== "workspace") {
      setWorkspaceTargetId(null);
    }
    setStageInternal(nextStage);
  }

  function openWorkspace(targetId?: string | null) {
    setWorkspaceTargetId(targetId ?? null);
    setStageInternal("workspace");
  }

  return (
    <StageContext.Provider value={{ stage, setStage, workspaceTargetId, setWorkspaceTargetId, openWorkspace }}>
      {children}
    </StageContext.Provider>
  );
}

export function useStage(): StageContextValue {
  const ctx = useContext(StageContext);
  if (!ctx) throw new Error("useStage must be used inside StageProvider");
  return ctx;
}
