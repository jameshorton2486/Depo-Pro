"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCardsSkeleton } from "@/components/ui/skeletons";
import { Briefcase, Clock, Users, TrendingUp, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCard {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}

interface DashboardMetricsCardsProps {
  role?: "REPORTER" | "SCOPIST" | "ADMIN" | "AGENCY" | "ATTORNEY";
  isLoading?: boolean;
  metrics?: MetricCard[];
}

interface DashboardStats {
  totalJobs: number;
  pendingTranscription: number;
  withScopist: number;
  completedThisMonth: number;
  inReview: number;
}

const EMPTY_STATS: DashboardStats = {
  totalJobs: 0,
  pendingTranscription: 0,
  withScopist: 0,
  completedThisMonth: 0,
  inReview: 0,
};

const buildMetrics = (stats: DashboardStats): MetricCard[] => [
  {
    title: "Total Jobs",
    value: stats.totalJobs,
    change: "All time",
    changeType: "neutral",
    icon: Briefcase,
    href: "/jobs",
  },
  {
    title: "Pending Transcription",
    value: stats.pendingTranscription,
    change: "Awaiting AI output",
    changeType: "neutral",
    icon: Clock,
    href: "/jobs?status=TRANSCRIBING",
  },
  {
    title: "With Scopist",
    value: stats.withScopist,
    change: "In editing",
    changeType: "neutral",
    icon: Users,
    href: "/jobs?status=IN_EDIT",
  },
  {
    title: "In Review",
    value: stats.inReview,
    change: "Reporter review",
    changeType: "neutral",
    icon: FileText,
    href: "/jobs?status=IN_REVIEW",
  },
  {
    title: "Completed This Month",
    value: stats.completedThisMonth,
    change: "This month",
    changeType: "positive",
    icon: TrendingUp,
    href: "/jobs?status=COMPLETED",
  },
];

export function DashboardMetricsCards({ 
  isLoading = false,
  metrics,
}: DashboardMetricsCardsProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (metrics) return;
    let isMounted = true;

    const fetchStats = async () => {
      setIsFetching(true);
      try {
        const response = await fetch("/api/dashboard/stats");
        if (!response.ok) throw new Error("Failed to fetch dashboard stats");
        const data = (await response.json()) as DashboardStats;
        if (isMounted) {
          setStats(data);
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        if (isMounted) {
          setStats(EMPTY_STATS);
        }
      } finally {
        if (isMounted) {
          setIsFetching(false);
        }
      }
    };

    fetchStats();
    return () => {
      isMounted = false;
    };
  }, [metrics]);

  const displayMetrics = useMemo(() => {
    if (metrics) return metrics;
    return buildMetrics(stats || EMPTY_STATS);
  }, [metrics, stats]);

  if (isLoading || isFetching) {
    return <StatCardsSkeleton />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {displayMetrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card 
            key={index} 
            className={cn(
              "hover:shadow-md transition-shadow",
              metric.href && "cursor-pointer"
            )}
            onClick={() => {
              if (metric.href && typeof window !== "undefined") {
                window.location.href = metric.href;
              }
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              {metric.change && (
                <p 
                  className={cn(
                    "text-xs mt-1",
                    metric.changeType === "positive" && "text-green-600 dark:text-green-400",
                    metric.changeType === "negative" && "text-red-600 dark:text-red-400",
                    metric.changeType === "neutral" && "text-muted-foreground"
                  )}
                >
                  {metric.change}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
