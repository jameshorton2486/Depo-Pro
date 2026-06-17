import { createContext } from "react";

import type { CaseBundle } from "../api/caseLoadService";
import type { CaseRecord } from "../types/case";
import type { AppStage } from "./StageContext";

export type NavigationGuard = {
  dirty: boolean;
  save: () => Promise<void>;
};

export interface CaseContextValue {
  ready: boolean;
  activeCaseId: string | null;
  activeStage: AppStage | null;
  activeRecord: CaseRecord | null;
  activeProvenance: CaseBundle["provenance"];
  browserQuery: string;
  setBrowserQuery: (value: string) => void;
  openCase: (caseId: string, stageHint?: AppStage | null) => Promise<void>;
  createAndOpen: () => Promise<void>;
  adoptCaseRecord: (record: CaseRecord, stage?: AppStage | null, provenance?: CaseBundle["provenance"]) => void;
  showBrowser: () => Promise<void>;
  registerNavigationGuard: (guard: NavigationGuard | null) => void;
  switchDialog: {
    open: boolean;
    busy: boolean;
    error: string | null;
    targetLabel: string;
  };
  retrySaveAndContinue: () => Promise<void>;
  discardAndContinue: () => Promise<void>;
  cancelSwitch: () => void;
}

export const CaseContext = createContext<CaseContextValue | null>(null);
