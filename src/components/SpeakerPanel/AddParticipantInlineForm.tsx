import { UserPlus } from "lucide-react";

import type { Speaker } from "../../types";
import { SPEAKER_ROLES } from "./SpeakerPanel.helpers";

type AddParticipantInlineFormProps = {
  addingParticipant: boolean;
  newParticipantName: string;
  newParticipantRole: Speaker["role"] | undefined;
  addingError: string | null;
  addingSaving: boolean;
  onStart: () => void;
  onNameChange: (value: string) => void;
  onRoleChange: (value: Speaker["role"] | undefined) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export function AddParticipantInlineForm({
  addingParticipant,
  newParticipantName,
  newParticipantRole,
  addingError,
  addingSaving,
  onStart,
  onNameChange,
  onRoleChange,
  onSubmit,
  onCancel,
}: AddParticipantInlineFormProps) {
  return (
    <>
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Participants
        </p>
        <button
          onClick={onStart}
          className="flex items-center gap-1 text-[10px] text-blue-500 hover:text-blue-700 transition-colors"
          title="Add participant"
          data-testid="speaker-panel-add-trigger"
        >
          <UserPlus size={11} />
          Add
        </button>
      </div>

      {addingParticipant && (
        <div
          className="mx-3 mb-2 rounded border border-blue-200 bg-blue-50 p-2 space-y-2"
          data-testid="speaker-panel-add-form"
        >
          <input
            type="text"
            value={newParticipantName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Display name"
            className="w-full text-xs px-2 py-1 rounded border border-slate-200 bg-white focus:outline-none focus:border-blue-400"
            autoFocus
            data-testid="speaker-panel-add-name"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
              if (e.key === "Escape") onCancel();
            }}
          />
          <select
            value={newParticipantRole ?? "OTHER"}
            onChange={(e) => onRoleChange(e.target.value as Speaker["role"])}
            className="w-full text-xs px-2 py-1 rounded border border-slate-200 bg-white focus:outline-none focus:border-blue-400"
            data-testid="speaker-panel-add-role"
          >
            {SPEAKER_ROLES.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          {addingError && (
            <p className="text-[10px] text-red-600" data-testid="speaker-panel-add-error">{addingError}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onSubmit}
              disabled={addingSaving || !newParticipantName.trim()}
              className="flex-1 text-xs bg-blue-600 text-white rounded px-2 py-1 hover:bg-blue-500 disabled:opacity-50 transition-colors"
              data-testid="speaker-panel-add-submit"
            >
              {addingSaving ? "Adding..." : "Add"}
            </button>
            <button
              onClick={onCancel}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
              data-testid="speaker-panel-add-cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
