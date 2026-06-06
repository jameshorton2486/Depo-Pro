import { useContext } from "react";

import { IntakeContext } from "./intakeContextShared";
import type { IntakeContextValue } from "./intakeContextShared";

export function useIntake(): IntakeContextValue {
  const ctx = useContext(IntakeContext);
  if (!ctx) throw new Error("useIntake must be used inside IntakeProvider");
  return ctx;
}
