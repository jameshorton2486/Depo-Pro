'use client';

// =============================================================================
// ADMIN ACTION CONSOLE
// components/admin/action-console.tsx
//
// Phase 4D-1: Single view of all sensitive admin actions
// =============================================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Filter, User, FileText, Lock, Shield } from 'lucide-react';
import { format } from 'date-fns';

interface ActionLogEntry {
  id: string;
  action: string;
  performedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  target: {
    type: string;
    id: string;
    name: string;
  };
  timestamp: string;
  metadata: Record<string, unknown>;
  reason?: string;
}

const ACTION_ICONS: Record<string, typeof FileText> = {
  TRANSCRIPT_UNLOCKED: Lock,
  USER_ROLE_CHANGED: User,
  USER_SUSPENDED: User,
  USER_REACTIVATED: User,
  TRANSCRIPT_EXPORTED: FileText,
  SYSTEM_CONFIG_CHANGED: Shield,
};

export function ActionConsole() {
  const [actions, setActions] = useState<ActionLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7d');

  useEffect(() => {
    fetchActions();
  }, [actionFilter, dateRange]);

  const fetchActions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/actions?filter=${actionFilter}&range=${dateRange}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setActions(data.actions || []);
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActions = actions.filter(action => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        action.action.toLowerCase().includes(query) ||
        action.performedBy.firstName.toLowerCase().includes(query) ||
        action.performedBy.lastName.toLowerCase().includes(query) ||
        action.target.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getActionIcon = (action: string) => {
    const Icon = ACTION_ICONS[action] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="TRANSCRIPT_UNLOCKED">Unlock Transcript</SelectItem>
            <SelectItem value="USER_ROLE_CHANGED">Role Changes</SelectItem>
            <SelectItem value="USER_SUSPENDED">User Suspensions</SelectItem>
            <SelectItem value="TRANSCRIPT_EXPORTED">Exports</SelectItem>
            <SelectItem value="SYSTEM_CONFIG_CHANGED">Config Changes</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1d">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Actions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Admin Actions ({filteredActions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredActions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No actions found
              </div>
            ) : (
              filteredActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-start gap-4 p-3 border rounded-md hover:bg-muted/50"
                >
                  <div className="mt-1">
                    {getActionIcon(action.action)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{action.action.replace(/_/g, ' ')}</span>
                      <Badge variant="outline" className="text-xs">
                        {action.target.type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">
                        {action.performedBy.firstName} {action.performedBy.lastName}
                      </span>
                      {' on '}
                      <span>{action.target.name}</span>
                    </div>
                    {action.reason && (
                      <div className="text-xs text-muted-foreground mt-1 italic">
                        Reason: {action.reason}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(new Date(action.timestamp), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
