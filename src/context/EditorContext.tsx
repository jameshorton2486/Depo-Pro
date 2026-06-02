import React, { createContext, useContext, useState } from "react";
import type { Editor } from "@tiptap/core";

interface EditorContextValue {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
  showInterpreterLayer: boolean;
  setShowInterpreterLayer: (show: boolean) => void;
  languageMap: Map<string, string>;
  setLanguageMap: (map: Map<string, string>) => void;
}

const Ctx = createContext<EditorContextValue>({
  editor: null,
  setEditor: () => {},
  showInterpreterLayer: false,
  setShowInterpreterLayer: () => {},
  languageMap: new Map(),
  setLanguageMap: () => {},
});

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [showInterpreterLayer, setShowInterpreterLayer] = useState(false);
  const [languageMap, setLanguageMap] = useState<Map<string, string>>(new Map());

  return (
    <Ctx.Provider
      value={{
        editor,
        setEditor,
        showInterpreterLayer,
        setShowInterpreterLayer,
        languageMap,
        setLanguageMap,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useEditorContext(): EditorContextValue {
  return useContext(Ctx);
}
