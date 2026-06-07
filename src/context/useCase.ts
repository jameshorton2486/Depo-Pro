import { useContext } from "react";

import { CaseContext } from "./caseContextShared";
import type { CaseContextValue } from "./caseContextShared";

export function useCase(): CaseContextValue {
  const context = useContext(CaseContext);
  if (!context) {
    throw new Error("useCase must be used inside CaseProvider");
  }
  return context;
}
