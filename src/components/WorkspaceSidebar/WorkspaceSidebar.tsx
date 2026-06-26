import {
  Award,
  ClipboardList,
  Edit3,
  FolderOpen,
  Mic,
  Paperclip,
} from "lucide-react";
import { useCase } from "../../context/useCase";
import { useStage, type AppStage } from "../../context/StageContext";

const WORKSPACE_SHORTCUTS: Array<{
  stage: AppStage;
  label: string;
  title: string;
  icon: typeof FolderOpen;
}> = [
  { stage: "intake", label: "Intake", title: "Case Intake", icon: ClipboardList },
  { stage: "creation", label: "Transcript Creation", title: "Transcript Creation", icon: Mic },
  { stage: "workspace", label: "Transcript Workspace", title: "Workspace", icon: Edit3 },
  { stage: "certification", label: "Certification", title: "Certification", icon: Award },
  { stage: "exhibits", label: "Exhibits", title: "Exhibits", icon: Paperclip },
];

export function WorkspaceSidebar() {
  const { stage, setStage } = useStage();
  const { showBrowser } = useCase();

  return (
    <aside className="flex h-full w-12 shrink-0 flex-col border-r border-slate-800 bg-slate-950">
      <button
        type="button"
        title="All Cases"
        onClick={() => void showBrowser()}
        className="flex h-12 w-12 items-center justify-center text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
      >
        <FolderOpen size={18} />
      </button>

      {WORKSPACE_SHORTCUTS.map(({ stage: targetStage, title, icon: Icon }) => {
        const isActive = stage === targetStage;

        return (
          <button
            key={targetStage}
            type="button"
            title={title}
            onClick={() => setStage(targetStage)}
            className={`flex h-12 w-12 items-center justify-center transition-colors ${
              isActive
                ? "bg-slate-800 text-blue-400"
                : "text-slate-500 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Icon size={18} />
          </button>
        );
      })}
    </aside>
  );
}
