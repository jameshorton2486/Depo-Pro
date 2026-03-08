'use client';

import { getSupabaseBrowserClient } from './browser';

// Lazy-initialized singleton — avoids module-level side effects
// that can fail during SSR/hydration
export const supabase = new Proxy({} as ReturnType<typeof getSupabaseBrowserClient>, {
  get(_target, prop, receiver) {
    const client = getSupabaseBrowserClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export { getSupabaseBrowserClient };

export default supabase;
