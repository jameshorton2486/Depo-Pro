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
  intake:        "1  Intake",
  creation:      "2  Transcript Creation",
  workspace:     "3  Transcript Workspace",
  exhibits:      "4  Exhibits",
  ufm:           "5  UFM Insertions",
  certification: "6  Certification",
  export:        "7  Export",
};

export const STAGE_ORDER: AppStage[] = [
  "intake", "creation", "workspace", "exhibits", "ufm", "certification", "export",
];

interface StageContextValue {
  stage: AppStage;
  setStage: (s: Stage) => void;
}

const StageContext = createContext<StageContextValue | null>(null);

export function StageProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStageInternal] = useState<AppStage>("intake");

  function setStage(s: Stage) {
    // Map legacy "editor" alias to "workspace"
    setStageInternal(s === "editor" ? "workspace" : s);
  }

  return (
    <StageContext.Provider value={{ stage, setStage }}>
      {children}
    </StageContext.Provider>
  );
}

export function useStage(): StageContextValue {
  const ctx = useContext(StageContext);
  if (!ctx) throw new Error("useStage must be used inside StageProvider");
  return ctx;
}
