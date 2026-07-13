import { describe, expect, it } from "vitest";
import type { EditorDocument } from "../../api/types";
import type { CaseRecord } from "../../types/case";
import {
  buildParagraphSemanticAssignments,
  buildResumptionByLine,
  buildTranscriptParagraphs,
  buildWorkspaceTranscriptText,
  buildWorkspaceTranscriptTextClean,
  renderTranscriptParagraphText,
} from "./transcriptParagraphs";
import { stripInlineFlagSpans } from "./wordDisplay";

function makeRecord(): CaseRecord {
  return {
    caption: {
      case_name: { value: "Jordan Alvarez v. Acme Logistics, Inc." },
      case_style: { value: "Jordan Alvarez v. Acme Logistics, Inc." },
      case_number: { value: "2026-CV-1042" },
      court_name: { value: "250th Judicial District Court" },
      judicial_district: { value: "250th Judicial District" },
      county: { value: "Travis County" },
      state: { value: "Texas" },
    },
    session: {
      location_state: { value: "Texas" },
    },
    reporter: { name: { value: "Nellie Bardel" } },
    witnesses: [{ name: { value: "Mohammad Etminan, M.D." }, prefix_suffix: "Dr.", role: { value: "EXPERT" } }],
    attorneys: [
      { attorney_id: "a1", name: { value: "Dennis Bentley" }, role: { value: "EXAMINING" }, representing: { value: "Plaintiff" }, firm: { value: "Bentley Trial Group" }, address: null, city: "San Antonio", state: "Texas", zip: null, phone: null, email: null },
      { attorney_id: "a2", name: { value: "Christian Ramon" }, role: { value: "OPPOSING" }, representing: { value: "Defendant" }, firm: { value: "Ramon Defense LLP" }, address: null, city: "McAllen", state: "Texas", zip: null, phone: null, email: null },
    ],
    parties: [
      { party_id: "p1", name: { value: "Jordan Alvarez" }, role: { value: "plaintiff" } },
      { party_id: "p2", name: { value: "Acme Logistics, Inc." }, role: { value: "defendant" } },
    ],
  } as unknown as CaseRecord;
}

function makeDocument(): EditorDocument {
  return {
    job_id: "job-1",
    media_url: "https://example.test/audio.wav",
    duration: 30,
    speakers: [
      { speaker_id: "spk-0", display_name: "Speaker 0", deepgram_speaker: 0, role: "OTHER" },
      { speaker_id: "spk-1", display_name: "Speaker 1", deepgram_speaker: 1, role: "OTHER" },
      { speaker_id: "spk-2", display_name: "Speaker 2", deepgram_speaker: 2, role: "OTHER" },
      { speaker_id: "spk-3", display_name: "Speaker 3", deepgram_speaker: 3, role: "OTHER" },
    ],
    utterances: [
      { utterance_id: "utt-1", speaker_id: "spk-0", start_time: 0, end_time: 1, word_ids: ["w1", "w2", "w3", "w4"] },
      { utterance_id: "utt-2", speaker_id: "spk-1", start_time: 1, end_time: 2, word_ids: ["w5", "w6", "w7"] },
      { utterance_id: "utt-3", speaker_id: "spk-2", start_time: 2, end_time: 3, word_ids: ["w8", "w9", "w10", "w11", "w12"] },
      { utterance_id: "utt-4", speaker_id: "spk-3", start_time: 3, end_time: 4, word_ids: ["w13", "w14"] },
    ],
    words: [
      { word_id: "w1", text: "Good", raw_text: "Good", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0, end_time: 0.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w2", text: "afternoon.", raw_text: "afternoon.", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0.1, end_time: 0.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w3", text: "We", raw_text: "We", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0.2, end_time: 0.3, confidence: 1, reviewed: false, edited: false },
      { word_id: "w4", text: "are on the record.", raw_text: "are on the record.", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0.3, end_time: 0.4, confidence: 1, reviewed: false, edited: false },
      { word_id: "w5", text: "This", raw_text: "This", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.4, end_time: 0.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w6", text: "is cause number", raw_text: "is cause number", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.5, end_time: 0.6, confidence: 1, reviewed: false, edited: false },
      { word_id: "w7", text: "123.", raw_text: "123.", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.6, end_time: 0.7, confidence: 1, reviewed: false, edited: false },
      { word_id: "w8", text: "Good", raw_text: "Good", speaker_id: "spk-2", utterance_id: "utt-3", start_time: 0.7, end_time: 0.8, confidence: 1, reviewed: false, edited: false },
      { word_id: "w9", text: "afternoon.", raw_text: "afternoon.", speaker_id: "spk-2", utterance_id: "utt-3", start_time: 0.8, end_time: 0.9, confidence: 1, reviewed: false, edited: false },
      { word_id: "w10", text: "Dennis", raw_text: "Dennis", speaker_id: "spk-2", utterance_id: "utt-3", start_time: 0.9, end_time: 1.0, confidence: 1, reviewed: false, edited: false },
      { word_id: "w11", text: "Bentley", raw_text: "Bentley", speaker_id: "spk-2", utterance_id: "utt-3", start_time: 1.0, end_time: 1.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w12", text: "for the plaintiff.", raw_text: "for the plaintiff.", speaker_id: "spk-2", utterance_id: "utt-3", start_time: 1.1, end_time: 1.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w13", text: "I", raw_text: "I", speaker_id: "spk-3", utterance_id: "utt-4", start_time: 1.2, end_time: 1.3, confidence: 1, reviewed: false, edited: false },
      { word_id: "w14", text: "do.", raw_text: "do.", speaker_id: "spk-3", utterance_id: "utt-4", start_time: 1.3, end_time: 1.4, confidence: 1, reviewed: false, edited: false },
    ],
  };
}

describe("transcriptParagraphs", () => {
  it("renders proceedings and examination structure for transcript text", () => {
    const text = buildWorkspaceTranscriptText(makeDocument(), stripInlineFlagSpans, makeRecord());

    expect(text).toContain("PROCEEDINGS");
    expect(text).toContain("THE VIDEOGRAPHER:  Good afternoon.");
    expect(text).toContain("THE REPORTER:  This is cause number 123.");
    expect(text).toContain("EXAMINATION");
    expect(text).toContain("BY MR. BENTLEY:");
    expect(text).toContain("Q. Good afternoon.  Dennis Bentley for the plaintiff.");
    expect(text).toContain("A. I do.");
  });

  it("uses a standalone BY_LINE at examination start, not an inline resumption by-line", () => {
    const paragraphs = buildTranscriptParagraphs(makeDocument(), makeRecord());
    const byLineIndex = paragraphs.findIndex((paragraph) => paragraph.kind === "BY_LINE" && paragraph.text === "BY MR. BENTLEY:");
    const firstQuestionIndex = paragraphs.findIndex((paragraph) => paragraph.kind === "Q");

    expect(byLineIndex).toBeGreaterThan(-1);
    expect(firstQuestionIndex).toBeGreaterThan(byLineIndex);
    expect(paragraphs[firstQuestionIndex]?.text.startsWith("(BY ")).toBe(false);
  });

  it("adds an inline resumption by-line after colloquy interruptions", () => {
    const document = makeDocument();
    document.speakers[2] = { ...document.speakers[2], display_name: "MR. BENTLEY", role: "ATTORNEY" };
    document.speakers.push({ speaker_id: "spk-4", display_name: "MR. RAMON", deepgram_speaker: 4, role: "OTHER" });
    document.utterances = [
      { utterance_id: "utt-1", speaker_id: "spk-2", start_time: 0, end_time: 1, word_ids: ["w8", "w9", "w10", "w11", "w12"] },
      { utterance_id: "utt-2", speaker_id: "spk-3", start_time: 1, end_time: 2, word_ids: ["w13", "w14"] },
      { utterance_id: "utt-3", speaker_id: "spk-4", start_time: 2, end_time: 3, word_ids: ["w15", "w16"] },
      { utterance_id: "utt-4", speaker_id: "spk-2", start_time: 3, end_time: 4, word_ids: ["w17", "w18", "w19"] },
    ];
    document.words = [
      { word_id: "w8", text: "Please", raw_text: "Please", speaker_id: "spk-2", utterance_id: "utt-1", start_time: 0, end_time: 0.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w9", text: "state", raw_text: "state", speaker_id: "spk-2", utterance_id: "utt-1", start_time: 0.1, end_time: 0.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w10", text: "your", raw_text: "your", speaker_id: "spk-2", utterance_id: "utt-1", start_time: 0.2, end_time: 0.3, confidence: 1, reviewed: false, edited: false },
      { word_id: "w11", text: "name.", raw_text: "name.", speaker_id: "spk-2", utterance_id: "utt-1", start_time: 0.3, end_time: 0.4, confidence: 1, reviewed: false, edited: false },
      { word_id: "w12", text: "", raw_text: "", speaker_id: "spk-2", utterance_id: "utt-1", start_time: 0.4, end_time: 0.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w13", text: "I", raw_text: "I", speaker_id: "spk-3", utterance_id: "utt-2", start_time: 0.5, end_time: 0.6, confidence: 1, reviewed: false, edited: false },
      { word_id: "w14", text: "do.", raw_text: "do.", speaker_id: "spk-3", utterance_id: "utt-2", start_time: 0.6, end_time: 0.7, confidence: 1, reviewed: false, edited: false },
      { word_id: "w15", text: "Objection.", raw_text: "Objection.", speaker_id: "spk-4", utterance_id: "utt-3", start_time: 0.7, end_time: 0.8, confidence: 1, reviewed: false, edited: false },
      { word_id: "w16", text: "Form.", raw_text: "Form.", speaker_id: "spk-4", utterance_id: "utt-3", start_time: 0.8, end_time: 0.9, confidence: 1, reviewed: false, edited: false },
      { word_id: "w17", text: "So,", raw_text: "So,", speaker_id: "spk-2", utterance_id: "utt-4", start_time: 0.9, end_time: 1.0, confidence: 1, reviewed: false, edited: false },
      { word_id: "w18", text: "what", raw_text: "what", speaker_id: "spk-2", utterance_id: "utt-4", start_time: 1.0, end_time: 1.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w19", text: "happened?", raw_text: "happened?", speaker_id: "spk-2", utterance_id: "utt-4", start_time: 1.1, end_time: 1.2, confidence: 1, reviewed: false, edited: false },
    ];

    const text = buildWorkspaceTranscriptText(document, stripInlineFlagSpans, makeRecord());

    expect(text).toContain("MR. RAMON:  Objection.  Form.");
    expect(text).toContain("Q. (BY MR. BENTLEY) So, what happened?");
    expect(text).not.toContain("(BY: MR.");
  });

  it("does not add a resumption by-line for consecutive Q/A without colloquy", () => {
    const text = buildWorkspaceTranscriptText(makeDocument(), stripInlineFlagSpans, makeRecord());

    expect(text).not.toContain("Q. (BY MR. BENTLEY)");
  });

  it("formats the resumption by-line without a colon after BY", () => {
    expect(buildResumptionByLine("MR. BENTLEY")).toBe("(BY MR. BENTLEY)");
    expect(buildResumptionByLine("MR. BENTLEY")).not.toContain("(BY: MR.");
    expect(buildResumptionByLine("MR. BENTLEY")).not.toContain("MR.  BENTLEY");
  });

  it("uses display mode by default when building transcript paragraphs", () => {
    const document = makeDocument();
    document.words[0] = {
      ...document.words[0],
      text: "accent",
      raw_text: "accent",
      confidence: 0.25,
    };

    const defaultParagraphs = buildTranscriptParagraphs(document, makeRecord());
    const displayParagraphs = buildTranscriptParagraphs(document, makeRecord(), "display");

    expect(defaultParagraphs).toEqual(displayParagraphs);

    const rendered = defaultParagraphs
      .map((paragraph) => renderTranscriptParagraphText(paragraph, stripInlineFlagSpans, "display"))
      .join("\n\n");

    expect(rendered).toContain("[SCOPIST: FLAG");
  });

  it("builds clean paragraphs without inline flag spans while preserving tokens", () => {
    const document = makeDocument();
    document.words[0] = {
      ...document.words[0],
      text: "accent",
      raw_text: "accent",
      confidence: 0.25,
    };

    const cleanParagraphs = buildTranscriptParagraphs(document, makeRecord(), "clean");
    const rendered = cleanParagraphs
      .map((paragraph) => renderTranscriptParagraphText(paragraph, stripInlineFlagSpans, "clean"))
      .join("\n\n");

    expect(rendered).toContain("accent");
    expect(rendered).not.toContain("[SCOPIST: FLAG");
  });

  it("buildWorkspaceTranscriptText delegates to display mode", () => {
    const document = makeDocument();
    document.words[0] = {
      ...document.words[0],
      text: "accent",
      raw_text: "accent",
      confidence: 0.25,
    };

    const text = buildWorkspaceTranscriptText(document, stripInlineFlagSpans, makeRecord());

    expect(text).toContain("[SCOPIST: FLAG");
  });

  it("buildWorkspaceTranscriptTextClean delegates to clean mode", () => {
    const document = makeDocument();
    document.words[0] = {
      ...document.words[0],
      text: "accent",
      raw_text: "accent",
      confidence: 0.25,
    };

    const text = buildWorkspaceTranscriptTextClean(document, stripInlineFlagSpans, makeRecord());

    expect(text).toContain("accent");
    expect(text).not.toContain("[SCOPIST: FLAG");
  });

  it("merges long same-speaker answer chains into one paragraph", () => {
    const document = makeDocument();
    document.speakers = [
      { speaker_id: "spk-a", display_name: "THE WITNESS", deepgram_speaker: 0, role: "WITNESS" },
    ];
    document.utterances = Array.from({ length: 11 }, (_, index) => ({
      utterance_id: `utt-a-${index + 1}`,
      speaker_id: "spk-a",
      start_time: index,
      end_time: index + 0.5,
      word_ids: [`w-a-${index + 1}`],
    }));
    const fragments = [
      "Sure.",
      "So",
      "in my experience treating patients for the past twenty four, twenty 5 years,",
      "it is seldom",
      "when a person is involved in a single event",
      "such as a car accident where essentially they're seated, seat belted, what have you,",
      "um, where they don't sustain any other injuries",
      "and they sustain isolated",
      "disc pathology,",
      "it becomes even more unusual to sustain both neck pathology",
      "and lower back pathology as a function of a single event such as a car accident.",
    ];
    document.words = fragments.map((text, index) => ({
      word_id: `w-a-${index + 1}`,
      text,
      raw_text: text,
      speaker_id: "spk-a",
      utterance_id: `utt-a-${index + 1}`,
      start_time: index,
      end_time: index + 0.5,
      confidence: 1,
      reviewed: false,
      edited: false,
    }));

    const paragraphs = buildTranscriptParagraphs(document, makeRecord());

    expect(paragraphs.filter((paragraph) => paragraph.kind === "A")).toHaveLength(1);
    expect(renderTranscriptParagraphText(paragraphs[paragraphs.length - 1]!, stripInlineFlagSpans, "display")).toContain(
      "A. Sure. So in my experience treating patients for the past twenty four, twenty 5 years, it is seldom",
    );
  });

  it("classifies standalone No. answers as A paragraphs in transcript text", () => {
    const document = makeDocument();
    document.speakers = [
      { speaker_id: "spk-q", display_name: "MR. BENTLEY", deepgram_speaker: 0, role: "ATTORNEY" },
      { speaker_id: "spk-a", display_name: "THE WITNESS", deepgram_speaker: 1, role: "WITNESS" },
    ];
    document.utterances = [
      { utterance_id: "utt-q", speaker_id: "spk-q", start_time: 0, end_time: 1, word_ids: ["wq1"] },
      { utterance_id: "utt-a", speaker_id: "spk-a", start_time: 1, end_time: 2, word_ids: ["wa1"] },
    ];
    document.words = [
      { word_id: "wq1", text: "Do you do shoulder surgeries?", raw_text: "Do you do shoulder surgeries?", speaker_id: "spk-q", utterance_id: "utt-q", start_time: 0, end_time: 1, confidence: 1, reviewed: false, edited: false },
      { word_id: "wa1", text: "No.", raw_text: "No.", speaker_id: "spk-a", utterance_id: "utt-a", start_time: 1, end_time: 2, confidence: 1, reviewed: false, edited: false },
    ];

    const text = buildWorkspaceTranscriptText(document, stripInlineFlagSpans, makeRecord());

    expect(text).toContain("Q. Do you do shoulder surgeries?");
    expect(text).toContain("A. No.");
    expect(text).not.toContain("Q. No.");
  });

  it("produces utterance semantic assignments for downstream contract adapters", () => {
    const assignments = buildParagraphSemanticAssignments(makeDocument(), makeRecord());
    const assignmentByUtterance = new Map(assignments.map((assignment) => [assignment.utteranceId, assignment]));

    expect(assignmentByUtterance.get("utt-1")).toEqual({
      utteranceId: "utt-1",
      speakerId: "spk-0",
      speakerLabel: "THE VIDEOGRAPHER",
      lineType: "SP",
    });
    expect(assignmentByUtterance.get("utt-3")).toEqual({
      utteranceId: "utt-3",
      speakerId: "spk-2",
      speakerLabel: "MR. BENTLEY",
      lineType: "Q",
    });
    expect(assignmentByUtterance.get("utt-4")).toEqual({
      utteranceId: "utt-4",
      speakerId: "spk-3",
      speakerLabel: "DR. ETMINAN",
      lineType: "A",
    });
  });

  it("converts oath and commencement colloquy into parenthetical transcript events", () => {
    const document = makeDocument();
    document.utterances = [
      { utterance_id: "utt-1", speaker_id: "spk-0", start_time: 0, end_time: 1, word_ids: ["w1", "w2", "w3", "w4"] },
      { utterance_id: "utt-2", speaker_id: "spk-1", start_time: 1, end_time: 2, word_ids: ["w5", "w6", "w7", "w8"] },
      { utterance_id: "utt-3", speaker_id: "spk-1", start_time: 2, end_time: 3, word_ids: ["w9", "w10", "w11", "w12", "w13"] },
      { utterance_id: "utt-4", speaker_id: "spk-2", start_time: 3, end_time: 4, word_ids: ["w14", "w15", "w16"] },
      { utterance_id: "utt-5", speaker_id: "spk-3", start_time: 4, end_time: 5, word_ids: ["w17", "w18"] },
    ];
    document.words = [
      { word_id: "w1", text: "Good", raw_text: "Good", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0, end_time: 0.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w2", text: "afternoon.", raw_text: "afternoon.", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0.1, end_time: 0.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w3", text: "We", raw_text: "We", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0.2, end_time: 0.3, confidence: 1, reviewed: false, edited: false },
      { word_id: "w4", text: "are on the record.", raw_text: "are on the record.", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0.3, end_time: 0.4, confidence: 1, reviewed: false, edited: false },
      { word_id: "w5", text: "Please", raw_text: "Please", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.4, end_time: 0.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w6", text: "raise", raw_text: "raise", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.5, end_time: 0.6, confidence: 1, reviewed: false, edited: false },
      { word_id: "w7", text: "your right", raw_text: "your right", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.6, end_time: 0.7, confidence: 1, reviewed: false, edited: false },
      { word_id: "w8", text: "hand.", raw_text: "hand.", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.7, end_time: 0.8, confidence: 1, reviewed: false, edited: false },
      { word_id: "w9", text: "You", raw_text: "You", speaker_id: "spk-1", utterance_id: "utt-3", start_time: 0.8, end_time: 0.9, confidence: 1, reviewed: false, edited: false },
      { word_id: "w10", text: "may", raw_text: "may", speaker_id: "spk-1", utterance_id: "utt-3", start_time: 0.9, end_time: 1.0, confidence: 1, reviewed: false, edited: false },
      { word_id: "w11", text: "proceed", raw_text: "proceed", speaker_id: "spk-1", utterance_id: "utt-3", start_time: 1.0, end_time: 1.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w12", text: "with the", raw_text: "with the", speaker_id: "spk-1", utterance_id: "utt-3", start_time: 1.1, end_time: 1.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w13", text: "examination.", raw_text: "examination.", speaker_id: "spk-1", utterance_id: "utt-3", start_time: 1.2, end_time: 1.3, confidence: 1, reviewed: false, edited: false },
      { word_id: "w14", text: "Good", raw_text: "Good", speaker_id: "spk-2", utterance_id: "utt-4", start_time: 1.3, end_time: 1.4, confidence: 1, reviewed: false, edited: false },
      { word_id: "w15", text: "afternoon.", raw_text: "afternoon.", speaker_id: "spk-2", utterance_id: "utt-4", start_time: 1.4, end_time: 1.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w16", text: "Dennis Bentley.", raw_text: "Dennis Bentley.", speaker_id: "spk-2", utterance_id: "utt-4", start_time: 1.5, end_time: 1.6, confidence: 1, reviewed: false, edited: false },
      { word_id: "w17", text: "I", raw_text: "I", speaker_id: "spk-3", utterance_id: "utt-5", start_time: 1.6, end_time: 1.7, confidence: 1, reviewed: false, edited: false },
      { word_id: "w18", text: "do.", raw_text: "do.", speaker_id: "spk-3", utterance_id: "utt-5", start_time: 1.7, end_time: 1.8, confidence: 1, reviewed: false, edited: false },
    ];

    const text = buildWorkspaceTranscriptText(document, stripInlineFlagSpans, makeRecord());
    const assignments = new Map(
      buildParagraphSemanticAssignments(document, makeRecord()).map((assignment) => [assignment.utteranceId, assignment]),
    );

    expect(text).toContain("(The witness was sworn.)");
    expect(text).toContain("(Whereupon, the deposition commenced.)");
    expect(text).toContain("EXAMINATION");
    expect(text).not.toContain("Please raise your right hand.");
    expect(text).not.toContain("You may proceed with the examination.");
    expect(assignments.get("utt-2")?.lineType).toBe("PN");
    expect(assignments.get("utt-3")?.lineType).toBe("PN");
  });

  it("reconstructs opening attorney appearances and first examination question from a reporter-owned cluster", () => {
    const document = makeDocument();
    document.speakers = [
      { speaker_id: "spk-0", display_name: "Speaker 0", deepgram_speaker: 0, role: "OTHER" },
      { speaker_id: "spk-1", display_name: "Speaker 1", deepgram_speaker: 1, role: "OTHER" },
      { speaker_id: "spk-2", display_name: "Speaker 2", deepgram_speaker: 2, role: "OTHER" },
    ];
    document.utterances = [
      { utterance_id: "utt-1", speaker_id: "spk-0", start_time: 0, end_time: 1, word_ids: ["w1", "w2", "w3", "w4"] },
      { utterance_id: "utt-2", speaker_id: "spk-1", start_time: 1, end_time: 2, word_ids: ["w5", "w6", "w7", "w8", "w9"] },
      { utterance_id: "utt-3", speaker_id: "spk-1", start_time: 2, end_time: 3, word_ids: ["w10", "w11", "w12", "w13", "w14"] },
      { utterance_id: "utt-4", speaker_id: "spk-1", start_time: 3, end_time: 4, word_ids: ["w15", "w16", "w17", "w18"] },
      { utterance_id: "utt-5", speaker_id: "spk-1", start_time: 4, end_time: 5, word_ids: ["w19", "w20", "w21", "w22", "w23", "w24", "w25"] },
      { utterance_id: "utt-6", speaker_id: "spk-2", start_time: 5, end_time: 6, word_ids: ["w26", "w27", "w28"] },
      { utterance_id: "utt-7", speaker_id: "spk-1", start_time: 6, end_time: 7, word_ids: ["w29", "w30", "w31", "w32", "w33", "w34", "w35", "w36", "w37", "w38"] },
    ];
    document.words = [
      { word_id: "w1", text: "Good", raw_text: "Good", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0, end_time: 0.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w2", text: "afternoon.", raw_text: "afternoon.", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0.1, end_time: 0.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w3", text: "We", raw_text: "We", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0.2, end_time: 0.3, confidence: 1, reviewed: false, edited: false },
      { word_id: "w4", text: "are on the record.", raw_text: "are on the record.", speaker_id: "spk-0", utterance_id: "utt-1", start_time: 0.3, end_time: 0.4, confidence: 1, reviewed: false, edited: false },

      { word_id: "w5", text: "Good", raw_text: "Good", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.4, end_time: 0.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w6", text: "afternoon.", raw_text: "afternoon.", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.5, end_time: 0.6, confidence: 1, reviewed: false, edited: false },
      { word_id: "w7", text: "Dennis", raw_text: "Dennis", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.6, end_time: 0.7, confidence: 1, reviewed: false, edited: false },
      { word_id: "w8", text: "Bentley", raw_text: "Bentley", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.7, end_time: 0.8, confidence: 1, reviewed: false, edited: false },
      { word_id: "w9", text: "for the plaintiff.", raw_text: "for the plaintiff.", speaker_id: "spk-1", utterance_id: "utt-2", start_time: 0.8, end_time: 0.9, confidence: 1, reviewed: false, edited: false },

      { word_id: "w10", text: "Good", raw_text: "Good", speaker_id: "spk-1", utterance_id: "utt-3", start_time: 0.9, end_time: 1.0, confidence: 1, reviewed: false, edited: false },
      { word_id: "w11", text: "afternoon.", raw_text: "afternoon.", speaker_id: "spk-1", utterance_id: "utt-3", start_time: 1.0, end_time: 1.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w12", text: "Christian", raw_text: "Christian", speaker_id: "spk-1", utterance_id: "utt-3", start_time: 1.1, end_time: 1.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w13", text: "Ramon", raw_text: "Ramon", speaker_id: "spk-1", utterance_id: "utt-3", start_time: 1.2, end_time: 1.3, confidence: 1, reviewed: false, edited: false },
      { word_id: "w14", text: "for defendant.", raw_text: "for defendant.", speaker_id: "spk-1", utterance_id: "utt-3", start_time: 1.3, end_time: 1.4, confidence: 1, reviewed: false, edited: false },

      { word_id: "w15", text: "Please", raw_text: "Please", speaker_id: "spk-1", utterance_id: "utt-4", start_time: 1.4, end_time: 1.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w16", text: "raise", raw_text: "raise", speaker_id: "spk-1", utterance_id: "utt-4", start_time: 1.5, end_time: 1.6, confidence: 1, reviewed: false, edited: false },
      { word_id: "w17", text: "your right", raw_text: "your right", speaker_id: "spk-1", utterance_id: "utt-4", start_time: 1.6, end_time: 1.7, confidence: 1, reviewed: false, edited: false },
      { word_id: "w18", text: "hand.", raw_text: "hand.", speaker_id: "spk-1", utterance_id: "utt-4", start_time: 1.7, end_time: 1.8, confidence: 1, reviewed: false, edited: false },

      { word_id: "w19", text: "Thank", raw_text: "Thank", speaker_id: "spk-1", utterance_id: "utt-5", start_time: 1.8, end_time: 1.9, confidence: 1, reviewed: false, edited: false },
      { word_id: "w20", text: "you,", raw_text: "you,", speaker_id: "spk-1", utterance_id: "utt-5", start_time: 1.9, end_time: 2.0, confidence: 1, reviewed: false, edited: false },
      { word_id: "w21", text: "sir.", raw_text: "sir.", speaker_id: "spk-1", utterance_id: "utt-5", start_time: 2.0, end_time: 2.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w22", text: "You", raw_text: "You", speaker_id: "spk-1", utterance_id: "utt-5", start_time: 2.1, end_time: 2.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w23", text: "may proceed", raw_text: "may proceed", speaker_id: "spk-1", utterance_id: "utt-5", start_time: 2.2, end_time: 2.3, confidence: 1, reviewed: false, edited: false },
      { word_id: "w24", text: "with the", raw_text: "with the", speaker_id: "spk-1", utterance_id: "utt-5", start_time: 2.3, end_time: 2.4, confidence: 1, reviewed: false, edited: false },
      { word_id: "w25", text: "examination.", raw_text: "examination.", speaker_id: "spk-1", utterance_id: "utt-5", start_time: 2.4, end_time: 2.5, confidence: 1, reviewed: false, edited: false },

      { word_id: "w26", text: "I", raw_text: "I", speaker_id: "spk-2", utterance_id: "utt-6", start_time: 2.5, end_time: 2.6, confidence: 1, reviewed: false, edited: false },
      { word_id: "w27", text: "do.", raw_text: "do.", speaker_id: "spk-2", utterance_id: "utt-6", start_time: 2.6, end_time: 2.7, confidence: 1, reviewed: false, edited: false },
      { word_id: "w28", text: "", raw_text: "", speaker_id: "spk-2", utterance_id: "utt-6", start_time: 2.7, end_time: 2.8, confidence: 1, reviewed: false, edited: false },

      { word_id: "w29", text: "Good", raw_text: "Good", speaker_id: "spk-1", utterance_id: "utt-7", start_time: 2.8, end_time: 2.9, confidence: 1, reviewed: false, edited: false },
      { word_id: "w30", text: "afternoon,", raw_text: "afternoon,", speaker_id: "spk-1", utterance_id: "utt-7", start_time: 2.9, end_time: 3.0, confidence: 1, reviewed: false, edited: false },
      { word_id: "w31", text: "doctor.", raw_text: "doctor.", speaker_id: "spk-1", utterance_id: "utt-7", start_time: 3.0, end_time: 3.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w32", text: "Can", raw_text: "Can", speaker_id: "spk-1", utterance_id: "utt-7", start_time: 3.1, end_time: 3.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w33", text: "you", raw_text: "you", speaker_id: "spk-1", utterance_id: "utt-7", start_time: 3.2, end_time: 3.3, confidence: 1, reviewed: false, edited: false },
      { word_id: "w34", text: "please", raw_text: "please", speaker_id: "spk-1", utterance_id: "utt-7", start_time: 3.3, end_time: 3.4, confidence: 1, reviewed: false, edited: false },
      { word_id: "w35", text: "state", raw_text: "state", speaker_id: "spk-1", utterance_id: "utt-7", start_time: 3.4, end_time: 3.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w36", text: "your name", raw_text: "your name", speaker_id: "spk-1", utterance_id: "utt-7", start_time: 3.5, end_time: 3.6, confidence: 1, reviewed: false, edited: false },
      { word_id: "w37", text: "for the", raw_text: "for the", speaker_id: "spk-1", utterance_id: "utt-7", start_time: 3.6, end_time: 3.7, confidence: 1, reviewed: false, edited: false },
      { word_id: "w38", text: "record?", raw_text: "record?", speaker_id: "spk-1", utterance_id: "utt-7", start_time: 3.7, end_time: 3.8, confidence: 1, reviewed: false, edited: false },
    ];

    const text = buildWorkspaceTranscriptText(document, stripInlineFlagSpans, makeRecord());
    const assignments = new Map(
      buildParagraphSemanticAssignments(document, makeRecord()).map((assignment) => [assignment.utteranceId, assignment]),
    );

    expect(text).toContain("MR. BENTLEY:  Good afternoon.  Dennis Bentley for the plaintiff.");
    expect(text).toContain("MR. RAMON:  Good afternoon.  Christian Ramon for defendant.");
    expect(text).toContain("(The witness was sworn.)");
    expect(text).toContain("(Whereupon, the deposition commenced.)");
    expect(text).toContain("MOHAMMAD ETMINAN, M.D.");
    expect(text).toContain("having been first duly sworn, testified as follows:");
    expect(text).toContain("EXAMINATION");
    expect(text).toContain("BY MR. BENTLEY:");
    expect(text).toContain("Q. Good afternoon, doctor.  Can you please state your name for the record?");
    expect(assignments.get("utt-2")).toMatchObject({ speakerLabel: "MR. BENTLEY", lineType: "SP" });
    expect(assignments.get("utt-3")).toMatchObject({ speakerLabel: "MR. RAMON", lineType: "SP" });
    expect(assignments.get("utt-7")).toMatchObject({ speakerLabel: "MR. BENTLEY", lineType: "Q" });
  });

  it("converts exhibit-marking utterances into parenthetical transcript events", () => {
    const document = makeDocument();
    document.speakers = [
      { speaker_id: "spk-q", display_name: "MR. BENTLEY", deepgram_speaker: 0, role: "ATTORNEY" },
      { speaker_id: "spk-a", display_name: "THE WITNESS", deepgram_speaker: 1, role: "WITNESS" },
    ];
    document.utterances = [
      { utterance_id: "utt-q1", speaker_id: "spk-q", start_time: 0, end_time: 1, word_ids: ["w1", "w2", "w3", "w4"] },
      { utterance_id: "utt-pn", speaker_id: "spk-q", start_time: 1, end_time: 2, word_ids: ["w5", "w6", "w7"] },
      { utterance_id: "utt-a1", speaker_id: "spk-a", start_time: 2, end_time: 3, word_ids: ["w8"] },
    ];
    document.words = [
      { word_id: "w1", text: "Is", raw_text: "Is", speaker_id: "spk-q", utterance_id: "utt-q1", start_time: 0, end_time: 0.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w2", text: "this", raw_text: "this", speaker_id: "spk-q", utterance_id: "utt-q1", start_time: 0.1, end_time: 0.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w3", text: "your report?", raw_text: "your report?", speaker_id: "spk-q", utterance_id: "utt-q1", start_time: 0.2, end_time: 0.3, confidence: 1, reviewed: false, edited: false },
      { word_id: "w4", text: "", raw_text: "", speaker_id: "spk-q", utterance_id: "utt-q1", start_time: 0.3, end_time: 0.4, confidence: 1, reviewed: false, edited: false },
      { word_id: "w5", text: "Exhibit", raw_text: "Exhibit", speaker_id: "spk-q", utterance_id: "utt-pn", start_time: 0.4, end_time: 0.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w6", text: "2", raw_text: "2", speaker_id: "spk-q", utterance_id: "utt-pn", start_time: 0.5, end_time: 0.6, confidence: 1, reviewed: false, edited: false },
      { word_id: "w7", text: "marked", raw_text: "marked", speaker_id: "spk-q", utterance_id: "utt-pn", start_time: 0.6, end_time: 0.7, confidence: 1, reviewed: false, edited: false },
      { word_id: "w8", text: "Yes.", raw_text: "Yes.", speaker_id: "spk-a", utterance_id: "utt-a1", start_time: 0.7, end_time: 0.8, confidence: 1, reviewed: false, edited: false },
    ];

    const text = buildWorkspaceTranscriptText(document, stripInlineFlagSpans);
    const assignments = new Map(
      buildParagraphSemanticAssignments(document).map((assignment) => [assignment.utteranceId, assignment]),
    );

    expect(text).toContain("(Exhibit 2 marked)");
    expect(text).not.toContain("MR. BENTLEY:  Exhibit 2 marked");
    expect(assignments.get("utt-pn")?.lineType).toBe("PN");
  });

  it("keeps non-examiner attorney colloquy out of witness answers during examination", () => {
    const document = makeDocument();
    document.speakers = [
      { speaker_id: "spk-q", display_name: "MR. BENTLEY", deepgram_speaker: 0, role: "ATTORNEY" },
      { speaker_id: "spk-opp", display_name: "MR. RAMON", deepgram_speaker: 1, role: "ATTORNEY" },
      { speaker_id: "spk-a", display_name: "DR. ETMINAN", deepgram_speaker: 2, role: "WITNESS" },
    ];
    document.utterances = [
      { utterance_id: "utt-q1", speaker_id: "spk-q", start_time: 0, end_time: 1, word_ids: ["w1"] },
      { utterance_id: "utt-sp1", speaker_id: "spk-opp", start_time: 1, end_time: 2, word_ids: ["w2", "w3", "w4", "w5", "w6", "w7", "w8"] },
      { utterance_id: "utt-a1", speaker_id: "spk-a", start_time: 2, end_time: 3, word_ids: ["w9"] },
    ];
    document.words = [
      { word_id: "w1", text: "Have you ever seen this article before?", raw_text: "Have you ever seen this article before?", speaker_id: "spk-q", utterance_id: "utt-q1", start_time: 0, end_time: 0.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w2", text: "Dennis,", raw_text: "Dennis,", speaker_id: "spk-opp", utterance_id: "utt-sp1", start_time: 0.5, end_time: 0.6, confidence: 1, reviewed: false, edited: false },
      { word_id: "w3", text: "can", raw_text: "can", speaker_id: "spk-opp", utterance_id: "utt-sp1", start_time: 0.6, end_time: 0.7, confidence: 1, reviewed: false, edited: false },
      { word_id: "w4", text: "you", raw_text: "you", speaker_id: "spk-opp", utterance_id: "utt-sp1", start_time: 0.7, end_time: 0.8, confidence: 1, reviewed: false, edited: false },
      { word_id: "w5", text: "scroll", raw_text: "scroll", speaker_id: "spk-opp", utterance_id: "utt-sp1", start_time: 0.8, end_time: 0.9, confidence: 1, reviewed: false, edited: false },
      { word_id: "w6", text: "up", raw_text: "up", speaker_id: "spk-opp", utterance_id: "utt-sp1", start_time: 0.9, end_time: 1.0, confidence: 1, reviewed: false, edited: false },
      { word_id: "w7", text: "a little", raw_text: "a little", speaker_id: "spk-opp", utterance_id: "utt-sp1", start_time: 1.0, end_time: 1.1, confidence: 1, reviewed: false, edited: false },
      { word_id: "w8", text: "bit?", raw_text: "bit?", speaker_id: "spk-opp", utterance_id: "utt-sp1", start_time: 1.1, end_time: 1.2, confidence: 1, reviewed: false, edited: false },
      { word_id: "w9", text: "No.", raw_text: "No.", speaker_id: "spk-a", utterance_id: "utt-a1", start_time: 1.2, end_time: 1.3, confidence: 1, reviewed: false, edited: false },
    ];

    const text = buildWorkspaceTranscriptText(document, stripInlineFlagSpans);
    const assignments = new Map(
      buildParagraphSemanticAssignments(document).map((assignment) => [assignment.utteranceId, assignment]),
    );
    expect(text).toContain("Q. Have you ever seen this article before?");
    expect(text).toContain("MR. RAMON:  Dennis, can you scroll up a little bit?");
    expect(text).toContain("A. No.");
    expect(text).not.toContain("A. Dennis, can you scroll up a little bit?");
    expect(assignments.get("utt-sp1")).toMatchObject({ speakerLabel: "MR. RAMON", lineType: "SP" });
    expect(assignments.get("utt-a1")).toMatchObject({ speakerLabel: "DR. ETMINAN", lineType: "A" });
  });

  it("isolates caption and certification text from testimony semantics", () => {
    const document = makeDocument();
    document.speakers = [
      { speaker_id: "spk-0", display_name: "Speaker 0", deepgram_speaker: 0, role: "OTHER" },
      { speaker_id: "spk-1", display_name: "Speaker 1", deepgram_speaker: 1, role: "OTHER" },
      { speaker_id: "spk-2", display_name: "MR. BENTLEY", deepgram_speaker: 2, role: "ATTORNEY" },
      { speaker_id: "spk-3", display_name: "THE WITNESS", deepgram_speaker: 3, role: "WITNESS" },
    ];
    document.utterances = [
      { utterance_id: "utt-cap-1", speaker_id: "spk-0", start_time: 0, end_time: 1, word_ids: ["w1"] },
      { utterance_id: "utt-cap-2", speaker_id: "spk-0", start_time: 1, end_time: 2, word_ids: ["w2"] },
      { utterance_id: "utt-pro-1", speaker_id: "spk-1", start_time: 2, end_time: 3, word_ids: ["w3"] },
      { utterance_id: "utt-pro-2", speaker_id: "spk-1", start_time: 3, end_time: 4, word_ids: ["w4"] },
      { utterance_id: "utt-q-1", speaker_id: "spk-2", start_time: 4, end_time: 5, word_ids: ["w5"] },
      { utterance_id: "utt-a-1", speaker_id: "spk-3", start_time: 5, end_time: 6, word_ids: ["w6"] },
      { utterance_id: "utt-cert-1", speaker_id: "spk-0", start_time: 6, end_time: 7, word_ids: ["w7"] },
      { utterance_id: "utt-cert-2", speaker_id: "spk-0", start_time: 7, end_time: 8, word_ids: ["w8"] },
    ];
    document.words = [
      { word_id: "w1", text: "CAUSE NO. 2026-CV-1042", raw_text: "CAUSE NO. 2026-CV-1042", speaker_id: "spk-0", utterance_id: "utt-cap-1", start_time: 0, end_time: 0.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w2", text: "JORDAN ALVAREZ, Plaintiff,", raw_text: "JORDAN ALVAREZ, Plaintiff,", speaker_id: "spk-0", utterance_id: "utt-cap-2", start_time: 0.5, end_time: 1.0, confidence: 1, reviewed: false, edited: false },
      { word_id: "w3", text: "PROCEEDINGS", raw_text: "PROCEEDINGS", speaker_id: "spk-1", utterance_id: "utt-pro-1", start_time: 1.0, end_time: 1.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w4", text: "We are on the record.", raw_text: "We are on the record.", speaker_id: "spk-1", utterance_id: "utt-pro-2", start_time: 1.5, end_time: 2.0, confidence: 1, reviewed: false, edited: false },
      { word_id: "w5", text: "Please state your name for the record?", raw_text: "Please state your name for the record?", speaker_id: "spk-2", utterance_id: "utt-q-1", start_time: 2.0, end_time: 2.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w6", text: "Jordan Alvarez.", raw_text: "Jordan Alvarez.", speaker_id: "spk-3", utterance_id: "utt-a-1", start_time: 2.5, end_time: 3.0, confidence: 1, reviewed: false, edited: false },
      { word_id: "w7", text: "CHANGES AND SIGNATURE", raw_text: "CHANGES AND SIGNATURE", speaker_id: "spk-0", utterance_id: "utt-cert-1", start_time: 3.0, end_time: 3.5, confidence: 1, reviewed: false, edited: false },
      { word_id: "w8", text: "THE STATE OF TEXAS", raw_text: "THE STATE OF TEXAS", speaker_id: "spk-0", utterance_id: "utt-cert-2", start_time: 3.5, end_time: 4.0, confidence: 1, reviewed: false, edited: false },
    ];

    const paragraphs = buildTranscriptParagraphs(document, makeRecord());
    const rendered = paragraphs
      .map((paragraph) => renderTranscriptParagraphText(paragraph, stripInlineFlagSpans, "display"))
      .join("\n\n");

    expect(paragraphs[0]?.kind).toBe("DOCUMENT_BLOCK");
    expect(paragraphs[0]?.region).toBe("CAPTION");
    expect(paragraphs[1]?.kind).toBe("DOCUMENT_BLOCK");
    expect(paragraphs[1]?.region).toBe("CAPTION");
    expect(paragraphs[2]?.kind).toBe("SECTION_HEADER");
    expect(paragraphs[2]?.region).toBe("PROCEEDINGS");
    expect(paragraphs.some((paragraph) => paragraph.kind === "Q" && paragraph.region === "TESTIMONY")).toBe(true);
    expect(paragraphs.some((paragraph) => paragraph.kind === "A" && paragraph.region === "TESTIMONY")).toBe(true);
    expect(paragraphs[paragraphs.length - 1]?.kind).toBe("DOCUMENT_BLOCK");
    expect(paragraphs[paragraphs.length - 1]?.region).toBe("CERTIFICATION");
    expect(rendered).toContain("CAUSE NO. 2026-CV-1042");
    expect(rendered).toContain("IN THE DISTRICT COURT");
    expect(rendered).toContain("JORDAN ALVAREZ");
    expect(rendered).toContain("ACME LOGISTICS, INC.");
    expect(rendered).toContain("APPEARANCES");
    expect(rendered).toContain("DENNIS BENTLEY");
    expect(rendered).toContain("For Plaintiff");
    expect(rendered).toContain("CHANGES AND SIGNATURE");
    expect(rendered).not.toContain("SPEAKER 0:");
    expect(rendered).toContain("Q. Please state your name for the record?");
    expect(rendered).toContain("A. Jordan Alvarez.");
  });
});
