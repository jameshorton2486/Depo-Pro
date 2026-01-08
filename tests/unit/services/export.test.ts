import { describe, it, expect } from 'vitest';

// Mock export functions for testing
interface TranscriptLine {
  lineNumber: number;
  speaker?: string;
  text: string;
  timestamp?: number;
}

interface CaseInfo {
  caseName: string;
  caseNumber: string;
  deponentName: string;
  depositionDate: string;
  reporterName: string;
  firmName: string;
}

interface ExportOptions {
  includeLineNumbers?: boolean;
  includeSpeakerLabels?: boolean;
}

function generateTxt(
  lines: TranscriptLine[],
  caseInfo: CaseInfo,
  options: ExportOptions = {}
): string {
  const output: string[] = [];
  const LINE_WIDTH = 80;

  // Header
  output.push('='.repeat(LINE_WIDTH));
  output.push(centerText('DEPOSITION TRANSCRIPT', LINE_WIDTH));
  output.push('='.repeat(LINE_WIDTH));
  output.push('');
  output.push(centerText(caseInfo.caseName, LINE_WIDTH));
  output.push(centerText(`Case No. ${caseInfo.caseNumber}`, LINE_WIDTH));
  output.push('');
  output.push(centerText('DEPOSITION OF', LINE_WIDTH));
  output.push(centerText(caseInfo.deponentName, LINE_WIDTH));
  output.push('');
  output.push(centerText(caseInfo.depositionDate, LINE_WIDTH));
  output.push('');
  output.push('='.repeat(LINE_WIDTH));
  output.push('');

  // Transcript lines
  for (const line of lines) {
    let lineText = '';
    
    if (options.includeLineNumbers) {
      lineText += line.lineNumber.toString().padStart(4, ' ') + '  ';
    }
    
    if (options.includeSpeakerLabels && line.speaker) {
      lineText += `${line.speaker} `;
    }
    
    lineText += line.text;
    
    output.push(lineText);
  }

  // Footer
  output.push('');
  output.push('='.repeat(LINE_WIDTH));
  output.push(centerText('END OF TRANSCRIPT', LINE_WIDTH));
  output.push('='.repeat(LINE_WIDTH));

  return output.join('\n');
}

function centerText(text: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

describe('Export Service', () => {
  const mockCaseInfo: CaseInfo = {
    caseName: 'Smith v. Jones',
    caseNumber: '2024-CV-12345',
    deponentName: 'John Smith',
    depositionDate: 'January 15, 2026',
    reporterName: 'Jane Reporter',
    firmName: 'Legal Transcription Services',
  };

  const mockLines: TranscriptLine[] = [
    { lineNumber: 1, speaker: 'Q.', text: 'Please state your name.' },
    { lineNumber: 2, speaker: 'A.', text: 'John Smith.' },
    { lineNumber: 3, speaker: 'Q.', text: 'What is your occupation?' },
    { lineNumber: 4, speaker: 'A.', text: 'I am a software engineer.' },
  ];

  describe('generateTxt', () => {
    it('should generate proper ASCII format', () => {
      const output = generateTxt(mockLines, mockCaseInfo, { 
        includeLineNumbers: true,
        includeSpeakerLabels: true 
      });

      expect(output).toContain('DEPOSITION TRANSCRIPT');
      expect(output).toContain('Smith v. Jones');
      expect(output).toContain('John Smith');
      expect(output).toContain('Q. Please state your name.');
    });

    it('should include line numbers when requested', () => {
      const output = generateTxt(mockLines, mockCaseInfo, { 
        includeLineNumbers: true 
      });

      expect(output).toMatch(/\d+.*Please state your name/);
    });

    it('should omit line numbers when not requested', () => {
      const output = generateTxt(mockLines, mockCaseInfo, { 
        includeLineNumbers: false 
      });

      expect(output).not.toMatch(/^\s*1\s+Q\./m);
    });
  });
});
