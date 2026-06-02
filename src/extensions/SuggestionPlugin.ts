import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { EditorState } from "prosemirror-state";
import type { Node as ProseMirrorNode } from "prosemirror-model";

export const suggestionPluginKey = new PluginKey<SuggestionPluginState>("suggestion");

interface SuggestionPluginState {
  decorations: DecorationSet;
  pendingWordIds: Set<string>;
}

function buildDecorations(doc: ProseMirrorNode, pendingWordIds: Set<string>): DecorationSet {
  if (pendingWordIds.size === 0) return DecorationSet.empty;

  const decos: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    node.marks.forEach((mark) => {
      if (mark.type.name !== "wordMark") return;
      const wordId = mark.attrs.word_id as string;
      if (!pendingWordIds.has(wordId)) return;
      decos.push(
        Decoration.inline(pos, pos + node.nodeSize, {
          class: "word-suggestion",
          "data-suggestion-word": wordId,
          title: "AI suggestion available",
        })
      );
    });
  });
  return DecorationSet.create(doc, decos);
}

export function createSuggestionPlugin(
  initialPendingIds: Set<string> = new Set()
): Plugin<SuggestionPluginState> {
  return new Plugin<SuggestionPluginState>({
    key: suggestionPluginKey,

    state: {
      init(_config, editorState: EditorState): SuggestionPluginState {
        return {
          decorations: buildDecorations(editorState.doc, initialPendingIds),
          pendingWordIds: initialPendingIds,
        };
      },

      apply(tr, prev): SuggestionPluginState {
        const meta = tr.getMeta(suggestionPluginKey) as
          | { type: "SET_PENDING"; word_ids: string[] }
          | { type: "REMOVE_PENDING"; word_ids: string[] }
          | undefined;

        if (meta) {
          const next = new Set(prev.pendingWordIds);
          if (meta.type === "SET_PENDING") {
            meta.word_ids.forEach((id) => next.add(id));
          } else {
            meta.word_ids.forEach((id) => next.delete(id));
          }
          return {
            decorations: buildDecorations(tr.doc, next),
            pendingWordIds: next,
          };
        }

        if (tr.docChanged) {
          return {
            decorations: buildDecorations(tr.doc, prev.pendingWordIds),
            pendingWordIds: prev.pendingWordIds,
          };
        }

        return prev;
      },
    },

    props: {
      decorations(state) {
        return this.getState(state)?.decorations ?? DecorationSet.empty;
      },
    },
  });
}

export function getSuggestionPluginState(
  state: EditorState
): SuggestionPluginState | undefined {
  return suggestionPluginKey.getState(state);
}
