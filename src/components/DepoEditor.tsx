import { useEffect } from "react";
import { DocumentProvider, useDocument } from "../context/DocumentContext";
import { AudioProvider } from "../context/AudioContext";
import { EditorProvider, useEditorContext } from "../context/EditorContext";
import { ExhibitsPanelProvider } from "./ExhibitsPanel/ExhibitsPanel";
import { StageProvider, useStage } from "../context/StageContext";
import { IntakeProvider } from "../context/IntakeContext";
import { ConflictProvider } from "./conflict/conflictStore";
import { KeytermProvider } from "./DeepgramKeytermManager/keytermStore";
import { Toolbar } from "./Toolbar/Toolbar";
import { TranscriptEditor } from "./TranscriptEditor/TranscriptEditor";
import { AudioPlayer } from "./AudioPlayer/AudioPlayer";
import { RightSidebar } from "./RightSidebar/RightSidebar";
import { IntakeScreen } from "./IntakeScreen/IntakeScreen";
import { CertificationScreen } from "./CertificationScreen/CertificationScreen";
import { ExportScreen } from "./ExportScreen/ExportScreen";
import type { DepoEditorConfig } from "../types";
import { FIXTURE_LANGUAGE_MAP } from "../mocks/fixtures";

// ─── Editor workspace (stages 2-7) ───────────────────────────────────────────

function EditorInner({ config }: { config: DepoEditorConfig }) {
  const { loadDocument, saveNow, state } = useDocument();
  const { setLanguageMap } = useEditorContext();

  useEffect(() => {
    loadDocument();
    setLanguageMap(FIXTURE_LANGUAGE_MAP);
  }, [loadDocument, setLanguageMap]);

  const mediaUrl = state.document?.media_url ?? "";
  const duration = state.document?.duration ?? 0;

  return (
    <div className="depo-editor h-full flex flex-col bg-white text-slate-900">
      <Toolbar jobId={config.jobId} onSave={saveNow} />

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

function StageRouter({ config }: { config: DepoEditorConfig }) {
  const { stage } = useStage();

  if (stage === "intake") {
    return <IntakeScreen jobId={config.jobId} />;
  }

  return (
    <AudioProvider>
      <DocumentProvider jobId={config.jobId}>
        <EditorProvider>
          <ExhibitsPanelProvider>
            {stage === "certification" ? (
              <CertificationScreen jobId={config.jobId} />
            ) : stage === "export" ? (
              <ExportScreen jobId={config.jobId} />
            ) : (
              <EditorInner config={config} />
            )}
          </ExhibitsPanelProvider>
        </EditorProvider>
      </DocumentProvider>
    </AudioProvider>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export function DepoEditor({ config }: { config: DepoEditorConfig }) {
  return (
    <StageProvider>
      <IntakeProvider>
        <ConflictProvider>
          <KeytermProvider initialTerms={[]}>
            <StageRouter config={config} />
          </KeytermProvider>
        </ConflictProvider>
      </IntakeProvider>
    </StageProvider>
  );
}
