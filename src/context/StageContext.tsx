import { createContext, useContext, useState } from "react";

export type Stage = "intake" | "editor";

interface StageContextValue {
  stage: Stage;
  setStage: (s: Stage) => void;
}

const StageContext = createContext<StageContextValue | null>(null);

export function StageProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<Stage>("intake");
  return (
    <StageContext.Provider value={{ stage, setStage }}>
      {children}
    </StageContext.Provider>
  );
}

export function useStage(): StageContextValue {
  const ctx = useContext(StageContext);
  if (!ctx) throw new Error("useStage must be used inside StageProvider");
  return ctx;
}
