import { Node, mergeAttributes } from "@tiptap/core";

// Atomic inline node representing an exhibit reference chip in the transcript.
// Atom: true — the whole chip is selected/deleted as one unit, never partially edited.
// When the reporter types "see Exhibit 1", they insert this node via the Exhibits panel.
export const ExhibitRefNode = Node.create({
  name: "exhibitRef",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      exhibit_id: { default: null },
      label:      { default: "Exhibit" },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-exhibit-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(
        { "data-exhibit-id": HTMLAttributes.exhibit_id },
        { class: "exhibit-ref-chip" }
      ),
      `[${HTMLAttributes.label as string}]`,
    ];
  },
});
