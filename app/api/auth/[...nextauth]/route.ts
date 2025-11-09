// ═══════════════════════════════════════════════════════════════
// NEXTAUTH API ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════
// Handles all NextAuth.js API routes

import { handlers } from '@/lib/auth';

// Export GET and POST handlers for NextAuth
export const { GET, POST } = handlers;
