// =============================================================================
// AUDIT EXPORT API ROUTE
// =============================================================================
// Export audit logs for compliance and legal discovery
//
// POST /api/audit/export - Request audit log export
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserById } from '@/lib/supabase/queries/users';
import { listAuditLogs, createAuditLog } from '@/lib/supabase/queries/audit';
import { UserRole } from '@/lib/enums';
import {
  AuditAction,
  AuditTargetType,
} from '@/lib/audit-service';
import { SecurityConfig } from '@/lib/security-utils';
import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

const exportSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  includeMetadata: z.boolean().default(true),
  targetTypes: z.array(z.string()).optional(),
  actions: z.array(z.string()).optional(),
});

// =============================================================================
// POST - Export Audit Logs
// =============================================================================

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Only admins can export full audit logs
  // Other roles can only export their own actions
  const isAdmin = session.user.role === UserRole.ADMIN;

  try {
    const body = await request.json();
    const params = exportSchema.parse(body);

    const supabase = await createSupabaseServerClient();

    // Build filters
    const filters: any = {
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
    };

    // Non-admins: scope to their firm
    if (!isAdmin) {
      if (!session.user.firmId) {
        return NextResponse.json(
          { error: 'Firm context required' },
          { status: 403 }
        );
      }
      filters.firm_id = session.user.firmId;
    }

    // Optional filters - query without action/target_type filters first
    // since listAuditLogs only supports single values, we'll filter after
    if (params.targetTypes?.length && params.targetTypes.length === 1) {
      filters.target_type = params.targetTypes[0];
    }
    if (params.actions?.length && params.actions.length === 1) {
      filters.action = params.actions[0];
    }

    // Fetch logs
    const { logs } = await listAuditLogs(supabase, filters, {
      limit: SecurityConfig.MAX_EXPORT_RECORDS + 1, // Get one extra to check limit
    });

    // Apply additional filters if multiple values provided
    let filteredLogs = logs;
    if (params.targetTypes && params.targetTypes.length > 1) {
      filteredLogs = filteredLogs.filter((log: any) => params.targetTypes!.includes(log.target_type));
    } else if (params.targetTypes && params.targetTypes.length === 1) {
      // Already filtered by query, but ensure it matches
      filteredLogs = filteredLogs.filter((log: any) => params.targetTypes![0] === log.target_type);
    }
    if (params.actions && params.actions.length > 1) {
      filteredLogs = filteredLogs.filter((log: any) => params.actions!.includes(log.action));
    } else if (params.actions && params.actions.length === 1) {
      // Already filtered by query, but ensure it matches
      filteredLogs = filteredLogs.filter((log: any) => params.actions![0] === log.action);
    }

    if (filteredLogs.length > SecurityConfig.MAX_EXPORT_RECORDS) {
      return NextResponse.json(
        {
          error: `Export limited to ${SecurityConfig.MAX_EXPORT_RECORDS} records`,
          count: filteredLogs.length,
          suggestion: 'Narrow your date range or filters',
        },
        { status: 400 }
      );
    }

    // Enrich with user info
    const enrichedLogs = await Promise.all(
      filteredLogs.map(async (log: any) => {
        let user = null;
        if (log.actor_user_id && log.actor_user_id !== 'system') {
          const userData = await getUserById(supabase, log.actor_user_id);
          if (userData) {
            user = {
              id: userData.id,
              firstName: userData.user_metadata?.firstName || '',
              lastName: userData.user_metadata?.lastName || '',
              email: userData.email || '',
            };
          }
        }
        return { ...log, user };
      })
    );

    // Log the export action itself
    await createAuditLog(supabase, {
      actor_user_id: session.user.id,
      firm_id: session.user.firmId || null,
      action: AuditAction.DATA_EXPORT_REQUESTED,
      target_type: AuditTargetType.SYSTEM,
      target_id: 'audit-logs',
      metadata: {
        format: params.format,
        startDate: params.startDate,
        endDate: params.endDate,
        recordCount: enrichedLogs.length,
      },
    });

    // Format response based on requested format
    if (params.format === 'csv') {
      const csv = convertToCSV(enrichedLogs, params.includeMetadata);

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${Date.now()}.csv"`,
        },
      });
    }

    // JSON format
    return NextResponse.json({
      success: true,
      exportedAt: new Date().toISOString(),
      recordCount: enrichedLogs.length,
      dateRange: {
        start: params.startDate,
        end: params.endDate,
      },
      data: enrichedLogs.map((log: any) => ({
        id: log.id,
        timestamp: log.created_at,
        actor: log.user ? {
          id: log.user.id,
          name: `${log.user.firstName} ${log.user.lastName}`,
          email: log.user.email,
        } : null,
        firmId: log.firm_id,
        action: log.action,
        targetType: log.target_type,
        targetId: log.target_id,
        ...(params.includeMetadata && { metadata: log.metadata }),
        ipAddress: log.ip_address,
      })),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid export parameters', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Audit export error:', error);
    return NextResponse.json(
      { error: 'Failed to export audit logs' },
      { status: 500 }
    );
  }
}

// =============================================================================
// CSV CONVERSION
// =============================================================================

function convertToCSV(logs: any[], includeMetadata: boolean): string {
  const headers = [
    'id',
    'timestamp',
    'actor_id',
    'actor_name',
    'actor_email',
    'firm_id',
    'action',
    'target_type',
    'target_id',
    'ip_address',
  ];

  if (includeMetadata) {
    headers.push('metadata');
  }

  const rows = logs.map((log: any) => {
    const row = [
      log.id,
      log.created_at ? new Date(log.created_at).toISOString() : '',
      log.user?.id || '',
      escapeCSV(log.user ? `${log.user.firstName} ${log.user.lastName}` : ''),
      escapeCSV(log.user?.email || ''),
      log.firm_id || '',
      log.action,
      log.target_type,
      log.target_id,
      log.ip_address || '',
    ];

    if (includeMetadata) {
      row.push(escapeCSV(JSON.stringify(log.metadata || {})));
    }

    return row.join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}


