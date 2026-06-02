import React, { createContext, useContext } from "react";
import type { Exhibit } from "../api/types";

interface ExhibitViewerContextValue {
  exhibits: Exhibit[];
  openViewer: (exhibit: Exhibit) => void;
}

const Ctx = createContext<ExhibitViewerContextValue>({
  exhibits: [],
  openViewer: () => {},
});

export function ExhibitViewerProvider({
  children,
  exhibits,
  openViewer,
}: {
  children: React.ReactNode;
  exhibits: Exhibit[];
  openViewer: (exhibit: Exhibit) => void;
}) {
  return (
    <Ctx.Provider value={{ exhibits, openViewer }}>{children}</Ctx.Provider>
  );
}

export function useExhibitViewer(): ExhibitViewerContextValue {
  return useContext(Ctx);
}
