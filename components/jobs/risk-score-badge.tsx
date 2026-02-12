// components/jobs/risk-score-badge.tsx
// Feature Deep Dive v2: Enhancement 1.3 - Risk Score Badge

import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, CheckCircle, Shield } from 'lucide-react';

interface RiskScoreBadgeProps {
  score: number;
  label: string;
  color: string;
  showIcon?: boolean;
  className?: string;
}

export function RiskScoreBadge({
  score,
  label,
  color,
  showIcon = true,
  className = '',
}: RiskScoreBadgeProps) {
  // Map color to Tailwind classes
  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
    orange: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
    red: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  };

  // Select icon based on color
  const Icon =
    color === 'green'
      ? CheckCircle
      : color === 'yellow'
        ? Shield
        : color === 'orange'
          ? AlertTriangle
          : AlertCircle;

  const badgeClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.green;

  return (
    <Badge
      variant="outline"
      className={`${badgeClass} ${className}`}
      title={`Risk Score: ${score}/100`}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      <span className="font-semibold">{score}</span>
      <span className="mx-1">—</span>
      <span className="text-xs">{label}</span>
    </Badge>
  );
}
