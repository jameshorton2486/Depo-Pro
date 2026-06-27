import type React from "react";
import { useEffect, useState } from "react";
import {
  ClipboardCheck,
  Clock,
  Paperclip,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useDocument } from "../../context/DocumentContext";
import { ChangeLogPanel } from "../ChangeLogPanel/ChangeLogPanel";
import { ConfidencePanel } from "../ConfidencePanel/ConfidencePanel";
import { CorrectionsPanel } from "../CorrectionsPanel/CorrectionsPanel";
import { ExhibitsPanel } from "../ExhibitsPanel/ExhibitsPanel";
import { SpeakerPanel } from "../SpeakerPanel/SpeakerPanel";
import { SuggestionsPanel } from "../SuggestionsPanel/SuggestionsPanel";

type Tab =
  | "speakers"
  | "corrections"
  | "suggestions"
  | "confidence"
  | "exhibits"
  | "changelog";

const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: "speakers", icon: <Users size={14} />, label: "Speakers" },
  {
    id: "corrections",
    icon: <ClipboardCheck size={14} />,
    label: "Corrections",
  },
  { id: "suggestions", icon: <Sparkles size={14} />, label: "AI Review" },
  { id: "confidence", icon: <ShieldCheck size={14} />, label: "Confidence" },
  { id: "exhibits", icon: <Paperclip size={14} />, label: "Exhibits" },
  { id: "changelog", icon: <Clock size={14} />, label: "Changes" },
];

export function RightSidebar() {
  const { state } = useDocument();
  const report = state.correctionReport;
  const [active, setActive] = useState<Tab>("corrections");

  useEffect(() => {
    if (!report) return;

    const hasIssues =
      report.summary.ambiguous_flags > 0 ||
      report.summary.speaker_issues > 0 ||
      report.summary.implausible_money_flags > 0 ||
      report.summary.retranscription_candidates > 0;

    if (hasIssues) {
      setActive("corrections");
    }
  }, [report]);

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-slate-200 bg-slate-50">
      <nav className="flex border-b border-slate-200 bg-white">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 pb-1 pt-2 text-xs font-medium transition-colors ${
              active === tab.id
                ? "border-b-2 border-blue-400 bg-white text-blue-400"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-200"
            }`}
            title={tab.label}
          >
            {tab.icon}
            <span className="leading-none">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1">
        {active === "speakers" && <SpeakerPanel />}
        {active === "corrections" && <CorrectionsPanel />}
        {active === "suggestions" && <SuggestionsPanel />}
        {active === "confidence" && <ConfidencePanel />}
        {active === "exhibits" && <ExhibitsPanel />}
        {active === "changelog" && <ChangeLogPanel />}
      </div>
    </aside>
  );
}
