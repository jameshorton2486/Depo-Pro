import type { Paragraph } from './types';

export function postProcessParagraphs(paragraphs: Paragraph[]): Paragraph[] {
  return paragraphs.map((paragraph) => ({
    ...paragraph,
    text: postProcessText(paragraph.text),
    raw_text: paragraph.raw_text ?? paragraph.text,
    speaker_label: paragraph.speaker_label
      ? paragraph.speaker_label.replace(/THE\s+COURT\s+REPORTER/gi, 'THE REPORTER')
      : paragraph.speaker_label,
  }));
}

export function postProcessText(text: string): string {
  let processed = replaceEmDashWithDoubleHyphen(text);
  processed = processed.replace(/[\u201C\u201D\u201E]/g, '"');
  processed = processed.replace(/[\u2018\u2019\u201A]/g, "'");
  processed = normalizeTimeFormat(processed);
  processed = fixDoctorTitle(processed);
  processed = processed.replace(/THE\s+COURT\s+REPORTER/gi, 'THE REPORTER');
  processed = processed.replace(/ {3,}/g, '  ');
  processed = processed.replace(/([^.!?])  +/g, '$1 ');
  processed = normalizeSentenceSpacing(processed);
  processed = processed.replace(/\b(Dr|Mr|Ms|Mrs)\.\s{2,}/g, '$1. ');
  processed = processed.replace(/\b([ap])\.m\.\s{2,}([a-z])/gi, '$1.m. $2');
  return processed.trim();
}

export function replaceEmDashWithDoubleHyphen(text: string): string {
  return text.replace(/[\u2013\u2014\u2012—–‒]/g, '--');
}

export function normalizeTimeFormat(text: string): string {
  let processed = text.replace(
    /\b(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?|AM|PM|am|pm)\b/g,
    (_match, hourText, minuteText, suffix) => {
      const hour = Number.parseInt(hourText, 10);
      const normalizedSuffix = String(suffix).replace(/\./g, '').toLowerCase().startsWith('a') ? 'a.m.' : 'p.m.';
      return `${hour}:${minuteText} ${normalizedSuffix}`;
    }
  );

  processed = processed.replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g, (_match, hourText, minuteText) => {
    const hour = Number.parseInt(hourText, 10);
    if (hour <= 12) return `${hour}:${minuteText}`;
    return `${hour - 12}:${minuteText} p.m.`;
  });

  return processed;
}

export function fixDoctorTitle(text: string): string {
  return text.replace(/\bDoctor\s+([A-Z][a-z]+)/g, 'Dr. $1');
}

export function normalizeSentenceSpacing(text: string): string {
  return text.replace(/([.!?])\s+/g, '$1  ');
}
