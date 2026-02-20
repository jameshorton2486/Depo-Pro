import { z } from 'zod';

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});

const isoDateStringSchema = z.string().datetime({ offset: true }).or(z.string().date());

export function parsePagination(searchParams: URLSearchParams) {
  return paginationSchema.parse({
    limit: searchParams.get('limit') ?? undefined,
    offset: searchParams.get('offset') ?? undefined,
  });
}

export function parseOptionalIsoDate(searchParams: URLSearchParams, key: string): string | null {
  const value = searchParams.get(key);
  if (!value) return null;
  return isoDateStringSchema.parse(value);
}
