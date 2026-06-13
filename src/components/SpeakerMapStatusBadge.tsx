interface SpeakerMapStatusBadgeProps {
  confirmed: boolean;
}

export function SpeakerMapStatusBadge({ confirmed }: SpeakerMapStatusBadgeProps) {
  if (confirmed) {
    return null;
  }

  return (
    <span
      data-testid="speaker-map-status-badge"
      className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700"
    >
      Speakers: Unconfirmed
    </span>
  );
}
