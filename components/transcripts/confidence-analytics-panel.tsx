'use client';

// components/transcripts/confidence-analytics-panel.tsx
// Feature Deep Dive v2: Enhancement 1.2 - Confidence Analytics Panel

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RiskScoreBadge } from '@/components/jobs/risk-score-badge';
import type { ConfidenceAnalytics, RiskScoreResult } from '@/types/analytics';
import { AlertCircle, TrendingUp, Users, FileText } from 'lucide-react';

interface ConfidenceAnalyticsPanelProps {
  analytics?: ConfidenceAnalytics;
  riskScore?: RiskScoreResult;
}

export function ConfidenceAnalyticsPanel({ analytics, riskScore }: ConfidenceAnalyticsPanelProps) {
  if (!analytics) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-sm">No analytics data available yet.</p>
          <p className="text-xs mt-2">Analytics will be computed after transcription completes.</p>
        </div>
      </div>
    );
  }

  const speakerEntries = Object.entries(analytics.speaker_confidence);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Risk Score Card */}
      {riskScore && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Review Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{riskScore.score}/100</div>
                <p className="text-xs text-muted-foreground mt-1">Risk Score</p>
              </div>
              <RiskScoreBadge
                score={riskScore.score}
                label={riskScore.label}
                color={riskScore.color}
                showIcon={true}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Metrics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Transcript Quality
          </CardTitle>
          <CardDescription className="text-xs">
            {analytics.total_words.toLocaleString()} total words
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Average Confidence */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">Average Confidence</span>
              <span className="text-xs font-bold">{(analytics.avg_confidence * 100).toFixed(1)}%</span>
            </div>
            <Progress value={analytics.avg_confidence * 100} className="h-2" />
          </div>

          {/* Flagged Words */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">Flagged Words</span>
              <span className="text-xs font-bold">
                {analytics.flagged_count} ({analytics.flagged_percentage.toFixed(1)}%)
              </span>
            </div>
            <Progress
              value={analytics.flagged_percentage}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Flagged Word Categories
          </CardTitle>
          <CardDescription className="text-xs">
            Distribution of corrections by type
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CategoryBar
            label="Medical Terms"
            percentage={analytics.category_breakdown.medical}
            color="bg-blue-500"
          />
          <CategoryBar
            label="Names & Places"
            percentage={analytics.category_breakdown.proper_nouns}
            color="bg-purple-500"
          />
          <CategoryBar
            label="Numbers & Dates"
            percentage={analytics.category_breakdown.numbers_dates}
            color="bg-orange-500"
          />
          <CategoryBar
            label="General Words"
            percentage={analytics.category_breakdown.general}
            color="bg-gray-500"
          />
        </CardContent>
      </Card>

      {/* Speaker Confidence */}
      {speakerEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Speaker Confidence
            </CardTitle>
            <CardDescription className="text-xs">
              Average confidence by speaker
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {speakerEntries.map(([speaker, confidence]) => (
              <div key={speaker}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">{speaker}</span>
                  <span className="text-xs font-bold">{(confidence * 100).toFixed(1)}%</span>
                </div>
                <Progress value={confidence * 100} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CategoryBar({ label, percentage, color }: { label: string; percentage: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold">{percentage}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
