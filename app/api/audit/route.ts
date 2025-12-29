// =============================================================================
// AUDIT LOGS API ROUTE
// =============================================================================
// Query audit logs for compliance and investigation
// 
// GET /api/audit - Query audit logs (firm-scoped)
// GET /api/audit/export - Export audit logs (admin only)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/enums';
import {
  queryAuditLogs,
  getEntityAuditHistory as _getEntityAuditHistory,
  createAuditLog,
  AuditAction,
  AuditTargetType,
  AuditLogQuery,
} from '@/lib/audit-service';
import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const querySchema = z.object({
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  action: z.string().optional(),
  actorUserId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
});

// =============================================================================
// GET - Query Audit Logs
// =============================================================================

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const { searchParams } = new URL(request.url);
  
  try {
    // Parse and validate query params
    const params = querySchema.parse({
      targetType: searchParams.get('targetType'),
      targetId: searchParams.get('targetId'),
      action: searchParams.get('action'),
      actorUserId: searchParams.get('actorUserId'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });
    
    // Build query
    const query: AuditLogQuery = {
      limit: params.limit,
      offset: params.offset,
    };
    
    // Non-admins can only query their own firm
    if (session.user.role !== UserRole.ADMIN) {
      if (!session.user.firmId) {
        return NextResponse.json(
          { error: 'Firm context required' },
          { status: 403 }
        );
      }
      query.firmId = session.user.firmId;
    } else {
      // Admin can query specific firm or all
      const firmIdParam = searchParams.get('firmId');
      if (firmIdParam) {
        query.firmId = firmIdParam;
      }
    }
    
    // Add optional filters
    if (params.targetType) query.targetType = params.targetType as any;
    if (params.targetId) query.targetId = params.targetId;
    if (params.action) query.action = params.action as any;
    if (params.actorUserId) query.actorUserId = params.actorUserId;
    if (params.startDate) query.startDate = new Date(params.startDate);
    if (params.endDate) query.endDate = new Date(params.endDate);
    
    // Execute query
    const result = await queryAuditLogs(query);
    
    // Log the audit query itself
    await createAuditLog({
      actorUserId: session.user.id,
      firmId: session.user.firmId,
      action: AuditAction.ADMIN_ACCESS,
      targetType: AuditTargetType.SYSTEM,
      targetId: 'audit-logs',
      metadata: {
        queryParams: params,
        resultCount: result.logs.length,
      },
    });
    
    return NextResponse.json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        hasMore: result.offset + result.logs.length < result.total,
      },
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Audit query error:', error);
    return NextResponse.json(
      { error: 'Failed to query audit logs' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Not Allowed (Audit logs are append-only via internal APIs)
// =============================================================================

export async function POST() {
  return NextResponse.json(
    { error: 'Audit logs cannot be created via API' },
    { status: 405 }
  );
}

// =============================================================================
// DELETE - Not Allowed (Audit logs are immutable)
// =============================================================================

export async function DELETE() {
  return NextResponse.json(
    { error: 'Audit logs cannot be deleted' },
    { status: 405 }
  );
}

// =============================================================================
// PATCH/PUT - Not Allowed (Audit logs are immutable)
// =============================================================================

export async function PATCH() {
  return NextResponse.json(
    { error: 'Audit logs cannot be modified' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Audit logs cannot be modified' },
    { status: 405 }
  );
}
