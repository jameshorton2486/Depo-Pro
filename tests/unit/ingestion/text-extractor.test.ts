import { describe, expect, it } from 'vitest';
import { extractText } from '@/lib/ingestion/text-extractor';

describe('text-extractor', () => {
  it('extracts text from a plain TXT buffer', async () => {
    const buffer = Buffer.from('This is a test deposition notice.');
    const result = await extractText(buffer, 'text/plain', 'test.txt');
    expect(result.text).toContain('deposition notice');
    expect(result.extractionMethod).toBe('plain-text');
    expect(result.error).toBeUndefined();
  });

  it('returns error gracefully for empty buffer', async () => {
    const result = await extractText(Buffer.alloc(0), 'text/plain', 'empty.txt');
    expect(result.text).toBe('');
  });

  it('strips RTF control words from RTF content', async () => {
    const rtf = Buffer.from('{\\rtf1\\ansi Hello World\\par }');
    const result = await extractText(rtf, 'application/rtf', 'test.rtf');
    expect(result.text).toContain('Hello World');
    expect(result.text).not.toContain('\\rtf1');
  });

  it('returns error gracefully for unsupported mime type', async () => {
    const result = await extractText(Buffer.from('noop'), 'application/zip', 'test.zip');
    expect(result.error).toContain('Unsupported');
  });
});
