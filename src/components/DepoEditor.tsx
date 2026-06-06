import { useEffect } from "react";
import { DocumentProvider, useDocument } from "../context/DocumentContext";
import { AudioProvider } from "../context/AudioContext";
import { EditorProvider, useEditorContext } from "../context/EditorContext";
import { ExhibitsPanelProvider } from "./ExhibitsPanel/ExhibitsPanel";
import { StageProvider, useStage, type AppStage } from "../context/StageContext";
import { IntakeProvider } from "../context/IntakeContext";
import { ConflictProvider } from "./conflict/conflictStore";
import { KeytermProvider } from "./DeepgramKeytermManager/keytermStore";
import { Toolbar } from "./Toolbar/Toolbar";
import { TranscriptEditor } from "./TranscriptEditor/TranscriptEditor";
import { AudioPlayer } from "./AudioPlayer/AudioPlayer";
import { RightSidebar } from "./RightSidebar/RightSidebar";
import { IntakeScreen } from "./IntakeScreen/IntakeScreen";
import { TranscriptCreationScreen } from "./TranscriptCreationScreen";
import { CertificationScreen } from "./CertificationScreen/CertificationScreen";
import { ExportScreen } from "./ExportScreen/ExportScreen";
import { CaseBrowserScreen } from "./CaseBrowserScreen";
import { CaseScopedErrorBoundary } from "./CaseScopedErrorBoundary";
import { CaseProvider, useCase } from "../context/CaseContext";
import type { DepoEditorConfig } from "../types";
import { FIXTURE_LANGUAGE_MAP } from "../mocks/fixtures";
import { useIntake } from "../context/IntakeContext";
import { saveCase } from "../api/caseService";
import { buildManagedKeyterms } from "../lib/keyterms/managedKeyterms";
import { AuthGate } from "./AuthGate/AuthGate";

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

  return (
    <div className="depo-editor h-full flex flex-col bg-white text-slate-900">
      <Toolbar jobId={config.jobId ?? ""} onSave={saveNow} />

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <TranscriptEditor readOnly={config.readOnly ?? false} />
          {mediaUrl && (
            <AudioPlayer mediaUrl={mediaUrl} duration={duration} />
          )}
        </main>
        <RightSidebar />
      </div>
    </div>
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

  if (stage === "intake") {
    return <IntakeScreen jobId={activeCaseId} />;
  }

  if (stage === "creation") {
    return <TranscriptCreationScreen caseId={activeCaseId} />;
  }

  return (
    <AudioProvider>
      <DocumentProvider jobId={activeCaseId}>
        <EditorProvider>
          <ExhibitsPanelProvider>
            {stage === "certification" ? (
              <CertificationScreen jobId={activeCaseId} />
            ) : stage === "export" ? (
              <ExportScreen jobId={activeCaseId} />
            ) : (
              <EditorInner config={{ ...config, jobId: activeCaseId }} />
            )}
          </ExhibitsPanelProvider>
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
    <CaseScopedErrorBoundary onBackToCases={() => void showBrowser()}>
      <StageProvider initialStage={initialStage}>
        <IntakeProvider initialRecord={initialRecord}>
          <ConflictProvider initialProvenance={initialProvenance}>
            <KeytermProvider initialTerms={initialKeyterms}>
              <StageRouter config={config} activeCaseId={activeCaseId} />
            </KeytermProvider>
          </ConflictProvider>
        </IntakeProvider>
      </StageProvider>
    </CaseScopedErrorBoundary>
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
        <CaseBrowserScreen />
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
