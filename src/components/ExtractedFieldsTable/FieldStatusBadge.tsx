import type { FieldStatus } from "./fieldProjection";

interface Props {
  status: FieldStatus;
}

const config: Record<FieldStatus, { label: string; classes: string }> = {
  Confirmed:          { label: "Confirmed",          classes: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  "Needs Confirmation":{ label: "Needs Confirmation", classes: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  Missing:            { label: "Missing",            classes: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  Conflict:           { label: "Conflict",           classes: "bg-rose-50 text-rose-800 ring-1 ring-rose-300 font-semibold" },
};

export function FieldStatusBadge({ status }: Props) {
  const { label, classes } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${classes}`}>
      {status === "Conflict" && (
        <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 5zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      )}
      {label}
    </span>
  );
}
