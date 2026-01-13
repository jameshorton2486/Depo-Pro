// lib/supabase/client.ts
// ═══════════════════════════════════════════════════════════════
// BROWSER CLIENT - Singleton instance for client components
// ═══════════════════════════════════════════════════════════════
// This provides a singleton browser client instance
// Use getSupabaseBrowserClient() for new code

'use client';

import { getSupabaseBrowserClient } from './browser';

// Singleton instance - created once per module load
export const supabase = getSupabaseBrowserClient();
