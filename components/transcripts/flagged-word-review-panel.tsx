'use client';

import { LowConfidencePanel } from '@/components/transcripts/low-confidence-panel';
import type { ComponentProps } from 'react';

type FlaggedWordReviewPanelProps = ComponentProps<typeof LowConfidencePanel>;

export function FlaggedWordReviewPanel(props: FlaggedWordReviewPanelProps) {
  return <LowConfidencePanel {...props} />;
}
