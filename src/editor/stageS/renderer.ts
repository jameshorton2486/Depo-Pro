import type { CanonicalUtteranceRow } from "../../lib/transcript/normalize";
import {
  buildIndexMap,
  type StageSParticipantInput,
} from "../speakerMapping";
import {
  LINE_COLLOQUY,
  LINE_PARENTHETICAL,
  type RenderLine,
} from "./models";
import { looksLikeObjection, appendInterruptionDash, prependResumptionDash } from "./objectionHandler";
import {
  byAttributionLine,
  colloquyLine,
  examinationHeaderLine,
  flaggedLine,
  parentheticalLine,
  qaLine,
} from "./lineBuilder";
import { applyTransition, detectTransition, extractTime, type RecordTransition } from "./offRecord";
import { createInitialRenderState, setExaminer } from "./renderState";
import { needsByLineAfter, transitionParenthetical } from "./transitions";

export type StageSUtteranceInput = Pick<
  CanonicalUtteranceRow,
  "utterance_id" | "utterance_index" | "speaker_index" | "speaker_label" | "start_time" | "text"
>;

export interface StageSAuditEntry {
  kind: string;
  detail: string;
  utteranceIds: string[];
}

export interface StageSAuditLog {
  entries: StageSAuditEntry[];
  counts: Record<string, number>;
}

export interface StageSResult {
  lines: RenderLine[];
  audit: StageSAuditLog;
  offRecordSpanCount: number;
  objectionCount: number;
}

export function renderStageS(
  utterances: StageSUtteranceInput[],
  participants: StageSParticipantInput[],
): StageSResult {
  const orderedUtterances = [...utterances].sort((left, right) => {
    const byIndex = left.utterance_index - right.utterance_index;
    if (byIndex !== 0) {
      return byIndex;
    }

    const byStart = left.start_time - right.start_time;
    if (byStart !== 0) {
      return byStart;
    }

    return left.utterance_id.localeCompare(right.utterance_id);
  });

  const indexMap = buildIndexMap(participants);
  const lines: RenderLine[] = [];
  const auditEntries: StageSAuditEntry[] = [];
  const auditCounts = new Map<string, number>();

  let state = createInitialRenderState();
  let lineSequence = 1;
  let lastContentIdx: number | null = null;
  let pendingResumptionDash = false;
  let offRecordSpanCount = 0;
  let objectionCount = 0;

  const nextLineId = (): string => `s-${String(lineSequence++).padStart(4, "0")}`;
  const recordAudit = (kind: string, detail: string, utteranceIds: string[]): void => {
    auditEntries.push({ kind, detail, utteranceIds: [...utteranceIds] });
    auditCounts.set(kind, (auditCounts.get(kind) ?? 0) + 1);
  };

  for (const utterance of orderedUtterances) {
    const utteranceIds = [utterance.utterance_id];
    const text = utterance.text.trim();
    const rawLabel = utterance.speaker_label || `Speaker ${utterance.speaker_index}`;
    const info = indexMap.get(utterance.speaker_index);
    const transition = detectTransition(info?.role, text);

    if (transition) {
      state = {
        ...state,
        recordState: applyTransition(transition),
      };

      const parentheticalText = transitionParenthetical(transition, extractTime(text));
      lines.push(
        parentheticalLine(
          nextLineId(),
          parentheticalText,
          state.recordState,
          transitionAuditNote(transition),
        ),
      );
      recordAudit("record_transition", `${transition} -> ${parentheticalText}`, utteranceIds);

      if (transition === "OFF") {
        offRecordSpanCount += 1;
      }

      if (needsByLineAfter(transition) && state.currentExaminerLabel) {
        lines.push(byAttributionLine(nextLineId(), state.currentExaminerLabel, state.recordState));
        recordAudit("by_line_reemitted", state.currentExaminerLabel, []);
      }

      lastContentIdx = null;
      pendingResumptionDash = false;
      continue;
    }

    if (state.recordState === "OFF_RECORD") {
      const offRecordLabel = info?.label || rawLabel || "OFF THE RECORD";
      lines.push(
        colloquyLine(
          nextLineId(),
          offRecordLabel,
          text,
          utteranceIds,
          state.recordState,
          "Off-record content preserved as colloquy.",
        ),
      );
      recordAudit("off_record_content", offRecordLabel, utteranceIds);
      lastContentIdx = lines.length - 1;
      continue;
    }

    if (!info) {
      lines.push(flaggedLine(nextLineId(), rawLabel, text, utteranceIds, state.recordState));
      recordAudit("flagged_unmapped", rawLabel, utteranceIds);
      lastContentIdx = lines.length - 1;
      continue;
    }

    const mode = info.qaMode;

    if (mode === "" && looksLikeObjection(text)) {
      if (lastContentIdx !== null) {
        const previous = lines[lastContentIdx];
        const [dashedText, inserted] = appendInterruptionDash(previous.text);
        if (inserted) {
          lines[lastContentIdx] = {
            ...previous,
            text: dashedText,
            auditNote: joinAuditNotes(previous.auditNote, "Interruption dash appended."),
          };
          recordAudit("interruption_dash_appended", previous.lineId, previous.sourceUtteranceIds);
        }
      }

      const objectionLabel = info.label || rawLabel;
      lines.push(
        colloquyLine(
          nextLineId(),
          objectionLabel,
          text,
          utteranceIds,
          state.recordState,
          "Objection isolated to standalone colloquy.",
        ),
      );
      recordAudit("objection_isolated", objectionLabel, utteranceIds);
      objectionCount += 1;
      pendingResumptionDash = true;
      lastContentIdx = null;
      continue;
    }

    if (mode === "Q" || mode === "A") {
      const normalizedLabel = info.label.trim();

      if (mode === "Q") {
        state = setExaminer(state, normalizedLabel);
      }

      if (mode === "Q" && !state.examinationOpened) {
        lines.push(examinationHeaderLine(nextLineId(), state.recordState));
        recordAudit("examination_opened", "EXAMINATION", []);

        if (normalizedLabel) {
          lines.push(byAttributionLine(nextLineId(), normalizedLabel, state.recordState));
          recordAudit("by_line_emitted", normalizedLabel, []);
        }

        state = {
          ...state,
          examinationOpened: true,
        };
      }

      const lastLine = lines.length > 0 ? lines[lines.length - 1] : null;
      const attributionBroken = mode === "Q"
        && Boolean(state.currentExaminerLabel)
        && (lastLine?.lineType === LINE_COLLOQUY || lastLine?.lineType === LINE_PARENTHETICAL);

      let qaText = text;
      let byLabel = "";

      if (pendingResumptionDash && !attributionBroken) {
        const [dashedText, inserted] = prependResumptionDash(qaText);
        qaText = dashedText;
        if (inserted) {
          recordAudit("resumption_dash_prepended", mode, utteranceIds);
        }
        pendingResumptionDash = false;
      } else if (pendingResumptionDash && attributionBroken) {
        byLabel = state.currentExaminerLabel;
        recordAudit("inline_by_attribution", byLabel, utteranceIds);
        pendingResumptionDash = false;
      }

      lines.push(
        qaLine(nextLineId(), mode, qaText, utteranceIds, state.recordState, byLabel),
      );
      recordAudit("qa_line_emitted", mode, utteranceIds);
      lastContentIdx = lines.length - 1;
      continue;
    }

    const colloquySpeakerLabel = info.label || rawLabel;
    lines.push(
      colloquyLine(
        nextLineId(),
        colloquySpeakerLabel,
        text,
        utteranceIds,
        state.recordState,
      ),
    );
    recordAudit("colloquy_emitted", colloquySpeakerLabel, utteranceIds);
    lastContentIdx = lines.length - 1;
    pendingResumptionDash = false;
  }

  return {
    lines,
    audit: {
      entries: auditEntries,
      counts: Object.fromEntries(auditCounts),
    },
    offRecordSpanCount,
    objectionCount,
  };
}

function transitionAuditNote(transition: RecordTransition): string {
  return transition === "OFF"
    ? "Record state changed to OFF_RECORD."
    : "Record state changed to ON_RECORD.";
}

function joinAuditNotes(current: string, next: string): string {
  return current ? `${current} ${next}` : next;
}
