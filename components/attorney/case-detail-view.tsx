'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Briefcase, Calendar, FileText, User, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface CaseDetailProps {
  caseData: any;
  roleInCase: string;
  annotations: any[];
}

export function CaseDetailView({ caseData, roleInCase, annotations }: CaseDetailProps) {
  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Case Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Case File</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{caseData.caseStyle}</h1>
          <p className="text-muted-foreground">Case Number: {caseData.caseNumber}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 text-sm">
            {roleInCase}
          </Badge>
          <Button>Download Case Data</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Transcripts */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Transcripts ({caseData.jobs?.length || 0})
              </CardTitle>
              <CardDescription>All depositions and hearings for this case</CardDescription>
            </CardHeader>
            <CardContent>
              {caseData.jobs?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground italic">
                  No transcripts available yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {caseData.jobs?.map((job: any) => (
                    <div key={job.id} className="flex items-center justify-between p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
                      <div>
                        <h4 className="font-medium">{job.title}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {job.depositionDate ? format(new Date(job.depositionDate), 'MMM d, yyyy') : 'No date'}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {job.deponentName || 'Unknown Deponent'}
                          </span>
                        </div>
                      </div>
                      <Link href={`/attorney/transcripts/${job.transcription?.id || job.id}`}>
                        <Button variant="outline" size="sm">Open</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Annotations ({annotations.length})
              </CardTitle>
              <CardDescription>Your latest notes and issue codes across this case</CardDescription>
            </CardHeader>
            <CardContent>
              {annotations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground italic">
                  No annotations made yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {annotations.map((note: any) => (
                    <div key={note.id} className="p-4 rounded-lg border border-amber-100 bg-amber-50/30">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                          {note.transcript?.job?.caseName || 'Annotation'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Case Info & Parties */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Case Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Court</label>
                <p className="text-sm">{caseData.courtName || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Judge</label>
                <p className="text-sm">{caseData.judgeAssigned || 'Not assigned'}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase">Jurisdiction</label>
                <p className="text-sm">{caseData.county ? `${caseData.county}, ` : ''}{caseData.state}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Parties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* This would render parties from the JSON data */}
              <div className="text-sm italic text-muted-foreground">
                Party information display coming in Phase 4.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
