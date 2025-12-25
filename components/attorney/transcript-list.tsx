'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, Download, FileText, Search } from 'lucide-react';

interface TranscriptShareWithDetails {
  id: string;
  accessLevel: 'VIEW' | 'COMMENT' | 'EDIT';
  expiresAt: Date | null;
  transcript: {
    id: string;
    job: {
      id: string;
      caseName: string;
      caseNumber: string | null;
      depositionDate: Date | null;
      witnessName: string | null;
    };
  };
  sharedBy: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  createdAt: Date;
}

interface Props {
  transcripts: TranscriptShareWithDetails[];
}

export function TranscriptList({ transcripts }: Props) {
  const [search, setSearch] = useState('');
  const [accessFilter, setAccessFilter] = useState<string>('all');

  const filtered = transcripts.filter((t) => {
    const matchesSearch = 
      t.transcript.job.caseName.toLowerCase().includes(search.toLowerCase()) ||
      t.transcript.job.witnessName?.toLowerCase().includes(search.toLowerCase());
    const matchesAccess = accessFilter === 'all' || t.accessLevel === accessFilter;
    return matchesSearch && matchesAccess;
  });

  const accessLevelBadge = (level: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      VIEW: 'outline',
      COMMENT: 'secondary',
      EDIT: 'default',
    };
    return <Badge variant={variants[level] || 'outline'}>{level}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by case or witness..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={accessFilter} onValueChange={setAccessFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Access Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="VIEW">View Only</SelectItem>
            <SelectItem value="COMMENT">Comment</SelectItem>
            <SelectItem value="EDIT">Edit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="mx-auto h-12 w-12 mb-4" />
          <p>No transcripts found</p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y bg-white">
          {filtered.map((share) => (
            <div key={share.id} className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium">{share.transcript.job.caseName}</h3>
                <p className="text-sm text-muted-foreground">
                  {share.transcript.job.witnessName && `Witness: ${share.transcript.job.witnessName}`}
                  {share.transcript.job.depositionDate && 
                    ` • ${format(new Date(share.transcript.job.depositionDate), 'MMM d, yyyy')}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Shared by {share.sharedBy.firstName ? `${share.sharedBy.firstName} ${share.sharedBy.lastName}` : share.sharedBy.email}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {accessLevelBadge(share.accessLevel)}
                <Link href={`/attorney/transcripts/${share.transcript.id}`}>
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </Link>
                {share.accessLevel !== 'VIEW' && (
                  <Button size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

