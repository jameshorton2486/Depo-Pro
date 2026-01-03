// =============================================================================
// AUDIT EXPORT API ROUTE
// =============================================================================
// Export audit logs for compliance and legal discovery
// 
// POST /api/audit/export - Request audit log export
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/enums';
import { db } from '@/lib/db';
import {
  createAuditLog,
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
    
    // Build where clause
    const where: Record<string, unknown> = {
      createdAt: {
        gte: new Date(params.startDate),
        lte: new Date(params.endDate),
      },
    };
    
    // Non-admins: scope to their firm and optionally their own actions
    if (!isAdmin) {
      if (!session.user.firmId) {
        return NextResponse.json(
          { error: 'Firm context required' },
          { status: 403 }
        );
      }
      where.firmId = session.user.firmId;
    }
    
    // Optional filters
    if (params.targetTypes?.length) {
      where.targetType = { in: params.targetTypes };
    }
    if (params.actions?.length) {
      where.action = { in: params.actions };
    }
    
    // Count first to check limits
    const count = await db.auditLog.count({ where });
    
    if (count > SecurityConfig.MAX_EXPORT_RECORDS) {
      return NextResponse.json(
        { 
          error: `Export limited to ${SecurityConfig.MAX_EXPORT_RECORDS} records`,
          count,
          suggestion: 'Narrow your date range or filters',
        },
        { status: 400 }
      );
    }
    
    // Fetch logs
    const logs = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    
    // Log the export action itself
    await createAuditLog({
      actorUserId: session.user.id,
      firmId: session.user.firmId,
      action: AuditAction.DATA_EXPORT_REQUESTED,
      targetType: AuditTargetType.SYSTEM,
      targetId: 'audit-logs',
      metadata: {
        format: params.format,
        startDate: params.startDate,
        endDate: params.endDate,
        recordCount: logs.length,
      },
    });
    
    // Format response based on requested format
    if (params.format === 'csv') {
      const csv = convertToCSV(logs, params.includeMetadata);
      
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
      recordCount: logs.length,
      dateRange: {
        start: params.startDate,
        end: params.endDate,
      },
      data: logs.map(log => ({
        id: log.id,
        timestamp: log.createdAt,
        actor: log.user ? {
          id: log.user.id,
          name: `${log.user.firstName} ${log.user.lastName}`,
          email: log.user.email,
        } : null,
        firmId: log.firmId,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        ...(params.includeMetadata && { metadata: log.metadata }),
        ipAddress: log.ipAddress,
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
  
  const rows = logs.map(log => {
    const row = [
      log.id,
      log.createdAt.toISOString(),
      log.user?.id || '',
      escapeCSV(log.user?.name || ''),
      escapeCSV(log.user?.email || ''),
      log.firmId || '',
      log.action,
      log.targetType,
      log.targetId,
      log.ipAddress || '',
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
