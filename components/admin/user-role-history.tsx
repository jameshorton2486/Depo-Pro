'use client';

// =============================================================================
// USER ROLE HISTORY
// components/admin/user-role-history.tsx
//
// Phase 3D-2: Timeline view of role changes
// =============================================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface RoleChange {
  id: string;
  action: string;
  actorUserId: string;
  actor: {
    firstName: string;
    lastName: string;
  };
  metadata: {
    previousRole?: string;
    newRole?: string;
    reason?: string;
  };
  createdAt: string;
}

interface UserRoleHistoryProps {
  userId: string;
}

export function UserRoleHistory({ userId }: UserRoleHistoryProps) {
  const [changes, setChanges] = useState<RoleChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoleHistory();
  }, [userId]);

  const fetchRoleHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}/role-history`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setChanges(data.changes || []);
    } catch (error) {
      console.error('Error fetching role history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No role changes recorded
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-5 w-5" />
          Role Change History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {changes.map((change) => (
            <div
              key={change.id}
              className="flex items-start gap-3 p-3 border rounded-md"
            >
              <Clock className="h-4 w-4 text-muted-foreground mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">
                    {change.actor.firstName} {change.actor.lastName}
                  </span>
                  {change.metadata.previousRole && change.metadata.newRole && (
                    <>
                      <Badge variant="outline">{change.metadata.previousRole}</Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge variant="default">{change.metadata.newRole}</Badge>
                    </>
                  )}
                </div>
                {change.metadata.reason && (
                  <div className="text-sm text-muted-foreground mb-1">
                    Reason: {change.metadata.reason}
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  {format(new Date(change.createdAt), 'MMM d, yyyy h:mm a')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
