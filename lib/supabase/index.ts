/**
 * Supabase Client Exports
 */

export { 
  createSupabaseServerClient,
  createSupabaseServiceClient,
  getSupabaseServerClient,
} from './server';

export { 
  createSupabaseBrowserClient,
  createBrowserClient,
} from './client';

// Re-export for convenience
export { createSupabaseServerClient as createServerClient } from './server';
