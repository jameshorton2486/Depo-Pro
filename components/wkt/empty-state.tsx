// WKT empty states

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, FileText, HelpCircle } from 'lucide-react';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center gap-4 p-6 text-center">
      <div className="rounded-full bg-muted p-3">{icon}</div>
      <div className="space-y-1">
        <p className="text-lg font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <Button onClick={onAction}>{actionLabel}</Button>
      ) : null}
    </Card>
  );
}

export function NoQuestionsFound({
  onAction,
}: {
  onAction?: () => void;
}) {
  return (
    <EmptyState
      icon={<HelpCircle className="h-5 w-5 text-muted-foreground" />}
      title="No questions available"
      description="Try adjusting your filters or check back later."
      actionLabel={onAction ? 'Reset Filters' : undefined}
      onAction={onAction}
    />
  );
}

export function NoExamsYet({
  onAction,
}: {
  onAction?: () => void;
}) {
  return (
    <EmptyState
      icon={<FileText className="h-5 w-5 text-muted-foreground" />}
      title="No mock exams yet"
      description="Take your first mock exam to track progress."
      actionLabel={onAction ? 'Start Mock Exam' : undefined}
      onAction={onAction}
    />
  );
}

export function AllCaughtUp({
  onAction,
}: {
  onAction?: () => void;
}) {
  return (
    <EmptyState
      icon={<CheckCircle2 className="h-5 w-5 text-muted-foreground" />}
      title="All caught up"
      description="You're up to date. Come back for more practice."
      actionLabel={onAction ? 'Go to Dashboard' : undefined}
      onAction={onAction}
    />
  );
}
