import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { DocumentProvider, useDocument } from "../context/DocumentContext";
import { AudioProvider } from "../context/AudioContext";
import { EditorProvider, useEditorContext } from "../context/EditorContext";
import { ExhibitsPanelProvider } from "./ExhibitsPanel/ExhibitsPanel";
import { StageProvider, useStage, type AppStage } from "../context/StageContext";
import { IntakeProvider } from "../context/IntakeContext";
import { ConflictProvider } from "./conflict/conflictStore";
import { KeytermProvider } from "./DeepgramKeytermManager/keytermStore";
import { Toolbar } from "./Toolbar/Toolbar";
import { AudioPlayer } from "./AudioPlayer/AudioPlayer";
import { RightSidebar } from "./RightSidebar/RightSidebar";
import { WorkspaceSidebar } from "./WorkspaceSidebar/WorkspaceSidebar";
import { CaseScopedErrorBoundary } from "./CaseScopedErrorBoundary";

// Stage screens are code-split: each renders for exactly one stage, and the
// editor screen pulls the heavy TipTap/ProseMirror bundle. Loading them lazily
// keeps the initial app-shell chunk small and defers the editor bundle until a
// reporter actually opens the editor/workspace stage. Suspense boundaries are
// provided by StageRouter and CaseShell below.
const TranscriptEditor = lazy(() =>
  import("./TranscriptEditor/TranscriptEditor").then((m) => ({ default: m.TranscriptEditor })),
);
const IntakeScreen = lazy(() =>
  import("./IntakeScreen/IntakeScreen").then((m) => ({ default: m.IntakeScreen })),
);
const TranscriptCreationScreen = lazy(() =>
  import("./TranscriptCreationScreen").then((m) => ({ default: m.TranscriptCreationScreen })),
);
const CertificationScreen = lazy(() =>
  import("./CertificationScreen/CertificationScreen").then((m) => ({ default: m.CertificationScreen })),
);
const ExportScreen = lazy(() =>
  import("./ExportScreen/ExportScreen").then((m) => ({ default: m.ExportScreen })),
);
const CaseBrowserScreen = lazy(() =>
  import("./CaseBrowserScreen").then((m) => ({ default: m.CaseBrowserScreen })),
);

function ScreenFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
      Loading...
    </div>
  );
}
import { CaseProvider } from "../context/CaseContext";
import { useCase } from "../context/useCase";
import type { DepoEditorConfig } from "../types";
import { FIXTURE_LANGUAGE_MAP } from "../mocks/fixtures";
import { useIntake } from "../context/useIntake";
import { saveCase } from "../api/caseService";
import { buildManagedKeyterms } from "../lib/keyterms/managedKeyterms";
import { AuthGate } from "./AuthGate/AuthGate";
import { listWorkspaceTranscriptJobs } from "../api/workspaceService";
import type { TranscriptJobRow } from "../api/transcriptRepository";
import { WorkspaceTranscriptChooser } from "./WorkspaceTranscriptChooser";

// ─── Editor workspace (stages 2-7) ───────────────────────────────────────────

function EditorInner({ config }: { config: DepoEditorConfig }) {
  const { loadDocument, saveNow, state } = useDocument();
  const { setLanguageMap } = useEditorContext();
  const { registerNavigationGuard } = useCase();
  const { record } = useIntake();
  const { stage } = useStage();

  useEffect(() => {
    loadDocument();
    setLanguageMap(FIXTURE_LANGUAGE_MAP);
  }, [loadDocument, setLanguageMap]);

  useEffect(() => {
    registerNavigationGuard({
      dirty: state.dirty,
      save: async () => {
        await saveNow();
        await saveCase({ ...record, stage });
      },
    });

    return () => {
      registerNavigationGuard(null);
    };
  }, [record, registerNavigationGuard, saveNow, stage, state.dirty]);

  const mediaUrl = state.document?.media_url ?? "";
  const duration = state.document?.duration ?? 0;
  const audioSegments = state.audioSegments;

  return (
    <ExhibitsPanelProvider>
      <div className="depo-editor h-full flex flex-col bg-white text-slate-900">
        <Toolbar jobId={config.jobId ?? ""} onSave={saveNow} />

        <div className="flex-1 min-h-0 flex overflow-hidden">
          <WorkspaceSidebar />
          <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <TranscriptEditor readOnly={config.readOnly ?? false} />
            {(mediaUrl || audioSegments.length > 0) && (
              <AudioPlayer mediaUrl={mediaUrl} duration={duration} audioSegments={audioSegments} />
            )}
          </main>
          <RightSidebar />
        </div>
      </div>
    </ExhibitsPanelProvider>
  );
}

// ─── Stage router ─────────────────────────────────────────────────────────────

function StageRouter({
  config,
  activeCaseId,
}: {
  config: DepoEditorConfig;
  activeCaseId: string;
}) {
  const { stage } = useStage();

  return (
    <Suspense fallback={<ScreenFallback />}>
      {stage === "intake" ? (
        <IntakeScreen jobId={activeCaseId} />
      ) : stage === "creation" ? (
        <TranscriptCreationScreen caseId={activeCaseId} />
      ) : stage === "workspace" ? (
        <WorkspaceStage config={config} activeCaseId={activeCaseId} />
      ) : (
        <AudioProvider>
          <DocumentProvider jobId={activeCaseId}>
            <EditorProvider>
              {stage === "certification" ? (
                <CertificationScreen jobId={activeCaseId} />
              ) : stage === "export" ? (
                <ExportScreen jobId={activeCaseId} />
              ) : (
                <EditorInner config={{ ...config, jobId: activeCaseId }} />
              )}
            </EditorProvider>
          </DocumentProvider>
        </AudioProvider>
      )}
    </Suspense>
  );
}

function WorkspaceStage({
  config,
  activeCaseId,
}: {
  config: DepoEditorConfig;
  activeCaseId: string;
}) {
  const { workspaceTargetId, openWorkspace, setStage } = useStage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptJobRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadTranscriptChoices() {
      setLoading(true);
      setError(null);
      try {
        const jobs = await listWorkspaceTranscriptJobs(activeCaseId);
        if (!cancelled) {
          setTranscripts(jobs.filter((job) => job.status === "completed"));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTranscriptChoices();
    return () => {
      cancelled = true;
    };
  }, [activeCaseId]);

  const resolvedTargetId = useMemo(() => {
    if (workspaceTargetId) {
      return workspaceTargetId;
    }
    if (transcripts.length === 1) {
      return transcripts[0].transcript_id;
    }
    return null;
  }, [transcripts, workspaceTargetId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-sm text-slate-500">
        Loading transcript selection...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          Failed to load transcripts: {error}
        </div>
      </div>
    );
  }

  if (transcripts.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Transcript Workspace</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">No transcript is available yet.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Generate a transcript from Stage 2 before opening the Workspace.
          </p>
          <button
            type="button"
            onClick={() => setStage("creation")}
            className="mt-6 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Go to Transcript Creation
          </button>
        </div>
      </div>
    );
  }

  if (!resolvedTargetId) {
    return (
      <div className="min-h-screen bg-slate-100 px-6 py-10">
        <WorkspaceTranscriptChooser
          transcripts={transcripts}
          onOpenTranscript={(transcriptId) => openWorkspace(transcriptId)}
          onOpenTranscriptCreation={() => setStage("creation")}
        />
      </div>
    );
  }

  return (
    <AudioProvider>
      <DocumentProvider key={resolvedTargetId} jobId={resolvedTargetId}>
        <EditorProvider>
          <EditorInner config={{ ...config, jobId: resolvedTargetId }} />
        </EditorProvider>
      </DocumentProvider>
    </AudioProvider>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

function CaseSwitchDialog() {
  const {
    switchDialog,
    retrySaveAndContinue,
    discardAndContinue,
    cancelSwitch,
  } = useCase();

  if (!switchDialog.open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Save Failed</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Couldn&apos;t save before switching cases.</h2>
        <p className="mt-3 text-sm text-slate-600">
          Automatic save failed while trying to {switchDialog.targetLabel}. Retry the save, discard the unsaved changes, or stay on the current case.
        </p>
        {switchDialog.error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Save failed: {switchDialog.error}
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={cancelSwitch}
            disabled={switchDialog.busy}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void discardAndContinue()}
            disabled={switchDialog.busy}
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
          >
            Discard and Switch
          </button>
          <button
            type="button"
            onClick={() => void retrySaveAndContinue()}
            disabled={switchDialog.busy}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {switchDialog.busy ? "Saving..." : "Retry Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CaseScopedShell({
  config,
  activeCaseId,
  initialStage,
  initialRecord,
  initialProvenance,
}: {
  config: DepoEditorConfig;
  activeCaseId: string;
  initialStage: AppStage;
  initialRecord: ReturnType<typeof useCase>["activeRecord"];
  initialProvenance: ReturnType<typeof useCase>["activeProvenance"];
}) {
  const { showBrowser } = useCase();
  const initialKeyterms = initialRecord
    ? buildManagedKeyterms({ record: initialRecord, provenance: initialProvenance })
    : [];

  return (
    <KeytermProvider initialTerms={initialKeyterms}>
      <CaseScopedErrorBoundary onBackToCases={() => void showBrowser()}>
        <StageProvider initialStage={initialStage}>
          <IntakeProvider initialRecord={initialRecord}>
            <ConflictProvider initialProvenance={initialProvenance}>
              <StageRouter config={config} activeCaseId={activeCaseId} />
            </ConflictProvider>
          </IntakeProvider>
        </StageProvider>
      </CaseScopedErrorBoundary>
    </KeytermProvider>
  );
}

function CaseShell({ config }: { config: DepoEditorConfig }) {
  const { ready, activeCaseId, activeRecord, activeStage, activeProvenance } = useCase();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Loading case lifecycle...
      </div>
    );
  }

  return (
    <>
      {activeCaseId && activeStage ? (
        <CaseScopedShell
          key={activeCaseId}
          config={config}
          activeCaseId={activeCaseId}
          initialStage={activeStage}
          initialRecord={activeRecord}
          initialProvenance={activeProvenance}
        />
      ) : (
        <Suspense fallback={<ScreenFallback />}>
          <CaseBrowserScreen />
        </Suspense>
      )}
      <CaseSwitchDialog />
    </>
  );
}

export function DepoEditor({ config }: { config: DepoEditorConfig }) {
  return (
    <AuthGate config={config}>
      <CaseProvider configJobId={config.jobId}>
        <CaseShell config={config} />
      </CaseProvider>
    </AuthGate>
  );
}
