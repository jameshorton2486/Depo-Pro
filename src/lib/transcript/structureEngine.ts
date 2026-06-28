export type StructureBlockType =
  | "Q"
  | "A"
  | "SP"
  | "PN"
  | "HEADER"
  | "NEEDS_SPLIT"
  | "NEEDS_EXTRACT";

export type StructureSpeakerRole =
  | "ATTORNEY"
  | "WITNESS"
  | "REPORTER"
  | "VIDEOGRAPHER"
  | "INTERPRETER"
  | "OTHER"
  | "UNKNOWN";

export interface StructureSpeakerMapEntry {
  display_name: string;
  role: StructureSpeakerRole;
}

export interface StructureUtterance {
  utterance_index: number;
  utterance_id: string;
  speaker_id: string;
  text: string;
  excluded_from_output?: boolean;
  line_type?: StructureBlockType | null;
}

export interface ClassifiedBlock {
  utterance_index: number;
  utterance_id: string;
  block_type: StructureBlockType;
  speaker_id: string;
  display_name: string;
  confidence: number;
  text?: string;
  split_point?: string;
  objection_text?: string;
  position?: "start" | "middle" | "end";
  synthetic_flag?: string;
}

export interface SplitBlockPart {
  block_type: "Q" | "A";
  speaker_id: string;
  display_name: string;
  text: string;
}

export interface SplitBlockResult {
  utterance_index: number;
  utterance_id: string;
  splits: SplitBlockPart[];
}

export interface ExtractedObjectionResult {
  utterance_index: number;
  utterance_id: string;
  original_block_type: "Q" | "A";
  extracted_objection: {
    speaker_id: string;
    display_name: string;
    text: string;
    position: "start" | "middle" | "end";
  };
  remaining_q_text: string;
  remaining_a_text: string;
  insert_by_line_on_next_q: boolean;
  next_q_examiner: string;
}

export interface FlowViolation {
  violation_type: "DOUBLE_QUESTION" | "DOUBLE_ANSWER" | "ANSWER_BEFORE_QUESTION";
  utterance_indices: number[];
  severity: "error" | "warning";
  auto_fixable: boolean;
  flag_text: string;
}

export interface FlowValidationResult {
  violations: FlowViolation[];
  flow_valid: boolean;
  metrics: {
    total_qa_pairs: number;
    violations_found: number;
    auto_fixed: number;
    flags_inserted: number;
  };
}

export interface StructureEngineClient {
  completeJson<T>(input: {
    promptId: "3-A" | "3-B" | "3-C" | "3-D" | "3-E";
    system: string;
    user: string;
    maxTokens: number;
  }): Promise<T>;
}

const MODEL = "claude-sonnet-4-6";
const TEMPERATURE = 0;
const SHORT_DUPLICATE_ALLOWLIST = new Set(["I", "so", "he", "she", "we", "no", "to", "do", "be", "go"]);
const ANSWER_TOKEN_PATTERN = /^(Yes\.|No\.|Correct\.|I don't recall\.|I do\.|I did\.|I was\.|Uh-huh\.|Mm-hmm\.)$/i;
const OBJECTION_PATTERN = /\bObjection\.\s*(?:Form\.|Foundation\.|Nonresponsive\.|Hearsay\.)?/i;

function assertInvariant(): void {
  if (MODEL !== "claude-sonnet-4-6" || TEMPERATURE !== 0) {
    throw new Error("Structure engine must use claude-sonnet-4-6 at temperature 0.");
  }
}

function getRole(
  speakerId: string,
  speakerMap: Record<string, StructureSpeakerMapEntry>,
): StructureSpeakerRole {
  return speakerMap[speakerId]?.role ?? "UNKNOWN";
}

function getDisplayName(
  speakerId: string,
  speakerMap: Record<string, StructureSpeakerMapEntry>,
): string {
  return speakerMap[speakerId]?.display_name ?? speakerId;
}

function extractSurname(displayName: string): string {
  const normalized = displayName
    .replace(/^THE\s+/i, "")
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  const parts = normalized.split(" ").filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
}

function buildByLine(displayName: string): string {
  return `(BY MR.  ${extractSurname(displayName)})  `;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function removeLongDuplicateWords(text: string): string {
  const tokens = text.split(/\s+/).filter(Boolean);
  const deduped: string[] = [];

  for (const token of tokens) {
    const previous = deduped[deduped.length - 1];
    const cleanToken = token.replace(/[^A-Za-z]/g, "");
    if (
      previous
      && previous.localeCompare(token, undefined, { sensitivity: "accent" }) === 0
      && cleanToken.length >= 4
      && !SHORT_DUPLICATE_ALLOWLIST.has(cleanToken)
    ) {
      continue;
    }
    deduped.push(token);
  }

  return deduped.join(" ");
}

function isStandaloneAnswer(text: string): boolean {
  return ANSWER_TOKEN_PATTERN.test(normalizeWhitespace(text));
}

function classifyDeterministically(
  utterance: StructureUtterance,
  speakerMap: Record<string, StructureSpeakerMapEntry>,
): ClassifiedBlock {
  const role = getRole(utterance.speaker_id, speakerMap);
  const text = normalizeWhitespace(utterance.text);
  const display_name = getDisplayName(utterance.speaker_id, speakerMap);

  if (/^(EXAMINATION|CROSS-EXAMINATION|REDIRECT EXAMINATION|RECROSS-EXAMINATION)$/i.test(text)) {
    return { utterance_index: utterance.utterance_index, utterance_id: utterance.utterance_id, block_type: "HEADER", speaker_id: utterance.speaker_id, display_name, confidence: 1 };
  }

  if (/^\(.*\)$/.test(text)) {
    return { utterance_index: utterance.utterance_index, utterance_id: utterance.utterance_id, block_type: "PN", speaker_id: utterance.speaker_id, display_name, confidence: 0.99 };
  }

  if (role === "REPORTER" || role === "VIDEOGRAPHER" || role === "INTERPRETER") {
    return { utterance_index: utterance.utterance_index, utterance_id: utterance.utterance_id, block_type: "SP", speaker_id: utterance.speaker_id, display_name, confidence: 1 };
  }

  if (role === "WITNESS") {
    if (OBJECTION_PATTERN.test(text)) {
      return {
        utterance_index: utterance.utterance_index,
        utterance_id: utterance.utterance_id,
        block_type: "NEEDS_EXTRACT",
        speaker_id: utterance.speaker_id,
        display_name,
        confidence: 0.9,
        objection_text: text.match(OBJECTION_PATTERN)?.[0] ?? "Objection.",
        position: "middle",
      };
    }

    return {
      utterance_index: utterance.utterance_index,
      utterance_id: utterance.utterance_id,
      block_type: "A",
      speaker_id: utterance.speaker_id,
      display_name,
      confidence: isStandaloneAnswer(text) ? 1 : 0.97,
    };
  }

  if (role === "ATTORNEY") {
    const questionIndex = text.indexOf("?");
    const trailing = questionIndex >= 0 ? normalizeWhitespace(text.slice(questionIndex + 1)) : "";
    if (questionIndex >= 0 && trailing && isStandaloneAnswer(trailing)) {
      return {
        utterance_index: utterance.utterance_index,
        utterance_id: utterance.utterance_id,
        block_type: "NEEDS_SPLIT",
        speaker_id: utterance.speaker_id,
        display_name,
        confidence: 0.94,
        split_point: normalizeWhitespace(text.slice(0, questionIndex + 1)),
      };
    }

    if (OBJECTION_PATTERN.test(text)) {
      return {
        utterance_index: utterance.utterance_index,
        utterance_id: utterance.utterance_id,
        block_type: "SP",
        speaker_id: utterance.speaker_id,
        display_name,
        confidence: 0.98,
      };
    }

    if (/\?$/.test(text) || /^(state|tell|describe|explain|identify)\b/i.test(text)) {
      return {
        utterance_index: utterance.utterance_index,
        utterance_id: utterance.utterance_id,
        block_type: "Q",
        speaker_id: utterance.speaker_id,
        display_name,
        confidence: 0.97,
      };
    }
  }

  return {
    utterance_index: utterance.utterance_index,
    utterance_id: utterance.utterance_id,
    block_type: "SP",
    speaker_id: utterance.speaker_id,
    display_name,
    confidence: 0.8,
  };
}

export async function classifyBlocks(
  utterances: StructureUtterance[],
  confirmedSpeakerMap: Record<string, StructureSpeakerMapEntry>,
  client?: StructureEngineClient,
): Promise<ClassifiedBlock[]> {
  assertInvariant();
  const onRecordUtterances = utterances.filter((utterance) => utterance.excluded_from_output !== true);

  if (client) {
    return client.completeJson<ClassifiedBlock[]>({
      promptId: "3-A",
      system: "Structure engine prompt 3-A",
      user: JSON.stringify({ utterances: onRecordUtterances, confirmedSpeakerMap }),
      maxTokens: 4096,
    });
  }

  return onRecordUtterances.map((utterance) => classifyDeterministically(utterance, confirmedSpeakerMap));
}

export async function splitMergedBlocks(
  needsSplitBlocks: Array<ClassifiedBlock & { text: string }>,
  examinerSpeakerId: string,
  witnessSpeakerId: string,
  speakerMap: Record<string, StructureSpeakerMapEntry>,
  client?: StructureEngineClient,
): Promise<SplitBlockResult[]> {
  assertInvariant();

  if (client) {
    return client.completeJson<SplitBlockResult[]>({
      promptId: "3-B",
      system: "Structure engine prompt 3-B",
      user: JSON.stringify({ needsSplitBlocks, examinerSpeakerId, witnessSpeakerId, speakerMap }),
      maxTokens: 2048,
    });
  }

  return needsSplitBlocks.map((block) => {
    const questionIndex = block.text.indexOf("?");
    const questionText = normalizeWhitespace(block.text.slice(0, questionIndex + 1));
    const answerText = normalizeWhitespace(block.text.slice(questionIndex + 1));
    return {
      utterance_index: block.utterance_index,
      utterance_id: block.utterance_id,
      splits: [
        {
          block_type: "Q",
          speaker_id: examinerSpeakerId,
          display_name: getDisplayName(examinerSpeakerId, speakerMap),
          text: questionText,
        },
        {
          block_type: "A",
          speaker_id: witnessSpeakerId,
          display_name: getDisplayName(witnessSpeakerId, speakerMap),
          text: answerText,
        },
      ],
    };
  });
}

export async function extractEmbeddedObjections(
  needsExtractBlocks: Array<ClassifiedBlock & { text: string }>,
  confirmedSpeakerMap: Record<string, StructureSpeakerMapEntry>,
  client?: StructureEngineClient,
): Promise<ExtractedObjectionResult[]> {
  assertInvariant();

  if (client) {
    return client.completeJson<ExtractedObjectionResult[]>({
      promptId: "3-C",
      system: "Structure engine prompt 3-C",
      user: JSON.stringify({ needsExtractBlocks, confirmedSpeakerMap }),
      maxTokens: 2048,
    });
  }

  const examiner = Object.entries(confirmedSpeakerMap).find(([, entry]) => entry.role === "ATTORNEY");
  const examinerSpeakerId = examiner?.[0] ?? "spk_examiner";
  const examinerName = examiner?.[1].display_name ?? "MR.  BENTLEY";

  return needsExtractBlocks.flatMap((block) => {
    const match = block.text.match(OBJECTION_PATTERN);
    if (!match || match.index == null) {
      return [];
    }

    const before = normalizeWhitespace(block.text.slice(0, match.index));
    const after = normalizeWhitespace(block.text.slice(match.index + match[0].length));
    const objectionTailMatch = after.match(/^(You can answer\.?|You may answer\.?|Go ahead and answer\.?)/i);
    const objectionText = normalizeWhitespace(`${match[0]}${objectionTailMatch ? ` ${objectionTailMatch[0]}` : ""}`.replace(/\s+/g, " "));
    const remainingAnswer = normalizeWhitespace(after.slice(objectionTailMatch?.[0].length ?? 0));

    return [{
      utterance_index: block.utterance_index,
      utterance_id: block.utterance_id,
      original_block_type: "A" as const,
      extracted_objection: {
        speaker_id: examinerSpeakerId,
        display_name: examinerName,
        text: objectionText,
        position: before ? "middle" : "start",
      },
      remaining_q_text: "",
      remaining_a_text: before && remainingAnswer ? `${before} ${remainingAnswer}` : before || remainingAnswer,
      insert_by_line_on_next_q: true,
      next_q_examiner: examinerName,
    }];
  });
}

export async function verifyColloquy(
  spBlocks: Array<ClassifiedBlock & { text: string }>,
  confirmedSpeakerMap: Record<string, StructureSpeakerMapEntry>,
  client?: StructureEngineClient,
): Promise<Array<{ utterance_index: number; current_type: "SP"; correct_type: "Q" | "A"; reason: string; confidence: number }>> {
  assertInvariant();

  if (client) {
    return client.completeJson<Array<{ utterance_index: number; current_type: "SP"; correct_type: "Q" | "A"; reason: string; confidence: number }>>({
      promptId: "3-D",
      system: "Structure engine prompt 3-D",
      user: JSON.stringify({ spBlocks, confirmedSpeakerMap }),
      maxTokens: 1024,
    });
  }

  const reclassifications: Array<{
    utterance_index: number;
    current_type: "SP";
    correct_type: "Q" | "A";
    reason: string;
    confidence: number;
  }> = [];

  for (const block of spBlocks) {
    const role = getRole(block.speaker_id, confirmedSpeakerMap);
    const text = normalizeWhitespace(block.text);
    if (role === "WITNESS" && isStandaloneAnswer(text)) {
      reclassifications.push({
        utterance_index: block.utterance_index,
        current_type: "SP" as const,
        correct_type: "A" as const,
        reason: "Witness testimony answer token should be classified as A.",
        confidence: 0.98,
      });
      continue;
    }
    if (role === "ATTORNEY" && (/\?$/.test(text) || /^let me ask/i.test(text))) {
      reclassifications.push({
        utterance_index: block.utterance_index,
        current_type: "SP" as const,
        correct_type: "Q" as const,
        reason: "Attorney substantive question should be classified as Q.",
        confidence: 0.93,
      });
    }
  }

  return reclassifications;
}

export async function validateConversationFlow(
  allClassifiedBlocks: Array<ClassifiedBlock & { text?: string }>,
  client?: StructureEngineClient,
): Promise<FlowValidationResult> {
  assertInvariant();

  if (client) {
    return client.completeJson<FlowValidationResult>({
      promptId: "3-E",
      system: "Structure engine prompt 3-E",
      user: JSON.stringify({ allClassifiedBlocks }),
      maxTokens: 1024,
    });
  }

  const qaBlocks = allClassifiedBlocks.filter((block) => block.block_type === "Q" || block.block_type === "A");
  const violations: FlowViolation[] = [];
  let seenQuestion = false;

  for (let index = 0; index < qaBlocks.length; index += 1) {
    const current = qaBlocks[index];
    const previous = qaBlocks[index - 1];

    if (current.block_type === "A" && !seenQuestion) {
      violations.push({
        violation_type: "ANSWER_BEFORE_QUESTION",
        utterance_indices: [current.utterance_index],
        severity: "error",
        auto_fixable: false,
        flag_text: `[SCOPIST: FLAG ${violations.length + 1}: Possible classification error before first question — verify from audio]`,
      });
    }

    if (previous?.block_type === "Q" && current.block_type === "Q") {
      violations.push({
        violation_type: "DOUBLE_QUESTION",
        utterance_indices: [previous.utterance_index, current.utterance_index],
        severity: "warning",
        auto_fixable: false,
        flag_text: `[SCOPIST: FLAG ${violations.length + 1}: Possible missing utterance between blocks ${previous.utterance_index} and ${current.utterance_index} — verify from audio]`,
      });
    }

    if (previous?.block_type === "A" && current.block_type === "A") {
      violations.push({
        violation_type: "DOUBLE_ANSWER",
        utterance_indices: [previous.utterance_index, current.utterance_index],
        severity: "warning",
        auto_fixable: false,
        flag_text: `[SCOPIST: FLAG ${violations.length + 1}: Possible missing utterance between blocks ${previous.utterance_index} and ${current.utterance_index} — verify from audio]`,
      });
    }

    if (current.block_type === "Q") {
      seenQuestion = true;
    }
  }

  return {
    violations,
    flow_valid: violations.length === 0,
    metrics: {
      total_qa_pairs: allClassifiedBlocks.filter((block) => block.block_type === "Q").length,
      violations_found: violations.length,
      auto_fixed: 0,
      flags_inserted: violations.length,
    },
  };
}

export function mergeConsecutiveFragments(
  classifiedBlocks: Array<ClassifiedBlock & { text: string }>,
): Array<ClassifiedBlock & { text: string }> {
  const merged: Array<ClassifiedBlock & { text: string }> = [];

  for (const block of classifiedBlocks) {
    const previous = merged[merged.length - 1];
    const normalizedText = removeLongDuplicateWords(normalizeWhitespace(block.text));
    const current = { ...block, text: normalizedText };

    if (!previous) {
      merged.push(current);
      continue;
    }

    const previousText = normalizeWhitespace(previous.text);
    const currentText = normalizeWhitespace(current.text);
    const duplicateParagraph =
      previous.speaker_id === current.speaker_id
      && previous.block_type === current.block_type
      && previousText.localeCompare(currentText, undefined, { sensitivity: "accent" }) === 0
      && previousText.replace(/\s+/g, "").length >= 4;

    if (duplicateParagraph) {
      continue;
    }

    const canMerge =
      previous.speaker_id === current.speaker_id
      && previous.block_type === current.block_type
      && !/[.?!]\s*$/.test(previousText)
      && !isStandaloneAnswer(previousText)
      && !isStandaloneAnswer(currentText)
      && previous.block_type !== "HEADER"
      && previous.block_type !== "PN";

    if (canMerge) {
      previous.text = removeLongDuplicateWords(`${previousText} ${currentText}`);
      continue;
    }

    merged.push(current);
  }

  return merged;
}

export function applyByLineToNextQuestion(
  blocks: Array<ClassifiedBlock & { text: string }>,
  examinerDisplayName: string,
): Array<ClassifiedBlock & { text: string }> {
  let shouldApply = false;

  return blocks.map((block) => {
    if (block.block_type === "SP" && /\bObjection\./i.test(block.text)) {
      shouldApply = true;
      return block;
    }

    if (shouldApply && block.block_type === "Q") {
      shouldApply = false;
      return {
        ...block,
        text: `${buildByLine(examinerDisplayName)}${normalizeWhitespace(block.text)}`,
      };
    }

    return block;
  });
}
