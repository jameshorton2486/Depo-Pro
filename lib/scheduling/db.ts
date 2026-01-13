/**
 * Prisma-Compatible Database Wrapper for Supabase
 * Provides Prisma-like API over Supabase client
 * 
 * IMPORTANT: This file uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
 * It is SERVER-ONLY and must never be imported in client components.
 */

// This import ensures Next.js will error if this file is imported client-side
import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Lazy Supabase client initialization (BUILD-SAFE)
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // ⚠️ CRITICAL: No fallback - fail hard if service role key is missing
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL. ' +
      'Supabase client requires this environment variable.'
    );
  }
  
  if (!supabaseKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. ' +
      'Scheduling client requires service role key (no fallback allowed).'
    );
  }

  supabaseInstance = createClient(supabaseUrl, supabaseKey);
  return supabaseInstance;
}

// Type definitions
type WhereClause = Record<string, any>;
type SelectClause = Record<string, any>;
type OrderByClause = Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;

interface FindOptions {
  where?: WhereClause;
  select?: SelectClause;
  include?: Record<string, any>;
  orderBy?: OrderByClause;
  take?: number;
  skip?: number;
}

interface CreateOptions {
  data: Record<string, any>;
  select?: SelectClause;
  include?: Record<string, any>;
}

interface UpdateOptions {
  where: WhereClause;
  data: Record<string, any>;
  select?: SelectClause;
  include?: Record<string, any>;
}

interface DeleteOptions {
  where: WhereClause;
}

interface UpsertOptions {
  where: WhereClause;
  create: Record<string, any>;
  update: Record<string, any>;
}

interface CreateManyOptions {
  data: Record<string, any>[];
  skipDuplicates?: boolean;
}

// Helper: Convert camelCase to snake_case
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Helper: Convert snake_case to camelCase
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Helper: Convert object keys
function convertKeys(obj: any, converter: (s: string) => string): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(item => convertKeys(item, converter));
  if (typeof obj !== 'object') return obj;

  const converted: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = converter(key);
    converted[newKey] = convertKeys(value, converter);
  }
  return converted;
}

// Helper: Build where clause for Supabase
function buildWhere(query: any, where: WhereClause): any {
  for (const [key, value] of Object.entries(where)) {
    const snakeKey = toSnakeCase(key);

    if (value === null) {
      query = query.is(snakeKey, null);
    } else if (typeof value === 'object' && value !== null) {
      if ('equals' in value) query = query.eq(snakeKey, value.equals);
      else if ('not' in value) query = query.neq(snakeKey, value.not);
      else if ('in' in value) query = query.in(snakeKey, value.in);
      else if ('notIn' in value) query = query.not(snakeKey, 'in', `(${value.notIn.join(',')})`);
      else if ('contains' in value) query = query.ilike(snakeKey, `%${value.contains}%`);
      else if ('startsWith' in value) query = query.ilike(snakeKey, `${value.startsWith}%`);
      else if ('endsWith' in value) query = query.ilike(snakeKey, `%${value.endsWith}`);
      else if ('gt' in value) query = query.gt(snakeKey, value.gt);
      else if ('gte' in value) query = query.gte(snakeKey, value.gte);
      else if ('lt' in value) query = query.lt(snakeKey, value.lt);
      else if ('lte' in value) query = query.lte(snakeKey, value.lte);
      else query = query.eq(snakeKey, value);
    } else {
      query = query.eq(snakeKey, value);
    }
  }
  return query;
}

// Helper: Build select clause
function buildSelect(select?: SelectClause, include?: Record<string, any>): string {
  if (!select && !include) return '*';

  const fields: string[] = [];

  if (select) {
    for (const [key, value] of Object.entries(select)) {
      const snakeKey = toSnakeCase(key);
      if (value === true) {
        fields.push(snakeKey);
      } else if (typeof value === 'object' && value !== null) {
        fields.push(`${snakeKey}(*)`);
      }
    }
  }

  if (include) {
    for (const [key, value] of Object.entries(include)) {
      const snakeKey = toSnakeCase(key);
      if (value === true || (typeof value === 'object' && value !== null)) {
        if (!fields.includes(`${snakeKey}(*)`)) {
          fields.push(`${snakeKey}(*)`);
        }
      }
    }
  }

  return fields.length > 0 ? fields.join(',') : '*';
}

// Create model proxy
function createModelProxy(tableName: string) {
  const snakeTableName = toSnakeCase(tableName);

  return {
    async findUnique(options: FindOptions = {}) {
      const supabase = getSupabaseClient();
      const { where = {}, select, include } = options;
      const selectStr = buildSelect(select, include);

      let query = supabase.from(snakeTableName).select(selectStr);
      query = buildWhere(query, where);

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data ? convertKeys(data, toCamelCase) : null;
    },

    async findFirst(options: FindOptions = {}) {
      const supabase = getSupabaseClient();
      const { where = {}, select, include, orderBy } = options;
      const selectStr = buildSelect(select, include);

      let query = supabase.from(snakeTableName).select(selectStr);
      query = buildWhere(query, where);

      if (orderBy) {
        const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
        for (const order of orders) {
          for (const [key, dir] of Object.entries(order)) {
            query = query.order(toSnakeCase(key), { ascending: dir === 'asc' });
          }
        }
      }

      const { data, error } = await query.limit(1).maybeSingle();
      if (error) throw error;
      return data ? convertKeys(data, toCamelCase) : null;
    },

    async findMany(options: FindOptions = {}) {
      const supabase = getSupabaseClient();
      const { where = {}, select, include, orderBy, take, skip } = options;
      const selectStr = buildSelect(select, include);

      let query = supabase.from(snakeTableName).select(selectStr);
      query = buildWhere(query, where);

      if (orderBy) {
        const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
        for (const order of orders) {
          for (const [key, dir] of Object.entries(order)) {
            query = query.order(toSnakeCase(key), { ascending: dir === 'asc' });
          }
        }
      }

      if (take) query = query.limit(take);
      if (skip) query = query.range(skip, skip + (take || 100) - 1);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(item => convertKeys(item, toCamelCase));
    },

    async create(options: CreateOptions) {
      const supabase = getSupabaseClient();
      const { data, select, include } = options;
      const snakeData = convertKeys(data, toSnakeCase);
      const selectStr = buildSelect(select, include);

      const { data: result, error } = await supabase
        .from(snakeTableName)
        .insert(snakeData)
        .select(selectStr)
        .single();

      if (error) throw error;
      return convertKeys(result, toCamelCase);
    },

    async createMany(options: CreateManyOptions) {
      const supabase = getSupabaseClient();
      const snakeData = options.data.map(d => convertKeys(d, toSnakeCase));

      const { data, error } = await supabase
        .from(snakeTableName)
        .insert(snakeData)
        .select();

      if (error) throw error;
      return { count: data?.length || 0 };
    },

    async update(options: UpdateOptions) {
      const supabase = getSupabaseClient();
      const { where, data, select, include } = options;
      const snakeData = convertKeys(data, toSnakeCase);
      const selectStr = buildSelect(select, include);

      let query = supabase.from(snakeTableName).update(snakeData);
      query = buildWhere(query, where);

      const { data: result, error } = await query.select(selectStr).maybeSingle();
      if (error) throw error;
      return result ? convertKeys(result, toCamelCase) : null;
    },

    async updateMany(options: { where: WhereClause; data: Record<string, any> }) {
      const supabase = getSupabaseClient();
      const { where, data } = options;
      const snakeData = convertKeys(data, toSnakeCase);

      let query = supabase.from(snakeTableName).update(snakeData);
      query = buildWhere(query, where);

      const { data: result, error } = await query.select();
      if (error) throw error;
      return { count: result?.length || 0 };
    },

    async delete(options: DeleteOptions) {
      const supabase = getSupabaseClient();
      const { where } = options;

      let query = supabase.from(snakeTableName).delete();
      query = buildWhere(query, where);

      const { data, error } = await query.select().maybeSingle();
      if (error) throw error;
      return data ? convertKeys(data, toCamelCase) : null;
    },

    async deleteMany(options: { where: WhereClause }) {
      const supabase = getSupabaseClient();
      const { where } = options;

      let query = supabase.from(snakeTableName).delete();
      query = buildWhere(query, where);

      const { data, error } = await query.select();
      if (error) throw error;
      return { count: data?.length || 0 };
    },

    async upsert(options: UpsertOptions) {
      const supabase = getSupabaseClient();
      const { where, create, update } = options;

      let query = supabase.from(snakeTableName).select('id');
      query = buildWhere(query, where);
      const { data: existing } = await query.maybeSingle();

      if (existing) {
        return this.update({ where, data: update });
      } else {
        return this.create({ data: create });
      }
    },

    async count(options: { where?: WhereClause } = {}) {
      const supabase = getSupabaseClient();
      const { where = {} } = options;

      let query = supabase.from(snakeTableName).select('id', { count: 'exact', head: true });
      query = buildWhere(query, where);

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  };
}

// ALL models including missing ones
const models = [
  // Core models
  'user', 'job', 'transcript', 'transcription', 'transcriptionEdit',
  'file', 'firm', 'assignment', 'calendarEvent', 'case', 'caseAttorney',
  'caseMembership', 'caseExtractedTerm', 'exhibit', 'invoice', 'auditLog',
  'depositionNote', 'properNoun', 'reporterAvailability', 'bookingRequest',
  'externalCalendarConnection', 'transcriptShare', 'transcriptAccess',
  'transcriptAnnotation', 'transcriptHighlight', 'transcriptNote',
  'transcriptBookmark', 'transcriptVersion', 'exportLog', 'attorneyProfile',
  'attorneyTranscript', 'csrRecord', 'rxSession',
  // Additional models that were missing
  'jobAssignment', 'jobFile', 'transcriptionJob', 'transcriptReviewSession',
  'eventParticipant', 'transcriptAnnotationExhibit', 'externalCalendarEvent',
  'externalCalendarSyncLog', 'usageRecord', 'backgroundJob', 'webhookConfig',
] as const;

type ModelName = typeof models[number];

// Create db object with all model proxies
export const db = models.reduce((acc, model) => {
  acc[model] = createModelProxy(model);
  return acc;
}, {} as Record<ModelName, ReturnType<typeof createModelProxy>>);

// Transaction support
(db as any).$transaction = async function<T>(
  fn: (tx: typeof db) => Promise<T>
): Promise<T> {
  return fn(db);
};

// Export as prisma alias for compatibility
export const prisma = db;
export default db;
