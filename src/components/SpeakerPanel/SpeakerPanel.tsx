import type React from "react";
import { useState, useCallback, useRef, useEffect } from "react";
import type { Speaker } from "../../types";
import { useDocument } from "../../context/DocumentContext";
import { useEditorContext } from "../../context/EditorContext";
import { workspaceApi } from "../../api/workspaceService";
import { getActiveUtteranceInfoFromDoc } from "../../lib/format/editorFragments";
import { Check, X, Edit2, Users, UserPlus } from "lucide-react";

const ROLES: Speaker["role"][] = [
  "REPORTER",
  "WITNESS",
  "ATTORNEY",
  "INTERPRETER",
  "OTHER",
];

const ROLE_COLORS: Record<NonNullable<Speaker["role"]>, string> = {
  REPORTER:    "bg-slate-100 text-slate-600",
  WITNESS:     "bg-blue-100 text-blue-700",
  ATTORNEY:    "bg-emerald-100 text-emerald-700",
  INTERPRETER: "bg-amber-100 text-amber-700",
  OTHER:       "bg-gray-100 text-gray-600",
};

function getSpeakerSourceFileLabel(speakerId: string): string | null {
  const match = speakerId.match(/^spk_f(\d{3})_s\d{3}$/);
  if (!match) {
    return null;
  }

  return `File ${Number.parseInt(match[1], 10) + 1}`;
}

type SpeakerView = Speaker & {
  ai_suggested?: boolean;
  ai_suggestion_reason?: string;
};

export function isAISuggestedSpeaker(speaker: SpeakerView): boolean {
  return speaker.ai_suggested === true;
}

export function shouldRelabelInEditor(
  previousRole: Speaker["role"] | undefined,
  nextRole: Speaker["role"] | undefined,
): boolean {
  return previousRole === nextRole;
}

export function getSpeakerClusterBadgeLabel(speaker: Speaker): string {
  return speaker.deepgram_speaker != null ? `SPK ${speaker.deepgram_speaker}` : "CUSTOM";
}

export async function addParticipantToSpeakerList(params: {
  jobId: string;
  displayName: string;
  role?: Speaker["role"];
  speakers: Speaker[];
  addSpeaker: typeof workspaceApi.addSpeaker;
}): Promise<Speaker[]> {
  const name = params.displayName.trim();
  if (!name) {
    throw new Error("Name is required.");
  }

  const newSpeaker = await params.addSpeaker(params.jobId, {
    display_name: name,
    role: params.role,
  });

  return [...params.speakers, newSpeaker];
}

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
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
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

function getActiveUtteranceInfo(editor: ReturnType<typeof useEditorContext>["editor"], activeId: string | null) {
  if (!editor || !activeId) {
    return {
      activeSpeakerId: null as string | null,
      matchingNodeCount: 0,
      hasMultipleSegments: false,
    };
  }
  return getActiveUtteranceInfoFromDoc(editor.state.doc, activeId);
}

export function SpeakerPanel() {
  const {
    state,
    updateSpeakers,
    setTranscriptVersion,
    setSpeakerMapConfirmed,
  } = useDocument();
  const { editor } = useEditorContext();

  const [editing, setEditing] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { display_name: string; role?: Speaker["role"] }>
  >({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [newParticipantRole, setNewParticipantRole] = useState<Speaker["role"]>("OTHER");
  const [addingError, setAddingError] = useState<string | null>(null);
  const [addingSaving, setAddingSaving] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- speakers derived inline; useMemo deferred post-beta
  const speakers = (state.document?.speakers ?? []) as SpeakerView[];
  const speakerMapConfirmed = state.speakerMapConfirmed;
  const pipelineState = state.pipelineState;
  const awaitingVerification = pipelineState === "AWAITING_SPEAKER_VERIFICATION" && !speakerMapConfirmed;

  const startEdit = useCallback((spk: Speaker) => {
    setEditing(spk.speaker_id);
    setSaveError(null);
    setDrafts((d) => ({
      ...d,
      [spk.speaker_id]: { display_name: spk.display_name, role: spk.role },
    }));
  }, []);

  const cancelEdit = useCallback((id: string) => {
    setEditing(null);
    setDrafts((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });
  }, []);

  // Apply updated speaker attrs to every matching utterance node in the TipTap doc.
  // This is the "instant relabeling" — no page reload, no full content rebuild.
  const relabelInEditor = useCallback(
    (speakerId: string, display_name: string, role: Speaker["role"] | undefined) => {
      if (!editor) return;
      const { tr, doc } = editor.state;
      let changed = false;

      doc.descendants((node, pos) => {
        if (node.type.name !== "utterance") return;
        if (node.attrs.speaker_id !== speakerId) return;
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          speaker_label: display_name,
          role: role ?? null,
        });
        changed = true;
      });

      if (changed) editor.view.dispatch(tr);
    },
    [editor]
  );

  const commitEdit = useCallback(
    async (id: string) => {
      const draft = drafts[id];
      if (!draft) return;
      const updated = speakers.map((s) =>
        s.speaker_id === id ? { ...s, ...draft, ai_suggested: false } : s
      );
      setSaving(true);
      setSaveError(null);
      try {
        const jobId = state.document?.job_id ?? "";
        const result = await workspaceApi.saveSpeakers(jobId, {
          speakers: updated.map((s) => ({
            speaker_id: s.speaker_id,
            display_name: s.display_name,
            role: s.role,
          })),
        }, {
          lastKnownUpdatedAt: state.jobUpdatedAt,
        });
        // Optimistic: update context + relabel editor nodes simultaneously
        updateSpeakers(updated);
        setTranscriptVersion(result.updatedAt);
        setSpeakerMapConfirmed(result.speakerMapConfirmed ?? false, result.pipelineState ?? null);
        const previousRole = speakers.find((speaker) => speaker.speaker_id === id)?.role;
        if (shouldRelabelInEditor(previousRole, draft.role)) {
          relabelInEditor(id, draft.display_name, draft.role);
        }
        setEditing(null);
        setDrafts((d) => {
          const next = { ...d };
          delete next[id];
          return next;
        });
      } catch (error) {
        console.error("[DEPO-PRO] saveSpeakers failed", error);
        setSaveError(error instanceof Error ? error.message : "Save failed — please retry.");
      } finally {
        setSaving(false);
      }
    },
    [
      drafts,
      relabelInEditor,
      setSpeakerMapConfirmed,
      setTranscriptVersion,
      speakers,
      state.document,
      state.jobUpdatedAt,
      updateSpeakers,
    ]
  );

  const handleAddParticipant = useCallback(async () => {
    const jobId = state.document?.job_id ?? "";
    setAddingSaving(true);
    setAddingError(null);

    try {
      const nextSpeakers = await addParticipantToSpeakerList({
        jobId,
        displayName: newParticipantName,
        role: newParticipantRole,
        speakers,
        addSpeaker: workspaceApi.addSpeaker,
      });
      updateSpeakers(nextSpeakers);
      setNewParticipantName("");
      setNewParticipantRole("OTHER");
      setAddingParticipant(false);
    } catch (err) {
      setAddingError(err instanceof Error ? err.message : "Failed to add participant.");
    } finally {
      setAddingSaving(false);
    }
  }, [newParticipantName, newParticipantRole, speakers, state.document, updateSpeakers]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
        <Users size={13} className="text-blue-600" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Speaker Mapping
        </h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            speakerMapConfirmed
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {speakerMapConfirmed ? "Map Confirmed" : "Map Pending"}
        </span>
        <span className="ml-auto text-[10px] font-mono text-slate-400">
          {speakers.length} speaker{speakers.length !== 1 ? "s" : ""}
        </span>
      </div>
      {awaitingVerification && (
        <div className="mx-3 mt-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          Please verify the speaker map before processing continues.
        </div>
      )}

      <AddParticipantInlineForm
        addingParticipant={addingParticipant}
        newParticipantName={newParticipantName}
        newParticipantRole={newParticipantRole}
        addingError={addingError}
        addingSaving={addingSaving}
        onStart={() => {
          setAddingParticipant(true);
          setAddingError(null);
        }}
        onNameChange={setNewParticipantName}
        onRoleChange={setNewParticipantRole}
        onSubmit={() => void handleAddParticipant()}
        onCancel={() => {
          setAddingParticipant(false);
          setAddingError(null);
          setNewParticipantName("");
          setNewParticipantRole("OTHER");
        }}
      />

      <div className="px-4 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Rename / Re-role
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {speakers.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-8">
            No speakers loaded.
          </p>
        )}

        {speakers.map((spk) => {
          const isEditing = editing === spk.speaker_id;
          const draft = drafts[spk.speaker_id];
          const role = draft?.role ?? spk.role;
          const roleColor = role ? ROLE_COLORS[role] : "bg-slate-100 text-slate-500";

          return (
            <SpeakerCard
              key={spk.speaker_id}
              spk={spk}
              isEditing={isEditing}
              draft={draft}
              saving={saving}
              showAiSuggested={isAISuggestedSpeaker(spk)}
              roleColor={roleColor}
              onStartEdit={startEdit}
              onCancelEdit={cancelEdit}
              onCommitEdit={commitEdit}
              onDraftChange={(id, patch) =>
                setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }))
              }
            />
          );
        })}

        {saveError && (
          <p className="text-xs text-red-600 text-center px-2 py-1 bg-red-50 rounded border border-red-200">
            {saveError}
          </p>
        )}
      </div>

      {/* Utterance reassignment section */}
      <UtteranceReassignment
        speakers={speakers}
        jobUpdatedAt={state.jobUpdatedAt}
        setTranscriptVersion={setTranscriptVersion}
        setSpeakerMapConfirmed={setSpeakerMapConfirmed}
      />
    </div>
  );
}

// ─── Speaker card ─────────────────────────────────────────────────────────────

interface CardProps {
  spk: SpeakerView;
  isEditing: boolean;
  draft?: { display_name: string; role?: Speaker["role"] };
  saving: boolean;
  showAiSuggested: boolean;
  roleColor: string;
  onStartEdit: (spk: Speaker) => void;
  onCancelEdit: (id: string) => void;
  onCommitEdit: (id: string) => void;
  onDraftChange: (id: string, patch: { display_name?: string; role?: Speaker["role"] }) => void;
}

function SpeakerCard({
  spk,
  isEditing,
  draft,
  saving,
  showAiSuggested,
  roleColor,
  onStartEdit,
  onCancelEdit,
  onCommitEdit,
  onDraftChange,
}: CardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onCommitEdit(spk.speaker_id);
    if (e.key === "Escape") onCancelEdit(spk.speaker_id);
  };
  const sourceFileLabel = getSpeakerSourceFileLabel(spk.speaker_id);

  return (
    <div
      className={`rounded-lg border p-3 bg-white transition-shadow ${
        isEditing
          ? "border-blue-300 shadow-sm"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      {/* Deepgram index badge */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
          {getSpeakerClusterBadgeLabel(spk)}
        </span>
        {sourceFileLabel && (
          <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
            {sourceFileLabel}
          </span>
        )}
        {showAiSuggested && (
          <span
            className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-100 text-sky-700"
            title={spk.ai_suggestion_reason || "AI suggested speaker mapping"}
          >
            ✦ AI
          </span>
        )}
        {!isEditing && spk.role && (
          <span className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${roleColor}`}>
            {spk.role}
          </span>
        )}
        {!isEditing && (
          <button
            onClick={() => onStartEdit(spk)}
            className="ml-auto p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="Edit speaker"
          >
            <Edit2 size={12} />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="text"
            value={draft?.display_name ?? spk.display_name}
            onChange={(e) =>
              onDraftChange(spk.speaker_id, { display_name: e.target.value })
            }
            onKeyDown={handleKeyDown}
            className="w-full text-sm border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 font-semibold text-slate-800"
            placeholder="Display name"
          />
          <select
            value={draft?.role ?? ""}
            onChange={(e) =>
              onDraftChange(spk.speaker_id, {
                role: (e.target.value || undefined) as Speaker["role"],
              })
            }
            className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-700"
          >
            <option value="">— No role —</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <div className="flex gap-1.5 pt-0.5">
            <button
              onClick={() => onCommitEdit(spk.speaker_id)}
              disabled={saving || !draft?.display_name?.trim()}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-blue-700 text-white rounded hover:bg-blue-800 disabled:opacity-40 transition-colors font-medium"
            >
              <Check size={11} />
              Save
            </button>
            <button
              onClick={() => onCancelEdit(spk.speaker_id)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded hover:bg-slate-50 transition-colors text-slate-600"
            >
              <X size={11} />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {spk.display_name}
          </p>
          {sourceFileLabel && (
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              {sourceFileLabel} diarization source
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Utterance reassignment ───────────────────────────────────────────────────
// Shows the active utterance (from DocumentContext) and lets the user
// reassign its speaker. Applies instantly to the editor node attrs.

function UtteranceReassignment({
  speakers,
  jobUpdatedAt,
  setTranscriptVersion,
  setSpeakerMapConfirmed,
}: {
  speakers: Speaker[];
  jobUpdatedAt: string | null;
  setTranscriptVersion: (updatedAt: string | null) => void;
  setSpeakerMapConfirmed: (confirmed: boolean, pipelineState?: string | null) => void;
}) {
  const { state } = useDocument();
  const { editor } = useEditorContext();
  const [assigning, setAssigning] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeId = state.activeUtteranceId;
  const { activeSpeakerId, hasMultipleSegments } = getActiveUtteranceInfo(editor, activeId);

  const activeSpeaker = speakers.find((s) => s.speaker_id === activeSpeakerId);

  const reassign = useCallback(
    async (newSpeakerId: string) => {
      if (!editor || !activeId || hasMultipleSegments) return;
      const newSpk = speakers.find((s) => s.speaker_id === newSpeakerId);
      if (!newSpk) return;

      // Update the editor node attrs for this utterance
      const { tr, doc } = editor.state;
      let changed = false;
      doc.descendants((node, pos) => {
        if (node.type.name !== "utterance") return;
        if (node.attrs.utterance_id !== activeId) return;
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          speaker_id: newSpeakerId,
          speaker_label: newSpk.display_name,
          role: newSpk.role ?? null,
        });
        changed = true;
      });
      if (changed) editor.view.dispatch(tr);

      setAssigning(false);

      // Persist speaker change via saveSpeakers is not the right call here;
      // reassignment is a working-doc change. We save via the normal saveWorking
      // path — the context's auto-save will pick it up. However we also want
      // the reassignment to survive a hard reload. For now, persist the full
      // speaker mapping so the server knows about it.
      setSaving(true);
      try {
        const jobId = state.document?.job_id ?? "";
        const result = await workspaceApi.saveSpeakers(jobId, {
          speakers: speakers.map((s) => ({
            speaker_id: s.speaker_id,
            display_name: s.display_name,
            role: s.role,
          })),
          utterance_speaker_map: [
            {
              utterance_id: activeId,
              speaker_id: newSpeakerId,
            },
          ],
        }, {
          lastKnownUpdatedAt: jobUpdatedAt,
        });
        setTranscriptVersion(result.updatedAt);
        setSpeakerMapConfirmed(result.speakerMapConfirmed ?? false, result.pipelineState ?? null);
      } catch (error) {
        console.error("[DEPO-PRO] saveSpeakers failed", error);
      } finally {
        setSaving(false);
      }
    },
    [
      activeId,
      editor,
      hasMultipleSegments,
      setSpeakerMapConfirmed,
      setTranscriptVersion,
      speakers,
      state.document,
      jobUpdatedAt,
    ]
  );

  if (!activeId) {
    return (
      <div className="border-t border-slate-200 px-4 py-3 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Utterance Reassignment
        </p>
        <p className="text-[10px] text-slate-400">
          Click any paragraph in the transcript to select it, then reassign it to a different
          speaker above.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
        Active utterance
      </p>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[100px]">
          {activeId}
        </span>
        <span className="ml-auto text-xs font-semibold text-slate-700 truncate max-w-[80px]">
          {hasMultipleSegments ? "Multiple speakers" : (activeSpeaker?.display_name ?? activeSpeakerId)}
        </span>
      </div>

      {hasMultipleSegments ? (
        <div className="mt-2 rounded border border-amber-200 bg-amber-50 px-2 py-2 text-[10px] text-amber-700 space-y-1">
          <p className="font-semibold">Reassignment unavailable</p>
          <p>
            This utterance contains speech from multiple speakers that were merged during
            diarization. Re-transcription with updated diarization settings may separate them.
          </p>
        </div>
      ) : assigning ? (
        <div className="mt-2 space-y-1">
          <p className="text-[10px] text-slate-500 mb-1">Reassign to:</p>
          {speakers.map((spk) => (
            <button
              key={spk.speaker_id}
              onClick={() => reassign(spk.speaker_id)}
              disabled={saving}
              className={`w-full text-left text-xs px-2 py-1.5 rounded border transition-colors ${
                spk.speaker_id === activeSpeakerId
                  ? "border-blue-300 bg-blue-50 text-blue-700 font-semibold"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
              }`}
            >
              {spk.display_name}
              {getSpeakerSourceFileLabel(spk.speaker_id) && (
                <span className="ml-1 text-[9px] text-blue-500 uppercase">
                  {getSpeakerSourceFileLabel(spk.speaker_id)}
                </span>
              )}
              {spk.role && (
                <span className="ml-1 text-[9px] text-slate-400 uppercase">
                  ({spk.role})
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => setAssigning(false)}
            className="w-full text-xs text-slate-400 hover:text-slate-600 pt-1"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAssigning(true)}
          disabled={hasMultipleSegments}
          className="mt-2 w-full text-xs px-2 py-1.5 border border-slate-200 rounded hover:border-slate-300 hover:bg-slate-50 text-slate-600 transition-colors"
        >
          Reassign speaker…
        </button>
      )}
    </div>
  );
}
