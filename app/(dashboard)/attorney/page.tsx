// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3.2.2: ATTORNEY DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════════════════════
// File: app/(dashboard)/attorney/page.tsx
// Main dashboard for attorney users
// ═══════════════════════════════════════════════════════════════════════════════

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Briefcase,
  FileText,
  Calendar,
  Clock,
  ArrowRight,
  User,
  Highlighter,
  Eye,
  Download,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Types
interface DashboardStats {
  totalCases: number;
  activeCases: number;
  accessibleTranscripts: number;
  upcomingDepositions: number;
  annotations: {
    highlights: number;
    notes: number;
    bookmarks: number;
    total: number;
  };
}

interface CaseItem {
  id: string;
  caseNumber: string;
  caseStyle: string;
  shortTitle?: string;
  status: string;
  courtName?: string;
  firm?: { id: string; name: string };
  role: string;
  recentJobs: Array<{
    id: string;
    caseName: string;
    depositionDate: string;
    status: string;
    deponentName?: string;
  }>;
  jobCount: number;
}

interface TranscriptItem {
  id: string;
  accessLevel: string;
  grantedAt: string;
  grantedBy: { id: string; firstName: string; lastName: string };
  lastAccessed?: string;
  accessCount: number;
  job: {
    id: string;
    caseName: string;
    caseNumber?: string;
    depositionDate: string;
    deponentName?: string;
    status: string;
    case?: { id: string; caseNumber: string; caseStyle: string };
  };
  expiresAt?: string;
}

interface DepositionItem {
  id: string;
  title: string;
  eventType: string;
  startTime: string;
  endTime: string;
  location?: { name: string; address?: string };
  isRemote: boolean;
  meetingLink?: string;
  job?: {
    id: string;
    caseName: string;
    caseNumber?: string;
    deponentName?: string;
  };
  reporter?: { id: string; firstName: string; lastName: string; email: string };
  status: string;
}

interface DashboardData {
  stats: DashboardStats;
  cases: CaseItem[];
  recentTranscripts: TranscriptItem[];
  upcomingDepositions: DepositionItem[];
  recentActivity: any[];
  profile: any;
}

export default function AttorneyDashboardPage() {
  const { user, profile, isLoading } = useAuth();
  const session = user && profile ? { user: { id: user.id, email: user.email || '', role: profile.role, name: profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : profile.first_name || profile.last_name || null } } : null;
  const status = isLoading ? 'loading' : session ? 'authenticated' : 'unauthenticated';
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchDashboardData();
    }
  }, [status, router]);

  // Check if profile is complete, redirect to onboarding if not
  useEffect(() => {
    if (data && !data.profile?.barNumber) {
      router.push('/attorney/onboarding');
    }
  }, [data, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/attorney/dashboard');

      if (!response.ok) {
        if (response.status === 403) {
          router.push('/dashboard');
          return;
        }
        throw new Error('Failed to load dashboard');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="font-semibold text-lg mb-2">Error Loading Dashboard</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchDashboardData}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attorney Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {session?.user?.name || 'Attorney'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/attorney/cases">View All Cases</Link>
          </Button>
          <Button asChild>
            <Link href="/attorney/transcripts">Browse Transcripts</Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Cases"
          value={data.stats.activeCases}
          subtitle={`${data.stats.totalCases} total cases`}
          icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
        />
        <StatsCard
          title="Transcripts"
          value={data.stats.accessibleTranscripts}
          subtitle="Available to view"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
        />
        <StatsCard
          title="Upcoming"
          value={data.stats.upcomingDepositions}
          subtitle="Scheduled depositions"
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
        />
        <StatsCard
          title="Annotations"
          value={data.stats.annotations.total}
          subtitle={`${data.stats.annotations.highlights} highlights, ${data.stats.annotations.notes} notes`}
          icon={<Highlighter className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Cases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Cases</CardTitle>
              <CardDescription>Your active cases</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/attorney/cases">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.cases.length === 0 ? (
              <EmptyState
                icon={<Briefcase className="h-8 w-8" />}
                title="No cases yet"
                description="You'll see cases here once you're added to one"
              />
            ) : (
              <div className="space-y-4">
                {data.cases.slice(0, 5).map((caseItem) => (
                  <CaseCard key={caseItem.id} caseItem={caseItem} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Depositions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Depositions</CardTitle>
              <CardDescription>Scheduled proceedings</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/calendar">
                View Calendar <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.upcomingDepositions.length === 0 ? (
              <EmptyState
                icon={<Calendar className="h-8 w-8" />}
                title="No upcoming depositions"
                description="Scheduled depositions will appear here"
              />
            ) : (
              <div className="space-y-4">
                {data.upcomingDepositions.slice(0, 5).map((depo) => (
                  <DepositionCard key={depo.id} deposition={depo} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transcripts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transcripts</CardTitle>
            <CardDescription>Transcripts you have access to</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/attorney/transcripts">
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {data.recentTranscripts.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="No transcripts available"
              description="Transcripts will appear here once shared with you"
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.recentTranscripts.map((transcript) => (
                <TranscriptCard key={transcript.id} transcript={transcript} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Sub-components

function StatsCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function CaseCard({ caseItem }: { caseItem: CaseItem }) {
  return (
    <Link href={`/attorney/cases/${caseItem.id}`}>
      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Briefcase className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm line-clamp-1">
              {caseItem.shortTitle || caseItem.caseStyle}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{caseItem.caseNumber}</span>
              {caseItem.courtName && (
                <>
                  <span>•</span>
                  <span>{caseItem.courtName}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={caseItem.status === 'ACTIVE' ? 'default' : 'secondary'}>
            {caseItem.status}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {caseItem.jobCount} jobs
          </span>
        </div>
      </div>
    </Link>
  );
}

function DepositionCard({ deposition }: { deposition: DepositionItem }) {
  const startDate = new Date(deposition.startTime);
  const isToday = format(startDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isToday ? 'bg-orange-500/10' : 'bg-primary/10'}`}>
          <Calendar className={`h-4 w-4 ${isToday ? 'text-orange-500' : 'text-primary'}`} />
        </div>
        <div>
          <p className="font-medium text-sm line-clamp-1">{deposition.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {isToday ? 'Today' : format(startDate, 'MMM d')} at{' '}
              {format(startDate, 'h:mm a')}
            </span>
            {deposition.isRemote && (
              <>
                <span>•</span>
                <span>Remote</span>
              </>
            )}
          </div>
        </div>
      </div>
      <Badge variant="outline">{deposition.eventType}</Badge>
    </div>
  );
}

function TranscriptCard({ transcript }: { transcript: TranscriptItem }) {
  const accessIcons = {
    VIEW: <Eye className="h-3 w-3" />,
    COMMENT: <Download className="h-3 w-3" />,
    EDIT: <Highlighter className="h-3 w-3" />,
  };

  return (
    <Link href={`/attorney/transcripts/${transcript.id}`}>
      <div className="p-4 rounded-lg border hover:bg-accent transition-colors h-full">
        <div className="flex items-start justify-between mb-2">
          <FileText className="h-5 w-5 text-primary" />
          <Badge variant="outline" className="text-xs">
            {accessIcons[transcript.accessLevel as keyof typeof accessIcons]}
            <span className="ml-1">{transcript.accessLevel.replace('_', ' ')}</span>
          </Badge>
        </div>
        <h4 className="font-medium text-sm line-clamp-2 mb-1">
          {transcript.job.caseName}
        </h4>
        {transcript.job.deponentName && (
          <p className="text-xs text-muted-foreground mb-2">
            <User className="h-3 w-3 inline mr-1" />
            {transcript.job.deponentName}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{format(new Date(transcript.job.depositionDate), 'MMM d, yyyy')}</span>
          {transcript.lastAccessed && (
            <span>Viewed {formatDistanceToNow(new Date(transcript.lastAccessed))} ago</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="p-3 rounded-full bg-muted mb-3">{icon}</div>
      <h4 className="font-medium mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(3)].map((_, j) => (
                  <Skeleton key={j} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
