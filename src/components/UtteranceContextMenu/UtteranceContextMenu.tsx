import { useEffect, useMemo, useRef, useState } from "react";

import { workspaceApi } from "../../api/workspaceService";
import type { Speaker } from "../../api/types";
import { useDocument } from "../../context/DocumentContext";

interface ContextMenuProps {
  x: number;
  y: number;
  utteranceId: string;
  currentSpeakerId: string;
  onClose: () => void;
}

export function UtteranceContextMenu({
  x,
  y,
  utteranceId,
  currentSpeakerId,
  onClose,
}: ContextMenuProps) {
  const {
    state,
    updateSpeakers,
    setTranscriptVersion,
    setSpeakerMapConfirmed,
  } = useDocument();
  const menuRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const speakers = useMemo(
    () => (state.document?.speakers ?? []) as Speaker[],
    [state.document?.speakers],
  );
  const otherSpeakers = useMemo(
    () => speakers.filter((speaker) => speaker.speaker_id !== currentSpeakerId),
    [currentSpeakerId, speakers],
  );

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [onClose]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleReassign(newSpeakerId: string) {
    if (!state.document?.job_id) {
      return;
    }

    setSaving(true);
    try {
      const result = await workspaceApi.saveSpeakers(
        state.document.job_id,
        {
          speakers: speakers.map((speaker) => ({
            speaker_id: speaker.speaker_id,
            display_name: speaker.display_name,
            role: speaker.role,
          })),
          utterance_speaker_map: [{
            utterance_id: utteranceId,
            speaker_id: newSpeakerId,
          }],
        },
        {
          lastKnownUpdatedAt: state.jobUpdatedAt,
        },
      );

      updateSpeakers(speakers.map((speaker) => ({ ...speaker })));
      setTranscriptVersion(result.updatedAt);
      setSpeakerMapConfirmed(result.speakerMapConfirmed ?? false, result.pipelineState ?? null);
      onClose();
    } catch (error) {
      console.error("[UtteranceContextMenu] reassign failed", error);
    } finally {
      setSaving(false);
    }
  }

  const menuStyle: React.CSSProperties = {
    position: "fixed",
    left: Math.min(x, window.innerWidth - 220),
    top: Math.min(y, window.innerHeight - 300),
    zIndex: 9999,
  };

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className="w-52 rounded-lg border border-slate-200 bg-white py-1 text-xs shadow-lg"
    >
      <div className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Reassign utterance to
      </div>

      {otherSpeakers.length === 0 ? (
        <div className="px-3 py-2 italic text-slate-400">
          No other speakers available
        </div>
      ) : (
        otherSpeakers.map((speaker) => (
          <button
            key={speaker.speaker_id}
            type="button"
            onClick={() => void handleReassign(speaker.speaker_id)}
            disabled={saving}
            className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <span className="shrink-0 rounded bg-slate-100 px-1 font-mono text-[10px] text-slate-600">
              {speaker.display_name.slice(0, 12)}
            </span>
            <span className="truncate text-slate-700">
              {speaker.display_name}
            </span>
          </button>
        ))
      )}

      <div className="mt-1 border-t border-slate-100 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="w-full px-3 py-1.5 text-left text-slate-400 transition-colors hover:text-slate-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
