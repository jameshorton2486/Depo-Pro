import Link from "next/link";
import { FileAudio, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  className?: string;
}

export function EmptyJobList({ className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
        <FileAudio className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">No jobs yet</h3>
      <p className="mt-1 text-sm text-slate-500">Create your first job to get started.</p>
      <Button asChild className="mt-4">
        <Link href="/jobs/new">Create Job</Link>
      </Button>
    </div>
  );
}

export function EmptyTranscripts({ className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
        <FileText className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">No transcripts</h3>
      <p className="mt-1 text-sm text-slate-500">
        Completed transcripts will appear here.
      </p>
    </div>
  );
}
