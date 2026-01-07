// ═══════════════════════════════════════════════════════════════
// NEXTAUTH TYPE EXTENSIONS
// ═══════════════════════════════════════════════════════════════
// Extend NextAuth types to include custom user properties

import type { DefaultSession } from 'next-auth';
import type { Role } from '@/lib/constants';

/**
 * Extend the built-in session types
 */
declare module 'next-auth' {
  /**
   * Extended Session to include custom user properties
   */
  interface Session {
    user: {
      id: string;
      role: Role;
      email: string;
      name: string;
      firmId?: string | null;
      agencyId?: string | null;
    } & DefaultSession['user'];
  }

  /**
   * Extended User type
   */
  interface User {
    id: string;
    email: string;
    name: string;
    role: Role;
    firmId?: string | null;
    agencyId?: string | null;
  }
}

/**
 * Extend JWT type to include custom properties
 */
declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    email: string;
    name: string;
    firmId?: string | null;
    agencyId?: string | null;
  }
}
