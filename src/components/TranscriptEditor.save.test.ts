import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";

import type { EditorDocument } from "../api/types";
import { buildEditorContent } from "../lib/buildEditorContent";
import { extractUtteranceTextsFromDoc } from "../lib/format/editorFragments";
import { createInitialDocumentState, documentReducer } from "../context/DocumentContext";
import { diffUtteranceTextSnapshots } from "./TranscriptEditor/TranscriptEditor";

function makeDocument(): EditorDocument {
  return {
    job_id: "job-1",
    media_url: "",
    duration: 0,
    speakers: [
      {
        speaker_id: "spk-1",
        display_name: "Mr. Nunez",
        deepgram_speaker: 0,
        role: "ATTORNEY",
      },
    ],
    utterances: [
      {
        utterance_id: "utt-1",
        speaker_id: "spk-1",
        start_time: 0,
        end_time: 4,
        word_ids: ["w1", "w2", "w3", "w4"],
      },
    ],
    words: [
      {
        word_id: "w1",
        text: "Mr.",
        raw_text: "Mr.",
        speaker_id: "spk-1",
        utterance_id: "utt-1",
        start_time: 0,
        end_time: 0.5,
        confidence: 1,
        reviewed: false,
        edited: false,
      },
      {
        word_id: "w2",
        text: "Nunez",
        raw_text: "Nunez",
        speaker_id: "spk-1",
        utterance_id: "utt-1",
        start_time: 0.5,
        end_time: 1,
        confidence: 1,
        reviewed: false,
        edited: false,
      },
      {
        word_id: "w3",
        text: "Hello.",
        raw_text: "Hello.",
        speaker_id: "spk-1",
        utterance_id: "utt-1",
        start_time: 1,
        end_time: 1.5,
        confidence: 1,
        reviewed: false,
        edited: false,
      },
      {
        word_id: "w4",
        text: "There",
        raw_text: "There",
        speaker_id: "spk-1",
        utterance_id: "utt-1",
        start_time: 1.5,
        end_time: 2,
        confidence: 1,
        reviewed: false,
        edited: false,
      },
    ],
  };
}

type DocNodeLike = {
  type: { name: string };
  attrs: Record<string, unknown>;
  textContent: string;
  text?: string;
  childCount?: number;
  child?: (index: number) => DocNodeLike;
};

function jsonToDocLike(content: JSONContent): {
  descendants: (cb: (node: DocNodeLike) => void) => void;
} {
  function toNode(node: JSONContent): DocNodeLike {
    const children = node.content?.map(toNode) ?? [];

    return {
      type: { name: node.type ?? "text" },
      attrs: node.attrs ?? {},
      textContent: node.text ?? children.map((child) => child.textContent).join(""),
      text: node.text,
      childCount: children.length,
      child(index: number) {
        return children[index];
      },
    };
  }

  const root = toNode(content);

  return {
    descendants(cb) {
      function visit(node: DocNodeLike) {
        cb(node);
        if (typeof node.childCount !== "number" || typeof node.child !== "function") {
          return;
        }
        for (let index = 0; index < node.childCount; index += 1) {
          visit(node.child(index));
        }
      }

      visit(root);
    },
  };
}

function appendWord(content: JSONContent, word: string) {
  const blocks = content.content ?? [];
  const utterance = blocks.find((node) => node.type === "utterance");
  if (!utterance) {
    throw new Error("Expected an utterance block.");
  }

  const inlineNodes = utterance.content ?? [];
  let anchor: JSONContent | undefined;
  for (let index = inlineNodes.length - 1; index >= 0; index -= 1) {
    const candidate = inlineNodes[index];
    if (candidate.type === "text" && Array.isArray(candidate.marks)) {
      anchor = candidate;
      break;
    }
  }
  if (!anchor?.marks?.[0]?.attrs) {
    throw new Error("Expected a marked word node.");
  }

  inlineNodes.push({ type: "text", text: " " });
  inlineNodes.push({
    type: "text",
    text: word,
    marks: [
      {
        type: "wordMark",
        attrs: anchor.marks[0].attrs,
      },
    ],
  });
}

describe("TranscriptEditor save regression helpers", () => {
  it("detects a real edit against CFE-built content and flips dirty in the reducer", () => {
    const doc = makeDocument();
    const initialContent = buildEditorContent(doc);
    const editedContent = structuredClone(initialContent);

    appendWord(editedContent, "Revised");

    const previousTexts = extractUtteranceTextsFromDoc(jsonToDocLike(initialContent));
    const nextTexts = extractUtteranceTextsFromDoc(jsonToDocLike(editedContent));
    const changes = diffUtteranceTextSnapshots(previousTexts, nextTexts);

    expect(changes).toEqual([
      {
        utteranceId: "utt-1",
        oldText: "Mr. Nunez Hello. There",
        newText: "Mr. Nunez Hello. There Revised",
      },
    ]);

    let state = createInitialDocumentState(doc.job_id);
    state = documentReducer(state, {
      type: "LOAD_OK",
      doc,
      updatedAt: "2026-06-22T12:00:00.000Z",
      speakerMapConfirmed: false,
      audioSegments: [],
    });
    state = documentReducer(state, {
      type: "EDIT_UTTERANCE",
      utterance_id: changes[0].utteranceId,
      word_id: null,
      old_text: changes[0].oldText,
      new_text: changes[0].newText,
      source: "editor",
    });

    expect(state.dirty).toBe(true);
    expect(state.workingTexts["utt-1"]).toBe("Mr. Nunez Hello. There Revised");
  });

  it("keeps formatter artifacts out of working_text payloads", () => {
    const texts = extractUtteranceTextsFromDoc(jsonToDocLike(buildEditorContent(makeDocument())));

    expect(texts.get("utt-1")).toBe("Mr. Nunez Hello. There");
    expect(texts.get("utt-1")).not.toContain("Hello.  There");
    expect(texts.get("utt-1")).not.toContain("Q.");
  });
});
