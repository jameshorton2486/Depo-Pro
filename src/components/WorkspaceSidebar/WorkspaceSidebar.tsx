import {
  Award,
  ClipboardList,
  Download,
  Edit3,
  FileStack,
  FolderOpen,
  Mic,
  Paperclip,
} from "lucide-react";
import { useCase } from "../../context/useCase";
import { useStage, type AppStage } from "../../context/StageContext";

export type SidebarTarget = AppStage | "cases";

const WORKFLOW_SHORTCUTS: Array<{
  stage: SidebarTarget;
  title: string;
  icon: typeof FolderOpen;
}> = [
  { stage: "cases", title: "All Cases", icon: FolderOpen },
  { stage: "intake", title: "Case Intake", icon: ClipboardList },
  { stage: "creation", title: "Transcript Creation", icon: Mic },
  { stage: "workspace", title: "Transcript Workspace", icon: Edit3 },
  { stage: "exhibits", title: "Exhibits", icon: Paperclip },
  { stage: "ufm", title: "UFM Insertions", icon: FileStack },
  { stage: "certification", title: "Certification", icon: Award },
  { stage: "export", title: "Export", icon: Download },
];

export function WorkflowSidebar({
  activeTarget,
  hasActiveCase = true,
  onShowBrowser,
  onSetStage,
}: {
  activeTarget: SidebarTarget;
  hasActiveCase?: boolean;
  onShowBrowser?: () => void;
  onSetStage?: (stage: AppStage) => void;
}) {
  return (
    <aside className="flex h-full w-12 shrink-0 flex-col border-r border-slate-800 bg-slate-950">
      {WORKFLOW_SHORTCUTS.map(({ stage, title, icon: Icon }) => {
        const isActive = activeTarget === stage;
        const isCases = stage === "cases";
        const isDisabled = isCases ? !onShowBrowser : !hasActiveCase || !onSetStage;
        const handleClick = isCases
          ? onShowBrowser
          : () => onSetStage?.(stage as AppStage);
        const buttonTitle = isDisabled && !isCases
          ? "Open a case to access this stage"
          : title;

        return (
          <button
            key={stage}
            type="button"
            title={buttonTitle}
            onClick={handleClick}
            disabled={isDisabled}
            className={`flex h-12 w-12 items-center justify-center transition-colors ${
              isActive
                ? "bg-slate-800 text-blue-400"
                : isDisabled
                  ? "cursor-not-allowed text-slate-700 opacity-30"
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

export function WorkspaceSidebar() {
  const { stage, setStage } = useStage();
  const { showBrowser } = useCase();

  return (
    <WorkflowSidebar
      activeTarget={stage}
      hasActiveCase
      onShowBrowser={() => void showBrowser()}
      onSetStage={setStage}
    />
  );
}
