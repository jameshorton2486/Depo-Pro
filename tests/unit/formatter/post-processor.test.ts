import { describe, expect, it } from 'vitest';
import { postProcessText } from '@/lib/transcription/formatter/post-processor';

describe('postProcessText', () => {
  it('replaces em dash U+2014 with double hyphen', () => {
    expect(postProcessText('interrupted—then stopped')).toBe('interrupted--then stopped');
  });

  it('replaces en dash U+2013 with double hyphen', () => {
    expect(postProcessText('pages 10–20')).toBe('pages 10--20');
  });

  it('normalizes reporter label and time format', () => {
    expect(postProcessText('THE COURT REPORTER: at 2:12 PM today')).toBe('THE REPORTER: at 2:12 p.m. today');
  });

  it('fixes doctor title', () => {
    expect(postProcessText('Doctor Smith testified.')).toBe('Dr. Smith testified.');
  });

  it('preserves verbatim profanity and grammar', () => {
    expect(postProcessText('holy shit we was there')).toBe('holy shit we was there');
  });
});
