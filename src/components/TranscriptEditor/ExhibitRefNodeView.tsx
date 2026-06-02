import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useExhibitViewer } from "../../context/ExhibitViewerContext";
import { Paperclip } from "lucide-react";

export function ExhibitRefNodeView({ node }: NodeViewProps) {
  const { exhibit_id, label } = node.attrs as { exhibit_id: string; label: string };
  const { exhibits, openViewer } = useExhibitViewer();

  const exhibit = exhibits.find((e) => e.exhibit_id === exhibit_id);

  return (
    <NodeViewWrapper as="span" contentEditable={false}>
      <span
        className="exhibit-ref-chip"
        title={exhibit?.description ?? label}
        onClick={(e) => {
          e.stopPropagation();
          if (exhibit) openViewer(exhibit);
        }}
      >
        <Paperclip size={10} className="inline-block" style={{ verticalAlign: "middle", marginTop: "-1px", marginRight: "3px" }} />
        {label}
      </span>
    </NodeViewWrapper>
  );
}
