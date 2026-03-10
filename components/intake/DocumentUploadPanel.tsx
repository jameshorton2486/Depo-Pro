'use client';

import type { DepositionExtractionResult } from '@/lib/ingestion/types';
import { IntakeUploadStep } from './IntakeUploadStep';

interface DocumentUploadPanelProps {
  jobId?: string;
  onExtractionComplete: (data: DepositionExtractionResult) => void;
  onError?: (error: string) => void;
}

export function DocumentUploadPanel({ onExtractionComplete }: DocumentUploadPanelProps) {
  return <IntakeUploadStep onParsed={(data) => onExtractionComplete(data)} />;
}
