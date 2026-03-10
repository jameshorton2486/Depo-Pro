import type { DepositionSection, SpeakerAssignment, TranscriptWord } from './types';

export type SectionMap = Map<number, DepositionSection>;

const SECTION_TRIGGERS: Array<{ pattern: RegExp; section: DepositionSection }> = [
  { pattern: /^DIRECT\s+EXAMINATION$/i, section: 'DIRECT_EXAMINATION' },
  { pattern: /^CROSS[-\s]+EXAMINATION$/i, section: 'CROSS_EXAMINATION' },
  { pattern: /^REDIRECT\s+EXAMINATION$/i, section: 'REDIRECT_EXAMINATION' },
  { pattern: /^RECROSS[-\s]+EXAMINATION$/i, section: 'RECROSS_EXAMINATION' },
  { pattern: /^OFF\s+THE\s+RECORD$/i, section: 'OFF_RECORD' },
  { pattern: /FURTHER\s+THIS\s+DEPONENT\s+SAITH\s+NOT/i, section: 'CLOSING' },
];

const BACK_ON_RECORD = /^BACK\s+ON\s+THE\s+RECORD$/i;

export function detectSections(
  words: TranscriptWord[],
  _speakers: SpeakerAssignment[]
): SectionMap {
  const sectionMap: SectionMap = new Map();
  let currentSection: DepositionSection = 'PREAMBLE';
  let lastExamSection: DepositionSection = 'DIRECT_EXAMINATION';

  for (let i = 0; i < words.length; i++) {
    const windows = [5, 4, 3, 2].map((count) => buildWindow(words, i, count));

    for (const text of windows) {
      const trimmed = text.trim();
      if (!trimmed) continue;

      if (BACK_ON_RECORD.test(trimmed)) {
        currentSection = lastExamSection;
        break;
      }

      const trigger = SECTION_TRIGGERS.find(({ pattern }) => pattern.test(trimmed));
      if (trigger) {
        currentSection = trigger.section;
        if (
          currentSection === 'DIRECT_EXAMINATION' ||
          currentSection === 'CROSS_EXAMINATION' ||
          currentSection === 'REDIRECT_EXAMINATION' ||
          currentSection === 'RECROSS_EXAMINATION'
        ) {
          lastExamSection = currentSection;
        }
        break;
      }
    }

    sectionMap.set(words[i].position_index, currentSection);
  }
  return sectionMap;
}

function buildWindow(words: TranscriptWord[], start: number, count: number): string {
  return words
    .slice(start, start + count)
    .map((word) => word.display_word || word.punctuated_word || word.word)
    .join(' ');
}
