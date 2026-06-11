import { Node } from "@tiptap/core";

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
        class: "page-break-view",
        contenteditable: "false",
      },
      ["div", { class: "page-break-rule" }],
      ["span", { class: "page-break-label" }, `PAGE ${String(HTMLAttributes.pageNumber)}`],
      ["div", { class: "page-break-rule" }],
    ];
  },
});
