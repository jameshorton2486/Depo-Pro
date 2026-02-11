/**
 * Shared types for query layer
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase-generated';

export type SupabaseDbClient = SupabaseClient<Database>;
