'use client';

// =============================================================================
// PERMISSION AUDIT TABLE
// components/admin/permission-audit-table.tsx
//
// Phase 3D-1: Searchable, filterable permission table
// =============================================================================

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Shield, Globe } from 'lucide-react';
import type { Role } from '@/lib/permissions/route-access';

interface Route {
  path: string;
  roles: Role[];
  type: 'page' | 'api';
}

interface PermissionAuditTableProps {
  routes: Route[];
}

export function PermissionAuditTable({ routes }: PermissionAuditTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Role summary cards
  const roleSummary = useMemo(() => {
    // Initialize summary with all valid roles from Prisma UserRole enum
    const summary: Partial<Record<Role, { pages: number; apis: number }>> = {};
    const validRoles: Role[] = ['ADMIN', 'REPORTER', 'SCOPIST', 'ATTORNEY', 'PARALEGAL', 'AGENCY', 'AGENCY_ADMIN', 'FIRM_ADMIN'];
    validRoles.forEach((role) => {
      summary[role] = { pages: 0, apis: 0 };
    });

    routes.forEach((route) => {
      route.roles.forEach((role) => {
        const roleSummary = summary[role];
        if (roleSummary) {
          if (route.type === 'page') {
            roleSummary.pages++;
          } else {
            roleSummary.apis++;
          }
        }
      });
    });

    return summary;
  }, [routes]);

  // Filter routes
  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => {
      // Search filter
      if (searchQuery && !route.path.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Role filter
      if (roleFilter !== 'all' && !route.roles.includes(roleFilter as Role)) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && route.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [routes, searchQuery, roleFilter, typeFilter]);

  return (
    <div className="space-y-6">
      {/* Role Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {(Object.entries(roleSummary) as Array<[Role, { pages: number; apis: number }]>).map(
          ([role, counts]) => (
            <Card
              key={role}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{role}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{counts.pages + counts.apis}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {counts.pages} pages, {counts.apis} APIs
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search routes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="REPORTER">Reporter</SelectItem>
            <SelectItem value="SCOPIST">Scopist</SelectItem>
            <SelectItem value="ATTORNEY">Attorney</SelectItem>
            <SelectItem value="AGENCY">Agency</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="page">Pages Only</SelectItem>
            <SelectItem value="api">APIs Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Routes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Routes ({filteredRoutes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold">Route/Path</th>
                  <th className="text-left p-2 font-semibold">Type</th>
                  <th className="text-left p-2 font-semibold">Allowed Roles</th>
                  <th className="text-left p-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.map((route) => (
                  <tr key={`${route.type}-${route.path}`} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-mono text-xs">{route.path}</td>
                    <td className="p-2">
                      {route.type === 'page' ? (
                        <Badge variant="outline" className="gap-1">
                          <Globe className="h-3 w-3" />
                          Page
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Shield className="h-3 w-3" />
                          API
                        </Badge>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {route.roles.map((role) => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Registered
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
