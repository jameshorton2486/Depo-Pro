// components/jobs/risk-overview-widget.tsx
// Feature Deep Dive Enhancement 4A: Dashboard Risk Overview Widget

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { RiskOverview } from '@/types/analytics';

interface RiskOverviewWidgetProps {
  overview: RiskOverview;
}

export function RiskOverviewWidget({ overview }: RiskOverviewWidgetProps) {
  const TrendIcon = overview.trend === 'up' ? TrendingUp : overview.trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    overview.trend === 'up'
      ? 'text-green-600 dark:text-green-400'
      : overview.trend === 'down'
        ? 'text-red-600 dark:text-red-400'
        : 'text-gray-600 dark:text-gray-400';

  const confidenceChange = overview.avg_confidence_this_week - overview.avg_confidence_last_week;
  const confidenceChangePercent = (confidenceChange * 100).toFixed(1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Transcription Quality Overview
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {overview.total_jobs} jobs with analytics
            </CardDescription>
          </div>
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span className="text-xs font-semibold">
              {confidenceChangePercent > '0' ? '+' : ''}
              {confidenceChangePercent}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Distribution */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Risk Distribution</span>
          </div>

          {/* High Risk */}
          <div className="flex items-center gap-2">
            <div className="w-16 text-xs text-muted-foreground">High</div>
            <div className="flex-1">
              <Progress
                value={overview.high_risk_percentage}
                className="h-2 bg-red-100 dark:bg-red-900/20"
                indicatorClassName="bg-red-500"
              />
            </div>
            <div className="w-16 text-right text-xs font-semibold text-red-600 dark:text-red-400">
              {overview.high_risk_count} ({overview.high_risk_percentage.toFixed(0)}%)
            </div>
          </div>

          {/* Medium Risk */}
          <div className="flex items-center gap-2">
            <div className="w-16 text-xs text-muted-foreground">Medium</div>
            <div className="flex-1">
              <Progress
                value={overview.medium_risk_percentage}
                className="h-2 bg-orange-100 dark:bg-orange-900/20"
                indicatorClassName="bg-orange-500"
              />
            </div>
            <div className="w-16 text-right text-xs font-semibold text-orange-600 dark:text-orange-400">
              {overview.medium_risk_count} ({overview.medium_risk_percentage.toFixed(0)}%)
            </div>
          </div>

          {/* Low Risk */}
          <div className="flex items-center gap-2">
            <div className="w-16 text-xs text-muted-foreground">Low</div>
            <div className="flex-1">
              <Progress
                value={overview.low_risk_percentage}
                className="h-2 bg-green-100 dark:bg-green-900/20"
                indicatorClassName="bg-green-500"
              />
            </div>
            <div className="w-16 text-right text-xs font-semibold text-green-600 dark:text-green-400">
              {overview.low_risk_count} ({overview.low_risk_percentage.toFixed(0)}%)
            </div>
          </div>
        </div>

        {/* Average Confidence */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Avg Confidence</span>
            <div className="text-right">
              <div className="text-lg font-bold">
                {(overview.avg_confidence_this_week * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">
                Last week: {(overview.avg_confidence_last_week * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Calculate risk overview from jobs data
 * Enhancement 4A: Dashboard-level intelligence
 */
export function calculateRiskOverview(jobs: Array<{
  riskScore?: { priority: number };
  confidenceAnalytics?: { avg_confidence: number };
  updatedAt: string;
}>): RiskOverview {
  const total = jobs.length;

  // Risk distribution
  const highRisk = jobs.filter((j) => j.riskScore?.priority === 4 || j.riskScore?.priority === 3);
  const mediumRisk = jobs.filter((j) => j.riskScore?.priority === 2);
  const lowRisk = jobs.filter((j) => j.riskScore?.priority === 1 || !j.riskScore);

  // Weekly confidence trends
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeekJobs = jobs.filter((j) => new Date(j.updatedAt) >= oneWeekAgo);
  const lastWeekJobs = jobs.filter(
    (j) => new Date(j.updatedAt) >= twoWeeksAgo && new Date(j.updatedAt) < oneWeekAgo
  );

  const avgThisWeek =
    thisWeekJobs.length > 0
      ? thisWeekJobs.reduce((sum, j) => sum + (j.confidenceAnalytics?.avg_confidence || 0), 0) /
        thisWeekJobs.length
      : 0;

  const avgLastWeek =
    lastWeekJobs.length > 0
      ? lastWeekJobs.reduce((sum, j) => sum + (j.confidenceAnalytics?.avg_confidence || 0), 0) /
        lastWeekJobs.length
      : 0;

  const trend = avgThisWeek > avgLastWeek + 0.02 ? 'up' : avgThisWeek < avgLastWeek - 0.02 ? 'down' : 'stable';

  return {
    total_jobs: total,
    high_risk_count: highRisk.length,
    high_risk_percentage: total > 0 ? (highRisk.length / total) * 100 : 0,
    medium_risk_count: mediumRisk.length,
    medium_risk_percentage: total > 0 ? (mediumRisk.length / total) * 100 : 0,
    low_risk_count: lowRisk.length,
    low_risk_percentage: total > 0 ? (lowRisk.length / total) * 100 : 0,
    avg_confidence_this_week: avgThisWeek,
    avg_confidence_last_week: avgLastWeek,
    trend,
  };
}
