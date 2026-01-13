// lib/supabase/client.ts
// ═══════════════════════════════════════════════════════════════
// BROWSER CLIENT GETTER - Lazy singleton access
// ═══════════════════════════════════════════════════════════════
// 
// ⚠️ IMPORTANT: This exports a GETTER, not a pre-created instance
// This ensures env vars are loaded before client creation
//
// Usage:
//   import { supabase } from '@/lib/supabase/client';
//   // supabase is now a getter that creates on first access
// ═══════════════════════════════════════════════════════════════

'use client';

import { getSupabaseBrowserClient } from './browser';

// Export as a getter that lazily creates the client
// This ensures env vars are loaded when the client is first used
export const supabase = {
  get auth() {
    return getSupabaseBrowserClient().auth;
  },
  get from() {
    return getSupabaseBrowserClient().from.bind(getSupabaseBrowserClient());
  },
  get storage() {
    return getSupabaseBrowserClient().storage;
  },
  get functions() {
    return getSupabaseBrowserClient().functions;
  },
  get realtime() {
    return getSupabaseBrowserClient().realtime;
  },
  get rpc() {
    return getSupabaseBrowserClient().rpc.bind(getSupabaseBrowserClient());
  },
};

// Direct client getter for cases needing full client
export { getSupabaseBrowserClient };
