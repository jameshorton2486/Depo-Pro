module.exports = [
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/@prisma/client [external] (@prisma/client, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("@prisma/client", () => require("@prisma/client"));

module.exports = mod;
}),
"[project]/lib/db.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ═══════════════════════════════════════════════════════════════
// PRISMA CLIENT SINGLETON
// ═══════════════════════════════════════════════════════════════
// Prevents multiple Prisma Client instances in development
// due to hot reloading
__turbopack_context__.s([
    "db",
    ()=>db,
    "disconnect",
    ()=>disconnect
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs)");
;
/**
 * Global Prisma Client instance
 * We use a global variable in development to prevent multiple instances
 * from being created during hot module replacement (HMR)
 */ const globalForPrisma = globalThis;
const db = globalForPrisma.prisma ?? new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$29$__["PrismaClient"]({
    log: ("TURBOPACK compile-time truthy", 1) ? [
        'query',
        'error',
        'warn'
    ] : "TURBOPACK unreachable"
});
// Prevent multiple instances in development
if ("TURBOPACK compile-time truthy", 1) {
    globalForPrisma.prisma = db;
}
async function disconnect() {
    await db.$disconnect();
}
}),
"[project]/lib/constants.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ═══════════════════════════════════════════════════════════════
// CONSTANTS & ENUMS
// ═══════════════════════════════════════════════════════════════
// TypeScript representations of Prisma enums with UI metadata
/**
 * User roles for access control
 */ __turbopack_context__.s([
    "ASSIGNMENT_STATUS_COLORS",
    ()=>ASSIGNMENT_STATUS_COLORS,
    "AssignmentStatus",
    ()=>AssignmentStatus,
    "FILE_TYPE_ICONS",
    ()=>FILE_TYPE_ICONS,
    "FileType",
    ()=>FileType,
    "FirmType",
    ()=>FirmType,
    "JOB_STATUS_COLORS",
    ()=>JOB_STATUS_COLORS,
    "JOB_STATUS_LABELS",
    ()=>JOB_STATUS_LABELS,
    "JobStatus",
    ()=>JobStatus,
    "PAGINATION",
    ()=>PAGINATION,
    "ROLE_COLORS",
    ()=>ROLE_COLORS,
    "ROLE_LABELS",
    ()=>ROLE_LABELS,
    "Role",
    ()=>Role,
    "TermCategory",
    ()=>TermCategory,
    "TranscriptSource",
    ()=>TranscriptSource,
    "TranscriptStatus",
    ()=>TranscriptStatus
]);
const Role = {
    ADMIN: 'ADMIN',
    COURT_REPORTER: 'COURT_REPORTER',
    SCOPIST: 'SCOPIST'
};
const FirmType = {
    AGENCY: 'AGENCY',
    INDEPENDENT: 'INDEPENDENT'
};
const JobStatus = {
    DRAFT: 'DRAFT',
    ASSIGNED: 'ASSIGNED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    BILLED: 'BILLED',
    PAID: 'PAID'
};
const AssignmentStatus = {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    REJECTED: 'REJECTED'
};
const FileType = {
    AUDIO: 'AUDIO',
    VIDEO: 'VIDEO',
    TRANSCRIPT: 'TRANSCRIPT',
    EXHIBIT: 'EXHIBIT',
    WORDLIST: 'WORDLIST',
    OTHER: 'OTHER'
};
const TranscriptStatus = {
    DRAFT: 'DRAFT',
    REVIEW: 'REVIEW',
    FINAL: 'FINAL'
};
const TranscriptSource = {
    MANUAL: 'MANUAL',
    DEEPGRAM: 'DEEPGRAM',
    IMPORTED: 'IMPORTED'
};
const TermCategory = {
    NAME: 'NAME',
    PLACE: 'PLACE',
    TECHNICAL: 'TECHNICAL',
    MEDICAL: 'MEDICAL',
    LEGAL: 'LEGAL',
    OTHER: 'OTHER'
};
const JOB_STATUS_COLORS = {
    DRAFT: 'bg-gray-100 text-gray-800 border-gray-300',
    ASSIGNED: 'bg-blue-100 text-blue-800 border-blue-300',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    COMPLETED: 'bg-green-100 text-green-800 border-green-300',
    BILLED: 'bg-purple-100 text-purple-800 border-purple-300',
    PAID: 'bg-emerald-100 text-emerald-800 border-emerald-300'
};
const ASSIGNMENT_STATUS_COLORS = {
    PENDING: 'bg-gray-100 text-gray-800 border-gray-300',
    ACCEPTED: 'bg-blue-100 text-blue-800 border-blue-300',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    COMPLETED: 'bg-green-100 text-green-800 border-green-300',
    REJECTED: 'bg-red-100 text-red-800 border-red-300'
};
const ROLE_LABELS = {
    ADMIN: 'Admin',
    COURT_REPORTER: 'Court Reporter',
    SCOPIST: 'Scopist'
};
const ROLE_COLORS = {
    ADMIN: 'bg-red-100 text-red-800 border-red-300',
    COURT_REPORTER: 'bg-blue-100 text-blue-800 border-blue-300',
    SCOPIST: 'bg-green-100 text-green-800 border-green-300'
};
const FILE_TYPE_ICONS = {
    AUDIO: '🎵',
    VIDEO: '🎥',
    TRANSCRIPT: '📄',
    EXHIBIT: '📎',
    WORDLIST: '📝',
    OTHER: '📁'
};
const JOB_STATUS_LABELS = {
    DRAFT: 'Draft',
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    BILLED: 'Billed',
    PAID: 'Paid'
};
const PAGINATION = {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100
};
}),
"[project]/lib/validations/user.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ═══════════════════════════════════════════════════════════════
// USER VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════
// Zod schemas for user-related forms and API endpoints
__turbopack_context__.s([
    "changePasswordSchema",
    ()=>changePasswordSchema,
    "inviteUserSchema",
    ()=>inviteUserSchema,
    "loginSchema",
    ()=>loginSchema,
    "registerSchema",
    ()=>registerSchema,
    "updateProfileSchema",
    ()=>updateProfileSchema
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-rsc] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/constants.ts [app-rsc] (ecmascript)");
;
;
const loginSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Email is required').email('Please enter a valid email address'),
    password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters')
});
const registerSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Name is required').min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Email is required').email('Please enter a valid email address').toLowerCase(),
    password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(8, 'Password must be at least 8 characters').max(100, 'Password must be less than 100 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    confirmPassword: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Please confirm your password'),
    role: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Role"].ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Role"].COURT_REPORTER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Role"].SCOPIST
    ], {
        message: 'Please select a role'
    }),
    // Optional: Firm name for new independent reporters/scopists
    firmName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional()
}).refine((data)=>data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: [
        'confirmPassword'
    ]
});
const updateProfileSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters').optional(),
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email('Please enter a valid email address').toLowerCase().optional()
});
const changePasswordSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    currentPassword: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Current password is required'),
    newPassword: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(8, 'Password must be at least 8 characters').max(100, 'Password must be less than 100 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    confirmPassword: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Please confirm your new password')
}).refine((data)=>data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: [
        'confirmPassword'
    ]
}).refine((data)=>data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: [
        'newPassword'
    ]
});
const inviteUserSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email('Please enter a valid email address').toLowerCase(),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
    role: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Role"].COURT_REPORTER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$constants$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Role"].SCOPIST
    ], {
        message: 'Please select a role'
    })
});
}),
"[project]/lib/auth-options.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ═══════════════════════════════════════════════════════════════
// NEXTAUTH CONFIGURATION
// ═══════════════════════════════════════════════════════════════
// NextAuth.js v5 configuration with Credentials provider
__turbopack_context__.s([
    "authConfig",
    ()=>authConfig
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$credentials$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/credentials.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$credentials$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/providers/credentials.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/bcryptjs/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$validations$2f$user$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/validations/user.ts [app-rsc] (ecmascript)");
;
;
;
;
const authConfig = {
    // Use JWT strategy for sessions (stateless, no database sessions)
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60
    },
    // Custom pages
    pages: {
        signIn: '/login',
        error: '/login'
    },
    // Authentication providers
    providers: [
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$credentials$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"])({
            name: 'credentials',
            credentials: {
                email: {
                    label: 'Email',
                    type: 'email'
                },
                password: {
                    label: 'Password',
                    type: 'password'
                }
            },
            /**
       * Authorize function - validates user credentials
       * @param credentials - Email and password from login form
       * @returns User object if valid, null if invalid
       */ async authorize (credentials) {
                try {
                    // Validate input with Zod
                    const validatedFields = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$validations$2f$user$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["loginSchema"].safeParse(credentials);
                    if (!validatedFields.success) {
                        console.warn('[Auth] Login attempt with invalid credentials format');
                        return null;
                    }
                    const { email, password } = validatedFields.data;
                    console.log(`[Auth] Login attempt for: ${email}`);
                    // Find user by email
                    const user = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["db"].user.findUnique({
                        where: {
                            email: email.toLowerCase()
                        },
                        select: {
                            id: true,
                            email: true,
                            name: true,
                            passwordHash: true,
                            role: true,
                            firmId: true,
                            isActive: true
                        }
                    });
                    // Check if user exists
                    if (!user || !user.passwordHash) {
                        console.warn(`[Auth] Login attempt for non-existent user: ${email}`);
                        return null;
                    }
                    console.log(`[Auth] Found user: ${user.email}, Active: ${user.isActive}, Has password: ${!!user.passwordHash}`);
                    // Check if user is active
                    if (!user.isActive) {
                        console.warn(`[Auth] Login attempt for deactivated account: ${email}`);
                        throw new Error('Account is deactivated. Please contact support.');
                    }
                    // Verify password
                    let isPasswordValid = false;
                    try {
                        isPasswordValid = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["compare"])(password, user.passwordHash);
                    } catch (error) {
                        console.error('[Auth] Password comparison error:', error);
                        // Fallback: try synchronous comparison
                        isPasswordValid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["compareSync"])(password, user.passwordHash);
                    }
                    if (!isPasswordValid) {
                        console.warn(`[Auth] Login attempt with invalid password: ${email}`);
                        return null;
                    }
                    console.log(`[Auth] User logged in successfully: ${user.email} (${user.role})`);
                    // Return user object (excluding passwordHash)
                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        firmId: user.firmId,
                        isActive: user.isActive
                    };
                } catch (error) {
                    console.error('[Auth] Authorization failed:', error);
                    return null;
                }
            }
        })
    ],
    // Callbacks to customize behavior
    callbacks: {
        /**
     * JWT callback - runs when JWT is created or updated
     * Add custom properties to JWT token
     */ async jwt ({ token, user }) {
            // On initial sign-in, user object is available
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.firmId = user.firmId;
                token.email = user.email;
                token.name = user.name;
            }
            return token;
        },
        /**
     * Session callback - runs when session is checked
     * Add custom properties from JWT to session
     */ async session ({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
                session.user.firmId = token.firmId;
                session.user.email = token.email;
                session.user.name = token.name;
            }
            return session;
        },
        /**
     * Authorized callback - determines if request is authorized
     * Used by middleware to protect routes
     */ authorized ({ auth, request: { nextUrl } }) {
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
        }
    },
    // Enable debug logging in development
    debug: ("TURBOPACK compile-time value", "development") === 'development'
};
}),
"[project]/lib/auth.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ═══════════════════════════════════════════════════════════════
// AUTH HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════
// Utility functions for authentication and authorization
__turbopack_context__.s([
    "auth",
    ()=>auth,
    "getCurrentFirmId",
    ()=>getCurrentFirmId,
    "getCurrentUser",
    ()=>getCurrentUser,
    "handlers",
    ()=>handlers,
    "hasAnyRole",
    ()=>hasAnyRole,
    "hasRole",
    ()=>hasRole,
    "requireAuth",
    ()=>requireAuth,
    "requireFirm",
    ()=>requireFirm,
    "requireRole",
    ()=>requireRole,
    "signIn",
    ()=>signIn,
    "signOut",
    ()=>signOut
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2d$options$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth-options.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
;
;
;
const { handlers, signIn, signOut, auth } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2d$options$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["authConfig"]);
async function getCurrentUser() {
    return await auth();
}
async function requireAuth() {
    const session = await getCurrentUser();
    if (!session || !session.user) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])('/login');
    }
    return session;
}
async function requireRole(roles) {
    const session = await requireAuth();
    if (!roles.includes(session.user.role)) {
        throw new Error('Insufficient permissions');
    }
    return session;
}
async function hasRole(role) {
    const session = await getCurrentUser();
    if (!session || !session.user) {
        return false;
    }
    return session.user.role === role;
}
async function hasAnyRole(roles) {
    const session = await getCurrentUser();
    if (!session || !session.user) {
        return false;
    }
    return roles.includes(session.user.role);
}
async function getCurrentFirmId() {
    const session = await getCurrentUser();
    if (!session || !session.user) {
        return null;
    }
    return session.user.firmId;
}
async function requireFirm() {
    const session = await requireAuth();
    if (!session.user.firmId) {
        throw new Error('User must be assigned to a firm');
    }
    return session.user.firmId;
}
}),
"[project]/components/layouts/navbar.tsx [app-rsc] (client reference proxy) <module evaluation>", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "Navbar",
    ()=>Navbar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const Navbar = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call Navbar() from the server but Navbar is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/layouts/navbar.tsx <module evaluation>", "Navbar");
}),
"[project]/components/layouts/navbar.tsx [app-rsc] (client reference proxy)", ((__turbopack_context__) => {
"use strict";

// This file is generated by next-core EcmascriptClientReferenceModule.
__turbopack_context__.s([
    "Navbar",
    ()=>Navbar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)");
;
const Navbar = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call Navbar() from the server but Navbar is on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/components/layouts/navbar.tsx", "Navbar");
}),
"[project]/components/layouts/navbar.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$layouts$2f$navbar$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/components/layouts/navbar.tsx [app-rsc] (client reference proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$layouts$2f$navbar$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__ = __turbopack_context__.i("[project]/components/layouts/navbar.tsx [app-rsc] (client reference proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$layouts$2f$navbar$2e$tsx__$5b$app$2d$rsc$5d$__$28$client__reference__proxy$29$__);
}),
"[project]/app/(dashboard)/layout.tsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ═══════════════════════════════════════════════════════════════
// DASHBOARD LAYOUT
// ═══════════════════════════════════════════════════════════════
// Protected layout for all dashboard routes
__turbopack_context__.s([
    "default",
    ()=>DashboardLayout
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$layouts$2f$navbar$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/layouts/navbar.tsx [app-rsc] (ecmascript)");
;
;
;
;
async function DashboardLayout({ children }) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCurrentUser"])();
    if (!session) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])('/login');
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-gray-50",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$layouts$2f$navbar$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["Navbar"], {
                user: session.user
            }, void 0, false, {
                fileName: "[project]/app/(dashboard)/layout.tsx",
                lineNumber: 23,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("main", {
                className: "container mx-auto px-4 py-8",
                children: children
            }, void 0, false, {
                fileName: "[project]/app/(dashboard)/layout.tsx",
                lineNumber: 24,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/(dashboard)/layout.tsx",
        lineNumber: 22,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__b6d67ca4._.js.map