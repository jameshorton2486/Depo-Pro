'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, UserCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { canAssignReporterClient } from '@/lib/rbac-client';

interface Reporter {
  id: string;
  name: string;
  email: string;
}

interface AssignReporterDropdownProps {
  jobId: string;
  firmId: string | null;
  agencyId?: string | null;
  currentReporterId?: string | null;
  currentReporterName?: string | null;
  userRole?: string;
  onAssignmentChange?: (reporterId: string | null) => void;
}

export function AssignReporterDropdown({
  jobId,
  firmId,
  agencyId,
  currentReporterId,
  currentReporterName,
  userRole,
  onAssignmentChange,
}: AssignReporterDropdownProps) {
  const [reporters, setReporters] = useState<Reporter[]>([]);
  const [selectedReporterId, setSelectedReporterId] = useState<string>(
    currentReporterId || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Check permission
  const hasPermission = canAssignReporterClient(userRole);

  // Fetch available reporters
  useEffect(() => {
    const fetchReporters = async () => {
      try {
        const params = new URLSearchParams();
        if (firmId) params.set('firmId', firmId);
        if (agencyId) params.set('agencyId', agencyId);

        const response = await fetch(`/api/reporters?${params}`);
        const data = await response.json();

        if (response.ok) {
          setReporters(data.reporters || []);
        }
      } catch (error) {
        console.error('Failed to fetch reporters:', error);
        toast.error('Failed to load reporters');
      } finally {
        setIsFetching(false);
      }
    };

    if (hasPermission) {
      fetchReporters();
    } else {
      setIsFetching(false);
    }
  }, [firmId, agencyId, hasPermission]);

  if (!hasPermission) {
    // Show read-only view for users without permission
    return currentReporterName ? (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <UserCheck className="h-4 w-4" />
        <span>Assigned: {currentReporterName}</span>
      </div>
    ) : (
      <div className="text-sm text-muted-foreground">No reporter assigned</div>
    );
  }

  const handleAssign = async (reporterId: string) => {
    if (reporterId === currentReporterId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/assign-reporter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reporterId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to assign reporter');
      }

      setSelectedReporterId(reporterId);
      toast.success('Reporter assigned successfully');
      onAssignmentChange?.(reporterId);

    } catch (error) {
      console.error('Assignment error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to assign reporter');
      setSelectedReporterId(currentReporterId || '');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassign = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/assign-reporter`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to unassign reporter');
      }

      setSelectedReporterId('');
      toast.success('Reporter unassigned');
      onAssignmentChange?.(null);

    } catch (error) {
      console.error('Unassign error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to unassign reporter');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading reporters...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedReporterId}
        onValueChange={handleAssign}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Assign a reporter..." />
        </SelectTrigger>
        <SelectContent>
          {reporters.map((reporter) => (
            <SelectItem key={reporter.id} value={reporter.id}>
              {reporter.name || reporter.email}
            </SelectItem>
          ))}
          {reporters.length === 0 && (
            <SelectItem value="" disabled>
              No reporters available
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {selectedReporterId && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleUnassign}
          disabled={isLoading}
          title="Unassign reporter"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}

