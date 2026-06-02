import { Node } from "@tiptap/core";

// Non-editable atom node that marks a page boundary in the transcript.
// Inserted by buildEditorContent between utterances that straddle a page break.
// The React NodeView (PageBreakNodeView.tsx) renders it as a visual divider.
export const PageBreakNode = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,       // no inner content; not editable
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      pageNumber: { default: 2 },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-page-break]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      {
        "data-page-break": String(HTMLAttributes.pageNumber),
        class: "page-break-node",
      },
    ];
  },
});
