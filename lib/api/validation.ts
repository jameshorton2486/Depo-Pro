import type { z } from 'zod';

export interface ValidationErrorPayload {
  error: string;
  code: 'VALIDATION_ERROR';
  fieldErrors: Record<string, string[]>;
  details: z.ZodIssue[];
}

export function toValidationErrorPayload(err: z.ZodError): ValidationErrorPayload {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of err.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_root';
    if (!fieldErrors[key]) {
      fieldErrors[key] = [];
    }
    fieldErrors[key].push(issue.message);
  }

  const firstPath = err.issues[0]?.path?.join('.');
  const errorMessage = firstPath ? `Validation failed: ${firstPath}` : 'Validation failed';

  return {
    error: errorMessage,
    code: 'VALIDATION_ERROR',
    fieldErrors,
    details: err.issues,
  };
}

export function parsePagination(searchParams: URLSearchParams): {
  limit: number;
  offset: number;
} {
  const rawLimit = searchParams.get('limit');
  const rawOffset = searchParams.get('offset');

  const limit = Math.min(Math.max(Number.parseInt(rawLimit || '100', 10) || 100, 1), 500);
  const offset = Math.max(Number.parseInt(rawOffset || '0', 10) || 0, 0);

  return { limit, offset };
}

export function parseOptionalIsoDate(
  searchParams: URLSearchParams,
  paramName: string
): string | null {
  const value = searchParams.get(paramName);
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}
