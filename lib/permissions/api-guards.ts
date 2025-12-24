// ═══════════════════════════════════════════════════════════════
// API ROUTE PERMISSION GUARDS
// ═══════════════════════════════════════════════════════════════
// Reusable guards for Next.js API routes

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  assertCaseAccess,
  assertAttorneyCaseAccess,
  assertReporterDepositionAccess,
  assertCanUploadExhibit,
  assertCanAnnotateTranscript,
  createPermissionError,
} from './case-access';

/**
 * Guard: Require authenticated user
 */
export async function requireAuth(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session.user;
}

/**
 * Guard: Require case access
 * Returns user if access granted, Response if denied
 */
export async function requireCaseAccess(
  userId: string,
  caseId: string,
  action?: 'view' | 'edit' | 'upload' | 'annotate' | 'link',
): Promise<true | NextResponse> {
  try {
    await assertCaseAccess(userId, caseId, action);
    return true;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Access denied' },
      { status: 403 },
    );
  }
}

/**
 * Guard: Require attorney case access
 */
export async function requireAttorneyCaseAccess(
  userId: string,
  caseId: string,
): Promise<true | NextResponse> {
  try {
    await assertAttorneyCaseAccess(userId, caseId);
    return true;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Access denied' },
      { status: 403 },
    );
  }
}

/**
 * Guard: Require reporter deposition access
 */
export async function requireReporterDepositionAccess(
  userId: string,
  depositionId: string,
): Promise<true | NextResponse> {
  try {
    await assertReporterDepositionAccess(userId, depositionId);
    return true;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Access denied' },
      { status: 403 },
    );
  }
}

/**
 * Guard: Require exhibit upload permission
 */
export async function requireExhibitUpload(
  userId: string,
  caseId: string,
  depositionId: string | null,
): Promise<true | NextResponse> {
  try {
    await assertCanUploadExhibit(userId, caseId, depositionId);
    return true;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Access denied' },
      { status: 403 },
    );
  }
}

/**
 * Guard: Require transcript annotation permission
 */
export async function requireTranscriptAnnotation(
  userId: string,
  transcriptId: string,
): Promise<true | NextResponse> {
  try {
    await assertCanAnnotateTranscript(userId, transcriptId);
    return true;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Access denied' },
      { status: 403 },
    );
  }
}

/**
 * Helper: Extract caseId from request
 * Supports query params or body
 */
export function extractCaseId(request: NextRequest, body?: any): string | null {
  const { searchParams } = new URL(request.url);
  return searchParams.get('caseId') || body?.caseId || null;
}

/**
 * Helper: Extract depositionId from request
 */
export function extractDepositionId(request: NextRequest, body?: any): string | null {
  const { searchParams } = new URL(request.url);
  return searchParams.get('depositionId') || body?.depositionId || null;
}

