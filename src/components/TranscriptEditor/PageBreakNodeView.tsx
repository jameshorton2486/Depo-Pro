import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";

// Visual page break separator rendered between transcript pages.
// Intentionally non-interactive — it is not editable content.
export function PageBreakNodeView({ node }: NodeViewProps) {
  const pageNumber = node.attrs.pageNumber as number;

  return (
    <NodeViewWrapper
      as="div"
      className="page-break-view"
      contentEditable={false}
    >
      <div className="page-break-rule" />
      <span className="page-break-label">PAGE {pageNumber}</span>
      <div className="page-break-rule" />
    </NodeViewWrapper>
  );
}
