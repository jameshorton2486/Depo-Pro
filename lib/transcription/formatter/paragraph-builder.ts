import type { DepositionSection, JurisdictionConfig, Paragraph, SpeakerAssignment, TranscriptWord } from './types';
import type { SectionMap } from './section-detector';

export function buildParagraphs(
  words: TranscriptWord[],
  speakers: SpeakerAssignment[],
  sectionMap: SectionMap,
  _jurisdiction: JurisdictionConfig
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const speakerMap = new Map(speakers.map((speaker) => [speaker.speaker_index, speaker]));
  let buffer: TranscriptWord[] = [];
  let currentSpeaker: number | null = null;
  let paragraphIndex = 0;
  let lastSection: DepositionSection = 'PREAMBLE';
  const insertedBylines = new Set<string>();

  const flush = () => {
    if (!buffer.length) return;
    const paragraph = createParagraph(buffer, speakerMap, sectionMap, paragraphIndex);
    if (paragraph) {
      const speaker = speakerMap.get(buffer[0].speaker_index);
      const section = paragraph.section_type;
      const bylineKey = `${section}:${speaker?.speaker_index ?? 'none'}`;
      if (speaker && speaker.qa_label === 'Q' && isExaminationSection(section) && !insertedBylines.has(bylineKey)) {
        insertedBylines.add(bylineKey);
        const bylineText = buildBylineLabel(speaker);
        paragraphs.push({
          paragraph_index: paragraphIndex++,
          paragraph_type: 'EXAMINATION_BYLINE',
          section_type: section,
          speaker_index: null,
          speaker_label: null,
          text: bylineText,
          raw_text: bylineText,
          word_ids: [buffer[0].id],
          start_word_idx: buffer[0].position_index,
          end_word_idx: buffer[0].position_index,
          requires_reentry_marker: false,
          has_interruption: false,
          line_count: 1,
        });
      }
      paragraphs.push({ ...paragraph, paragraph_index: paragraphIndex++ });
    }
    buffer = [];
  };

  for (const word of words) {
    const section = sectionMap.get(word.position_index) ?? 'PREAMBLE';
    if (buffer.length && (word.speaker_index !== currentSpeaker || section !== lastSection)) {
      if (lastSection === 'OFF_RECORD' && section !== 'OFF_RECORD') {
        paragraphs.push(makeReentryParagraph(paragraphIndex++, section));
      }
      flush();
    }

    currentSpeaker = word.speaker_index;
    lastSection = section;
    buffer.push(word);
  }

  flush();

  if (lastSection === 'CLOSING') {
    paragraphs.push({
      paragraph_index: paragraphIndex++,
      paragraph_type: 'CLOSING_ASTERISKS',
      section_type: 'CLOSING',
      speaker_index: null,
      speaker_label: null,
      text: '* * * * *',
      raw_text: '* * * * *',
      word_ids: [],
      start_word_idx: 0,
      end_word_idx: 0,
      requires_reentry_marker: false,
      has_interruption: false,
      line_count: 1,
    });
    paragraphs.push({
      paragraph_index: paragraphIndex,
      paragraph_type: 'FURTHER_SAYETH',
      section_type: 'CLOSING',
      speaker_index: null,
      speaker_label: null,
      text: 'FURTHER THIS DEPONENT SAITH NOT.',
      raw_text: 'FURTHER THIS DEPONENT SAITH NOT.',
      word_ids: [],
      start_word_idx: 0,
      end_word_idx: 0,
      requires_reentry_marker: false,
      has_interruption: false,
      line_count: 1,
    });
  }

  return paragraphs;
}

export function isExaminationSection(section: DepositionSection): boolean {
  return [
    'DIRECT_EXAMINATION',
    'CROSS_EXAMINATION',
    'REDIRECT_EXAMINATION',
    'RECROSS_EXAMINATION',
  ].includes(section);
}

function createParagraph(
  words: TranscriptWord[],
  speakerMap: Map<number, SpeakerAssignment>,
  sectionMap: SectionMap,
  paragraphIndex: number
): Paragraph | null {
  if (!words.length) return null;
  const firstWord = words[0];
  const speaker = speakerMap.get(firstWord.speaker_index);
  const section = sectionMap.get(firstWord.position_index) ?? 'PREAMBLE';
  const inExam = isExaminationSection(section);
  const rawText = words.map((word) => word.corrected_word ?? word.display_word ?? word.punctuated_word ?? word.word).join(' ');
  const paragraphType = inExam
    ? speaker?.qa_label === 'Q'
      ? 'QUESTION'
      : 'ANSWER'
    : 'COLLOQUY';

  return {
    paragraph_index: paragraphIndex,
    paragraph_type: paragraphType,
    section_type: section,
    speaker_index: firstWord.speaker_index,
    speaker_label: deriveSpeakerLabel(speaker, paragraphType),
    text: rawText,
    raw_text: rawText,
    word_ids: words.map((word) => word.id),
    start_word_idx: firstWord.position_index,
    end_word_idx: words[words.length - 1].position_index,
    requires_reentry_marker: false,
    has_interruption: /--\s*$/.test(rawText),
    line_count: 1,
  };
}

function deriveSpeakerLabel(
  speaker: SpeakerAssignment | undefined,
  paragraphType: Paragraph['paragraph_type']
): string {
  if (paragraphType === 'QUESTION') return 'Q.';
  if (paragraphType === 'ANSWER') return 'A.';
  if (!speaker) return '--';

  switch (speaker.role) {
    case 'reporter':
      return 'THE REPORTER:';
    case 'videographer':
      return 'THE VIDEOGRAPHER:';
    case 'interpreter':
      return 'THE INTERPRETER:';
    case 'witness':
      return 'THE WITNESS:';
    default: {
      const lastName = speaker.last_name?.toUpperCase() || speaker.full_name.trim().split(/\s+/).pop()?.toUpperCase();
      return lastName ? `MR. ${lastName}:` : 'MR.:';
    }
  }
}

function buildBylineLabel(speaker: SpeakerAssignment): string {
  const label = speaker.colloquy_label || deriveSpeakerLabel(speaker, 'COLLOQUY');
  return `BY ${label}`.replace(/:$/, ':');
}

function makeReentryParagraph(paragraphIndex: number, section: DepositionSection): Paragraph {
  const text = section === 'OFF_RECORD'
    ? '(Whereupon, a brief recess was taken.)'
    : '(The deposition resumed.)';

  return {
    paragraph_index: paragraphIndex,
    paragraph_type: 'PARENTHETICAL',
    section_type: section,
    speaker_index: null,
    speaker_label: null,
    text,
    raw_text: text,
    word_ids: [],
    start_word_idx: 0,
    end_word_idx: 0,
    requires_reentry_marker: true,
    has_interruption: false,
    line_count: 1,
  };
}
