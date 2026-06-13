import { ON_RECORD, type RenderState as RecordRenderState } from "./models";

export interface StageSRenderState {
  recordState: RecordRenderState;
  currentExaminerLabel: string;
  examinerSeen: boolean;
  examinationOpened: boolean;
}

export function createInitialRenderState(): StageSRenderState {
  return {
    recordState: ON_RECORD,
    currentExaminerLabel: "",
    examinerSeen: false,
    examinationOpened: false,
  };
}

export function setExaminer(
  state: StageSRenderState,
  label: string,
): StageSRenderState {
  if (!label.trim()) {
    return state;
  }

  return {
    ...state,
    currentExaminerLabel: label.trim(),
    examinerSeen: true,
  };
}
