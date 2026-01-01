"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCardsSkeleton } from "@/components/ui/skeletons";
import { 
  Briefcase, 
  Clock, 
  FileText, 
  Users, 
  TrendingUp,
  AlertCircle,
  Calendar,
} from "lucide-react";
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

// Default metrics by role
const DEFAULT_METRICS: Record<string, MetricCard[]> = {
  REPORTER: [
    {
      title: "Active Jobs",
      value: 0,
      change: "0 this week",
      changeType: "neutral",
      icon: Briefcase,
      href: "/jobs?status=IN_PROGRESS",
    },
    {
      title: "Pending Review",
      value: 0,
      change: "Waiting for scopist",
      changeType: "neutral",
      icon: FileText,
      href: "/jobs?status=IN_REVIEW",
    },
    {
      title: "This Week",
      value: 0,
      change: "depositions scheduled",
      changeType: "neutral",
      icon: Calendar,
      href: "/calendar",
    },
    {
      title: "Completed",
      value: 0,
      change: "+0% from last month",
      changeType: "positive",
      icon: TrendingUp,
      href: "/jobs?status=COMPLETED",
    },
  ],
  SCOPIST: [
    {
      title: "Assigned Jobs",
      value: 0,
      change: "In your queue",
      changeType: "neutral",
      icon: Briefcase,
      href: "/scopist",
    },
    {
      title: "In Review",
      value: 0,
      change: "Needs attention",
      changeType: "neutral",
      icon: FileText,
      href: "/jobs?status=IN_REVIEW",
    },
    {
      title: "Average Time",
      value: "0h",
      change: "per transcript",
      changeType: "neutral",
      icon: Clock,
    },
    {
      title: "Completed",
      value: 0,
      change: "This month",
      changeType: "positive",
      icon: TrendingUp,
      href: "/jobs?status=COMPLETED",
    },
  ],
  ADMIN: [
    {
      title: "Total Jobs",
      value: 0,
      change: "All time",
      changeType: "neutral",
      icon: Briefcase,
      href: "/jobs",
    },
    {
      title: "Active Users",
      value: 0,
      change: "This month",
      changeType: "neutral",
      icon: Users,
      href: "/admin/users",
    },
    {
      title: "Pending",
      value: 0,
      change: "Requires attention",
      changeType: "negative",
      icon: AlertCircle,
      href: "/admin",
    },
    {
      title: "Revenue",
      value: "$0",
      change: "This month",
      changeType: "positive",
      icon: TrendingUp,
      href: "/billing",
    },
  ],
};

export function DashboardMetricsCards({ 
  role = "REPORTER", 
  isLoading = false,
  metrics,
}: DashboardMetricsCardsProps) {
  const displayMetrics = metrics || DEFAULT_METRICS[role] || DEFAULT_METRICS.REPORTER;

  if (isLoading) {
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

