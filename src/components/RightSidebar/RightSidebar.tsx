import { useState } from "react";
import { Users, Sparkles, Clock, ShieldCheck, Paperclip } from "lucide-react";
import { SpeakerPanel } from "../SpeakerPanel/SpeakerPanel";
import { SuggestionsPanel } from "../SuggestionsPanel/SuggestionsPanel";
import { ChangeLogPanel } from "../ChangeLogPanel/ChangeLogPanel";
import { ConfidencePanel } from "../ConfidencePanel/ConfidencePanel";
import { ExhibitsPanel } from "../ExhibitsPanel/ExhibitsPanel";

type Tab = "speakers" | "suggestions" | "confidence" | "exhibits" | "changelog";

const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: "speakers",   icon: <Users size={14} />,       label: "Speakers"    },
  { id: "suggestions",icon: <Sparkles size={14} />,    label: "AI Review"   },
  { id: "confidence", icon: <ShieldCheck size={14} />, label: "Confidence"  },
  { id: "exhibits",   icon: <Paperclip size={14} />,   label: "Exhibits"    },
  { id: "changelog",  icon: <Clock size={14} />,       label: "Changes"     },
];

export function RightSidebar() {
  const [active, setActive] = useState<Tab>("suggestions");

  return (
    <aside className="w-72 border-l border-slate-200 bg-slate-50 flex flex-col shrink-0 h-full">
      {/* Tab bar — 5 tabs, smaller text to fit */}
      <nav className="flex border-b border-slate-200 bg-white">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              active === t.id
                ? "text-blue-700 border-b-2 border-blue-700 bg-white"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
            title={t.label}
          >
            {t.icon}
            <span className="leading-none">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Panel content */}
      <div className="flex-1 min-h-0">
        {active === "speakers"    && <SpeakerPanel />}
        {active === "suggestions" && <SuggestionsPanel />}
        {active === "confidence"  && <ConfidencePanel />}
        {active === "exhibits"    && <ExhibitsPanel />}
        {active === "changelog"   && <ChangeLogPanel />}
      </div>
    </aside>
  );
}
