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
import { countTokens } from "../lib/keytermRanker";
import type { ManagedKeyterm } from "./DeepgramKeytermManager/types";

// ─── Seed keyterms for a new case (populated before the parser is wired) ─────

function mk(
  term: string,
  boost: number,
  category: ManagedKeyterm["category"],
  source: ManagedKeyterm["source"],
  selected = true,
  pinned = false,
  confidence = 0.85,
): ManagedKeyterm {
  return {
    id:          `seed_${term.replace(/\s+/g, "_").toLowerCase()}`,
    term,
    boost,
    category,
    source,
    notes:       "",
    selected,
    pinned,
    priority:    0,
    confidence,
    token_count: countTokens(term),
  };
}

const SEED_KEYTERMS: ManagedKeyterm[] = [
  mk("Smith v. Meridian Infrastructure Partners", 0.7, "legal_term",  "UFM Metadata", true,  true,  1.0),
  mk("Junior Hernandez",                          0.9, "proper_name", "UFM Metadata", true,  true,  1.0),
  mk("Yunior Hernandez",                          0.8, "proper_name", "Notice",       true,  false, 0.79),
  mk("Meridian Infrastructure Partners",          0.7, "company",     "UFM Metadata", true,  false, 1.0),
  mk("Rebecca Thornton",                          0.8, "proper_name", "UFM Metadata", true,  false, 0.94),
  mk("David Morales",                             0.7, "proper_name", "UFM Metadata", true,  false, 0.81),
  mk("Thornton and Associates",                   0.6, "company",     "UFM Metadata", true,  false, 0.92),
  mk("Superior Court of California",              0.5, "legal_term",  "UFM Metadata", true,  false, 0.88),
  mk("Pacific Reporting Services",                0.5, "company",     "UFM Metadata", true,  false, 1.0),
  mk("Jennifer Castillo",                         0.6, "proper_name", "UFM Metadata", true,  false, 1.0),
  mk("Los Angeles",                               0.5, "location",    "Notice",       true,  false, 0.96),
  mk("350 South Grand Avenue",                    0.4, "location",    "Scheduling Notes", true, false, 0.85),
  mk("examining attorney",                        0.5, "legal_term",  "Manual",       true,  false, 1.0),
  mk("opposing counsel",                          0.5, "legal_term",  "Manual",       true,  false, 1.0),
  mk("deposition",                                0.3, "legal_term",  "Manual",       true,  false, 1.0),
  mk("cross-examination",                         0.4, "legal_term",  "Manual",       true,  false, 1.0),
  mk("infrastructure project",                    0.5, "technical",   "Notice",       true,  false, 0.72),
  mk("CSR",                                       0.6, "legal_term",  "UFM Metadata", true,  false, 1.0),
  mk("stipulation",                               0.4, "legal_term",  "Learned",      false, false, 0.7),
  mk("voir dire",                                 0.4, "legal_term",  "Learned",      false, false, 0.7),
];

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
          <KeytermProvider initialTerms={SEED_KEYTERMS}>
            <StageRouter config={config} />
          </KeytermProvider>
        </ConflictProvider>
      </IntakeProvider>
    </StageProvider>
  );
}
