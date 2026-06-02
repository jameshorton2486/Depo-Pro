import type { FieldStatus } from "./fieldProjection";

interface Props {
  status: FieldStatus;
}

const config: Record<FieldStatus, { label: string; classes: string }> = {
  Confirmed:            { label: "Confirmed",          classes: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  "Needs Confirmation": { label: "Needs Confirmation", classes: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  Missing:              { label: "Missing",            classes: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  Conflict:             { label: "Conflict",           classes: "bg-rose-50 text-rose-700 ring-1 ring-rose-200" },
};

export function FieldStatusBadge({ status }: Props) {
  const { label, classes } = config[status];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}
