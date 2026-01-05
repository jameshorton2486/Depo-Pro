// ═══════════════════════════════════════════════════════════════
// NEXTAUTH CONFIGURATION
// ═══════════════════════════════════════════════════════════════
// NextAuth.js v5 configuration with Credentials provider

import { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { loginSchema } from '@/lib/validations/user';
import { Role } from '@/lib/constants';
import { createAuditLog, AuditAction, AuditTargetType } from '@/lib/audit-service';

/**
 * NextAuth configuration object
 * Defines auth providers, callbacks, and session strategy
 */
export const authConfig: NextAuthConfig = {
  // Use JWT strategy for sessions (stateless, no database sessions)
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Custom pages
  pages: {
    signIn: '/login',
    error: '/login',
  },

  // Authentication providers
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },

      /**
       * Authorize function - validates user credentials
       * @param credentials - Email and password from login form
       * @returns User object if valid, null if invalid
       */
      async authorize(credentials, request) {
        try {
          // Validate input with Zod
          const validatedFields = loginSchema.safeParse(credentials);

          if (!validatedFields.success) {
            console.warn('[Auth] Login attempt with invalid credentials format');
            // Log failed login attempt
            await createAuditLog({
              actorUserId: null,
              firmId: null,
              action: AuditAction.LOGIN_FAILED,
              targetType: AuditTargetType.USER,
              targetId: 'unknown',
              metadata: { reason: 'invalid_format' },
              ipAddress: request?.headers?.get('x-forwarded-for')?.split(',')[0] || request?.headers?.get('x-real-ip') || undefined,
              userAgent: request?.headers?.get('user-agent') || undefined,
            }).catch(() => {}); // Fire and forget
            return null;
          }

          const { email } = validatedFields.data;

          console.log(`[Auth] Login attempt for: ${email}`);

          // Get IP address for audit logging
          const ipAddress = request?.headers?.get('x-forwarded-for')?.split(',')[0] || request?.headers?.get('x-real-ip') || undefined;
          const userAgent = request?.headers?.get('user-agent') || undefined;

          console.warn('[Auth] Legacy credentials login is disabled.');
          await createAuditLog({
            actorUserId: null,
            firmId: null,
            action: AuditAction.LOGIN_FAILED,
            targetType: AuditTargetType.USER,
            targetId: 'unknown',
            metadata: { reason: 'legacy_disabled', email },
            ipAddress,
            userAgent,
          }).catch(() => {});
          return null;
        } catch (error) {
          console.error('[Auth] Authorization failed:', error);
          return null;
        }
      },
    }),

    // TODO: Phase 2 - Add OAuth providers
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
    // TODO: Phase 2 - Add Microsoft provider
    // MicrosoftProvider({
    //   clientId: process.env.MICROSOFT_CLIENT_ID!,
    //   clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    // }),
  ],

  // Callbacks to customize behavior
  callbacks: {
    /**
     * JWT callback - runs when JWT is created or updated
     * Add custom properties to JWT token
     */
    async jwt({ token, user }) {
      // On initial sign-in, user object is available
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
        token.name = user.name;
      }

      return token;
    },

    /**
     * Session callback - runs when session is checked
     * Add custom properties from JWT to session
     */
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }

      return session;
    },

    /**
     * Authorized callback - determines if request is authorized
     * Used by middleware to protect routes
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnJobs = nextUrl.pathname.startsWith('/jobs');
      const isOnAuth = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register');

      // Protect dashboard and jobs routes
      if (isOnDashboard || isOnJobs) {
        if (!isLoggedIn) return false;
        return true;
      }

      // Redirect to dashboard if already logged in
      if (isOnAuth && isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }

      return true;
    },
  },

  // Enable debug logging in development
  debug: process.env.NODE_ENV === 'development',
};

export const authOptions = authConfig;
