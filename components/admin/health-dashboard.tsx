'use client';

// =============================================================================
// SYSTEM HEALTH DASHBOARD
// components/admin/health-dashboard.tsx
//
// Phase 3D-3: Health status indicators
// =============================================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { SystemHealth } from '@/lib/monitoring/health-service';

export function HealthDashboard() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/admin/health');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      console.error('Error fetching health:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'healthy' || status === 'connected') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (status === 'degraded' || status === 'unknown') {
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    }
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'healthy' || status === 'connected') {
      return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
    }
    if (status === 'degraded' || status === 'unknown') {
      return <Badge className="bg-amber-100 text-amber-800">Degraded</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800">Down</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!health) {
    return <div className="p-8 text-center text-muted-foreground">Unable to fetch health data</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* API Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">API</CardTitle>
            {getStatusIcon(health.api.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {getStatusBadge(health.api.status)}
            <div className="text-sm text-muted-foreground">
              Latency: {health.api.latency}ms
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Database</CardTitle>
            {getStatusIcon(health.database.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {getStatusBadge(health.database.status)}
            <div className="text-sm text-muted-foreground">
              Status: {health.database.status}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pending:</span>
              <span className="font-medium">{health.queue.pending}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Processing:</span>
              <span className="font-medium">{health.queue.processing}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Failed:</span>
              <span className="font-medium text-red-600">{health.queue.failed}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
