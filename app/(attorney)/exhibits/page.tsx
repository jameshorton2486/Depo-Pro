// ═══════════════════════════════════════════════════════════════
// ATTORNEY EXHIBITS DASHBOARD
// ═══════════════════════════════════════════════════════════════
// Unified view of ALL exhibits across ALL depositions in a case

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Search, Eye, Download } from 'lucide-react';
import { Exhibit, ExhibitGroup } from '@/types/exhibits';

// TODO: Replace with real data fetching
const mockExhibits: Exhibit[] = [
  {
    id: '1',
    caseId: 'case-1',
    depositionId: 'dep-1',
    uploadedByRole: 'COURT_REPORTER' as any,
    exhibitLabel: 'Exhibit 1',
    description: 'Police Report dated May 4, 2023',
    fileUrl: '/exhibits/ex1.pdf',
    fileType: 'PDF',
    mimeType: 'application/pdf',
    fileName: 'police-report.pdf',
    fileSize: 1024000,
    stamped: true,
    createdById: 'user-1',
    createdAt: '2024-12-18',
    depositionName: 'Deposition of Aaron Walker',
  },
  {
    id: '2',
    caseId: 'case-1',
    depositionId: 'dep-1',
    uploadedByRole: 'COURT_REPORTER' as any,
    exhibitLabel: 'Exhibit 2',
    description: 'Scene Photos',
    fileUrl: '/exhibits/ex2.pdf',
    fileType: 'PDF',
    mimeType: 'application/pdf',
    fileName: 'scene-photos.pdf',
    fileSize: 2048000,
    stamped: true,
    createdById: 'user-1',
    createdAt: '2024-12-18',
    depositionName: 'Deposition of Aaron Walker',
  },
  {
    id: '3',
    caseId: 'case-1',
    depositionId: 'dep-2',
    uploadedByRole: 'COURT_REPORTER' as any,
    exhibitLabel: 'Exhibit 13',
    description: 'Medical Records',
    fileUrl: '/exhibits/ex13.pdf',
    fileType: 'PDF',
    mimeType: 'application/pdf',
    fileName: 'medical-records.pdf',
    fileSize: 1536000,
    stamped: false,
    createdById: 'user-2',
    createdAt: '2024-12-15',
    depositionName: 'Deposition of Sarah Johnson',
  },
  {
    id: '4',
    caseId: 'case-1',
    depositionId: null,
    uploadedByRole: 'ATTORNEY' as any,
    exhibitLabel: 'Exhibit A',
    description: 'Email chain - Attorney upload',
    fileUrl: '/exhibits/ex-a.pdf',
    fileType: 'PDF',
    mimeType: 'application/pdf',
    fileName: 'email-chain.pdf',
    fileSize: 512000,
    stamped: false,
    createdById: 'user-3',
    createdAt: '2024-12-20',
  },
];

export default function ExhibitsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeposition, setSelectedDeposition] = useState<string>('all');
  const [selectedUploader, setSelectedUploader] = useState<string>('all');

  // Get unique depositions and uploaders
  const depositions = useMemo(() => {
    const deps = new Set<string>();
    mockExhibits.forEach((ex) => {
      if (ex.depositionId && ex.depositionName) {
        deps.add(ex.depositionId);
      }
    });
    return Array.from(deps).map((id) => {
      const ex = mockExhibits.find((e) => e.depositionId === id);
      return { id, name: ex?.depositionName || 'Unknown Deposition' };
    });
  }, []);

  // Filter exhibits
  const filteredExhibits = useMemo(() => {
    return mockExhibits.filter((ex) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesLabel = ex.exhibitLabel.toLowerCase().includes(query);
        const matchesDescription = ex.description.toLowerCase().includes(query);
        if (!matchesLabel && !matchesDescription) return false;
      }

      // Deposition filter
      if (selectedDeposition !== 'all') {
        if (ex.depositionId !== selectedDeposition) return false;
      }

      // Uploader filter
      if (selectedUploader !== 'all') {
        if (ex.uploadedByRole !== selectedUploader) return false;
      }

      return true;
    });
  }, [searchQuery, selectedDeposition, selectedUploader]);

  // Group exhibits
  const groupedExhibits = useMemo(() => {
    const groups: ExhibitGroup[] = [];

    // Group by deposition
    const depositionGroups = new Map<string, Exhibit[]>();
    const attorneyGroup: Exhibit[] = [];

    filteredExhibits.forEach((ex) => {
      if (ex.depositionId && ex.depositionName) {
        if (!depositionGroups.has(ex.depositionId)) {
          depositionGroups.set(ex.depositionId, []);
        }
        depositionGroups.get(ex.depositionId)!.push(ex);
      } else {
        attorneyGroup.push(ex);
      }
    });

    // Add deposition groups
    depositionGroups.forEach((exhibits, depId) => {
      const firstEx = exhibits[0];
      groups.push({
        id: depId,
        label: firstEx.depositionName || 'Unknown Deposition',
        exhibits,
        type: 'DEPOSITION',
      });
    });

    // Add attorney uploads group
    if (attorneyGroup.length > 0) {
      groups.push({
        id: 'attorney-uploads',
        label: 'Attorney Uploads',
        exhibits: attorneyGroup,
        type: 'ATTORNEY_UPLOADS',
      });
    }

    return groups;
  }, [filteredExhibits]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exhibits</h1>
          <p className="text-gray-600 mt-2">
            Unified view of all exhibits across all depositions
          </p>
        </div>
        {/* TODO: Phase 2 - Add upload functionality */}
        <Button disabled className="flex items-center gap-2" title="Coming in Phase 2">
          <Plus className="h-4 w-4" />
          Upload Exhibit
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search exhibits..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Deposition
              </label>
              <Select value={selectedDeposition} onValueChange={setSelectedDeposition}>
                <SelectTrigger>
                  <SelectValue placeholder="All depositions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depositions</SelectItem>
                  {depositions.map((dep) => (
                    <SelectItem key={dep.id} value={dep.id}>
                      {dep.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Uploaded By
              </label>
              <Select value={selectedUploader} onValueChange={setSelectedUploader}>
                <SelectTrigger>
                  <SelectValue placeholder="All uploaders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Uploaders</SelectItem>
                  <SelectItem value="COURT_REPORTER">Court Reporter</SelectItem>
                  <SelectItem value="ATTORNEY">Attorney</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exhibits List */}
      {filteredExhibits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No exhibits found
            </h3>
            <p className="text-sm text-gray-500 text-center max-w-md mb-4">
              {searchQuery || selectedDeposition !== 'all' || selectedUploader !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'No exhibits have been uploaded yet. Exhibits can be uploaded by court reporters during depositions or by attorneys for case-level documents.'}
            </p>
            {!(searchQuery || selectedDeposition !== 'all' || selectedUploader !== 'all') && (
              <Button disabled className="flex items-center gap-2" title="Coming in Phase 2">
                <Plus className="h-4 w-4" />
                Upload Exhibit
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedExhibits.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <CardTitle>
                  {group.label} ({group.exhibits.length} exhibit{group.exhibits.length !== 1 ? 's' : ''})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {group.exhibits.map((exhibit) => (
                    <div
                      key={exhibit.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-gray-900">
                            {exhibit.exhibitLabel}
                          </span>
                          {exhibit.stamped && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              Stamped
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {exhibit.fileType} • {(exhibit.fileSize / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{exhibit.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            Uploaded by:{' '}
                            {exhibit.uploadedByRole === 'COURT_REPORTER'
                              ? 'Court Reporter'
                              : 'Attorney'}
                          </span>
                          <span>
                            {new Date(exhibit.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button variant="outline" size="sm" disabled>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

