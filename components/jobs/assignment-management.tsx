// ═══════════════════════════════════════════════════════════════
// ASSIGNMENT MANAGEMENT CLIENT COMPONENT
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AssignmentStatusBadge } from './assignment-status-badge';
import { AssignScopistDialog } from './assign-scopist-dialog';
import { User, JobAssignment, AssignmentStatus } from '@/types/database';
import { UserPlus, Check, X, Trash2 } from 'lucide-react';

type AssignmentWithScopist = JobAssignment & {
  scopist: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
};

interface AssignmentManagementProps {
  jobId: string;
  assignments: AssignmentWithScopist[];
  availableScopists: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>[];
  canAssign: boolean;
  currentUserId: string;
}

export function AssignmentManagement({
  jobId,
  assignments,
  availableScopists,
  canAssign,
  currentUserId,
}: AssignmentManagementProps) {
  const router = useRouter();
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [updatingAssignment, setUpdatingAssignment] = useState<string | null>(null);

  const updateAssignmentStatus = async (assignmentId: string, status: AssignmentStatus) => {
    setUpdatingAssignment(assignmentId);

    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update assignment');
      }

      router.refresh();
      toast.success('Assignment status updated');
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast.error('Failed to update assignment status');
    } finally {
      setUpdatingAssignment(null);
    }
  };

  const deleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete assignment');
      }

      router.refresh();
      toast.success('Assignment deleted');
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment');
    }
  };

  const isScopistForAssignment = (assignment: AssignmentWithScopist) => {
    return assignment.scopistId === currentUserId;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Assignments ({assignments.length})</CardTitle>
            {canAssign && (
              <Button onClick={() => setShowAssignDialog(true)} size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Scopist
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scopists assigned yet</p>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => {
                const isOwnAssignment = isScopistForAssignment(assignment);

                return (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">
                          {assignment.scopist.firstName} {assignment.scopist.lastName}
                        </p>
                        <AssignmentStatusBadge status={assignment.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">{assignment.scopist.email}</p>
                      {assignment.scopistNotes && (
                        <p className="text-sm text-muted-foreground mt-1 italic">{assignment.scopistNotes}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {/* Scopist can accept/reject pending assignments */}
                      {isOwnAssignment && assignment.status === 'INVITED' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateAssignmentStatus(assignment.id, 'ACCEPTED')}
                            disabled={updatingAssignment === assignment.id}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateAssignmentStatus(assignment.id, 'DECLINED')}
                            disabled={updatingAssignment === assignment.id}
                            className="text-red-600"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                        </>
                      )}

                      {/* Scopist can mark accepted assignments as in progress or completed */}
                      {isOwnAssignment && assignment.status === 'ACCEPTED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAssignmentStatus(assignment.id, 'IN_PROGRESS')}
                          disabled={updatingAssignment === assignment.id}
                        >
                          Start Work
                        </Button>
                      )}

                      {isOwnAssignment && assignment.status === 'IN_PROGRESS' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAssignmentStatus(assignment.id, 'SUBMITTED')}
                          disabled={updatingAssignment === assignment.id}
                        >
                          Submit Work
                        </Button>
                      )}

                      {/* Reporter/Admin can delete assignments */}
                      {canAssign && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteAssignment(assignment.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {showAssignDialog && (
        <AssignScopistDialog
          jobId={jobId}
          scopists={availableScopists}
          onClose={() => setShowAssignDialog(false)}
        />
      )}
    </>
  );
}
