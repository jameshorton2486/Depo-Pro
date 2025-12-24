// ═══════════════════════════════════════════════════════════════
// NEXTAUTH TYPE EXTENSIONS
// ═══════════════════════════════════════════════════════════════
// Extend NextAuth types to include custom user properties

import { DefaultSession } from 'next-auth';
import { Role } from '@/lib/constants';

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
      firmId: string | null;
      email: string;
      name: string;
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
    firmId: string | null;
    isActive: boolean;
  }
}

/**
 * Extend JWT type to include custom properties
 */
declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    firmId: string | null;
    email: string;
    name: string;
  }
}
