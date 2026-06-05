import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createCase } from "../api/caseService";
import { loadCaseBundle, type CaseBundle } from "../api/caseLoadService";
import type { AppStage } from "./StageContext";
import {
  DEMO_CASE_ID,
  LAST_OPENED_CASE_ID_KEY,
  normalizeCaseSearchText,
  shouldPersistLastOpenedCaseId,
} from "../lib/caseLifecycle";
import type { CaseRecord } from "../types/case";

type SwitchIntent =
  | { type: "browser" }
  | { type: "open"; caseId: string; stageHint?: AppStage | null }
  | { type: "create" };

type NavigationGuard = {
  dirty: boolean;
  save: () => Promise<void>;
};

interface CaseContextValue {
  ready: boolean;
  activeCaseId: string | null;
  activeStage: AppStage | null;
  activeRecord: CaseRecord | null;
  activeProvenance: CaseBundle["provenance"];
  browserQuery: string;
  setBrowserQuery: (value: string) => void;
  openCase: (caseId: string, stageHint?: AppStage | null) => Promise<void>;
  createAndOpen: () => Promise<void>;
  showBrowser: () => Promise<void>;
  registerNavigationGuard: (guard: NavigationGuard | null) => void;
  switchDialog: {
    open: boolean;
    busy: boolean;
    error: string | null;
    targetLabel: string;
  };
  confirmSaveAndContinue: () => Promise<void>;
  discardAndContinue: () => Promise<void>;
  cancelSwitch: () => void;
}

const CaseContext = createContext<CaseContextValue | null>(null);

function isArchivedRecord(record: CaseRecord | null): boolean {
  if (!record || typeof record !== "object") {
    return false;
  }

  return Boolean((record as CaseRecord & { archived?: boolean }).archived);
}

function readLastOpenedCaseId(): string | null {
  try {
    const value = window.localStorage.getItem(LAST_OPENED_CASE_ID_KEY);
    const normalized = normalizeCaseSearchText(value ?? "");
    if (!normalized || value === DEMO_CASE_ID) {
      if (value === DEMO_CASE_ID) {
        window.localStorage.removeItem(LAST_OPENED_CASE_ID_KEY);
      }
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function writeLastOpenedCaseId(caseId: string | null) {
  try {
    if (!caseId || !shouldPersistLastOpenedCaseId(caseId)) {
      window.localStorage.removeItem(LAST_OPENED_CASE_ID_KEY);
      return;
    }
    window.localStorage.setItem(LAST_OPENED_CASE_ID_KEY, caseId);
  } catch {
    return;
  }
}

async function resolveLaunch(caseId: string): Promise<{
  caseId: string;
  stage: AppStage;
  record: CaseRecord;
  provenance: CaseBundle["provenance"];
} | null> {
  const bundle = await loadCaseBundle(caseId);
  const record = bundle?.record ?? null;
  if (!record || isArchivedRecord(record)) {
    return null;
  }

  return {
    caseId: record.case_id,
    stage: record.stage as AppStage,
    record,
    provenance: bundle?.provenance ?? [],
  };
}

function intentLabel(intent: SwitchIntent): string {
  if (intent.type === "browser") {
    return "return to the Case Browser";
  }
  if (intent.type === "create") {
    return "start a new deposition case";
  }
  return `open case ${intent.caseId}`;
}

export function CaseProvider({
  configJobId,
  children,
}: {
  configJobId?: string;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<AppStage | null>(null);
  const [activeRecord, setActiveRecord] = useState<CaseRecord | null>(null);
  const [activeProvenance, setActiveProvenance] = useState<CaseBundle["provenance"]>([]);
  const [browserQuery, setBrowserQuery] = useState("");
  const [pendingIntent, setPendingIntent] = useState<SwitchIntent | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const guardRef = useRef<NavigationGuard | null>(null);

  const setActiveCase = useCallback((
    caseId: string | null,
    stage: AppStage | null,
    record: CaseRecord | null,
    provenance: CaseBundle["provenance"] = [],
  ) => {
    setActiveCaseId(caseId);
    setActiveStage(stage);
    setActiveRecord(record);
    setActiveProvenance(provenance);
    writeLastOpenedCaseId(caseId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function resolveStartupCase() {
      const lastOpenedCaseId = readLastOpenedCaseId();
      const candidates = [
        lastOpenedCaseId,
        configJobId,
      ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);

      for (const candidate of candidates) {
        const launch = await resolveLaunch(candidate);
        if (!launch) {
          if (candidate === lastOpenedCaseId) {
            writeLastOpenedCaseId(null);
          }
          continue;
        }

        if (cancelled) {
          return;
        }

        setActiveCase(launch.caseId, launch.stage, launch.record, launch.provenance);
        setReady(true);
        return;
      }

      if (!cancelled) {
        setReady(true);
      }
    }

    void resolveStartupCase();

    return () => {
      cancelled = true;
    };
  }, [configJobId, setActiveCase]);

  const executeIntent = useCallback(async (intent: SwitchIntent) => {
    if (intent.type === "browser") {
      setActiveCase(null, null, null);
      return;
    }

    if (intent.type === "create") {
      const record = await createCase();
      setActiveCase(record.case_id, "intake", record, []);
      return;
    }

    const launch = await resolveLaunch(intent.caseId);

    if (!launch) {
      throw new Error(`Case ${intent.caseId} was not found.`);
    }

    setActiveCase(launch.caseId, launch.stage, launch.record, launch.provenance);
  }, [setActiveCase]);

  const requestIntent = useCallback(async (intent: SwitchIntent) => {
    const guard = guardRef.current;
    if (guard?.dirty) {
      setPendingIntent(intent);
      setDialogError(null);
      return;
    }

    await executeIntent(intent);
  }, [executeIntent]);

  const openCase = useCallback(async (caseId: string, stageHint?: AppStage | null) => {
    if (caseId === activeCaseId) {
      return;
    }

    await requestIntent({ type: "open", caseId, stageHint });
  }, [activeCaseId, requestIntent]);

  const createAndOpen = useCallback(async () => {
    await requestIntent({ type: "create" });
  }, [requestIntent]);

  const showBrowser = useCallback(async () => {
    await requestIntent({ type: "browser" });
  }, [requestIntent]);

  const registerNavigationGuard = useCallback((guard: NavigationGuard | null) => {
    guardRef.current = guard;
  }, []);

  const cancelSwitch = useCallback(() => {
    setPendingIntent(null);
    setDialogBusy(false);
    setDialogError(null);
  }, []);

  const discardAndContinue = useCallback(async () => {
    if (!pendingIntent) {
      return;
    }

    const nextIntent = pendingIntent;
    setPendingIntent(null);
    setDialogBusy(false);
    setDialogError(null);
    await executeIntent(nextIntent);
  }, [executeIntent, pendingIntent]);

  const confirmSaveAndContinue = useCallback(async () => {
    if (!pendingIntent || !guardRef.current) {
      return;
    }

    setDialogBusy(true);
    setDialogError(null);

    try {
      await guardRef.current.save();
      const nextIntent = pendingIntent;
      setPendingIntent(null);
      setDialogBusy(false);
      await executeIntent(nextIntent);
    } catch (error) {
      setDialogBusy(false);
      setDialogError(error instanceof Error ? error.message : String(error));
    }
  }, [executeIntent, pendingIntent]);

  const value = useMemo<CaseContextValue>(() => ({
    ready,
    activeCaseId,
    activeStage,
    activeRecord,
    activeProvenance,
    browserQuery,
    setBrowserQuery,
    openCase,
    createAndOpen,
    showBrowser,
    registerNavigationGuard,
    switchDialog: {
      open: pendingIntent !== null,
      busy: dialogBusy,
      error: dialogError,
      targetLabel: pendingIntent ? intentLabel(pendingIntent) : "",
    },
    confirmSaveAndContinue,
    discardAndContinue,
    cancelSwitch,
  }), [
    activeCaseId,
    activeProvenance,
    activeRecord,
    activeStage,
    browserQuery,
    cancelSwitch,
    confirmSaveAndContinue,
    createAndOpen,
    dialogBusy,
    dialogError,
    discardAndContinue,
    openCase,
    pendingIntent,
    ready,
    registerNavigationGuard,
    setBrowserQuery,
    showBrowser,
  ]);

  return (
    <CaseContext.Provider value={value}>
      {children}
    </CaseContext.Provider>
  );
}

export function useCase(): CaseContextValue {
  const context = useContext(CaseContext);
  if (!context) {
    throw new Error("useCase must be used inside CaseProvider");
  }
  return context;
}
