(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__3a0428b1._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/ [middleware-edge] (unsupported edge import 'crypto', ecmascript)", ((__turbopack_context__, module, exports) => {

__turbopack_context__.n(__import_unsupported(`crypto`));
}),
"[project]/lib/db.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
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
    ()=>disconnect,
    "prisma",
    ()=>prisma
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$2f$default$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@prisma/client/default.js [middleware-edge] (ecmascript)");
;
/**
 * Global Prisma Client instance
 * We use a global variable in development to prevent multiple instances
 * from being created during hot module replacement (HMR)
 */ const globalForPrisma = globalThis;
const db = globalForPrisma.prisma ?? new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$2f$default$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["PrismaClient"]({
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
const prisma = db;
}),
"[project]/lib/constants.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
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
    REPORTER: 'REPORTER',
    SCOPIST: 'SCOPIST'
};
const JobStatus = {
    CREATED: 'CREATED',
    FILES_UPLOADED: 'FILES_UPLOADED',
    ENHANCING_AUDIO: 'ENHANCING_AUDIO',
    TRANSCRIBING: 'TRANSCRIBING',
    AI_REVIEWING: 'AI_REVIEWING',
    READY_FOR_EDIT: 'READY_FOR_EDIT',
    ASSIGNED: 'ASSIGNED',
    IN_EDIT: 'IN_EDIT',
    SUBMITTED_FOR_REVIEW: 'SUBMITTED_FOR_REVIEW',
    IN_REVIEW: 'IN_REVIEW',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED'
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
    CREATED: 'bg-gray-100 text-gray-800 border-gray-300',
    FILES_UPLOADED: 'bg-blue-100 text-blue-800 border-blue-300',
    ENHANCING_AUDIO: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    TRANSCRIBING: 'bg-purple-100 text-purple-800 border-purple-300',
    AI_REVIEWING: 'bg-pink-100 text-pink-800 border-pink-300',
    READY_FOR_EDIT: 'bg-green-100 text-green-800 border-green-300',
    ASSIGNED: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    IN_EDIT: 'bg-orange-100 text-orange-800 border-orange-300',
    SUBMITTED_FOR_REVIEW: 'bg-teal-100 text-teal-800 border-teal-300',
    IN_REVIEW: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    CANCELLED: 'bg-red-100 text-red-800 border-red-300'
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
    REPORTER: 'Court Reporter',
    SCOPIST: 'Scopist'
};
const ROLE_COLORS = {
    ADMIN: 'bg-red-100 text-red-800 border-red-300',
    REPORTER: 'bg-blue-100 text-blue-800 border-blue-300',
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
    CREATED: 'Created',
    FILES_UPLOADED: 'Files Uploaded',
    ENHANCING_AUDIO: 'Enhancing Audio',
    TRANSCRIBING: 'Transcribing',
    AI_REVIEWING: 'AI Reviewing',
    READY_FOR_EDIT: 'Ready for Edit',
    ASSIGNED: 'Assigned',
    IN_EDIT: 'In Edit',
    SUBMITTED_FOR_REVIEW: 'Submitted for Review',
    IN_REVIEW: 'In Review',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled'
};
const PAGINATION = {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100
};
}),
"[project]/lib/validations/user.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [middleware-edge] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$constants$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/constants.ts [middleware-edge] (ecmascript)");
;
;
const loginSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Email is required').email('Please enter a valid email address'),
    password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters')
});
const registerSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    firstName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'First name is required').min(2, 'First name must be at least 2 characters').max(50, 'First name must be less than 50 characters'),
    lastName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Last name is required').min(2, 'Last name must be at least 2 characters').max(50, 'Last name must be less than 50 characters'),
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Email is required').email('Please enter a valid email address').toLowerCase(),
    password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(8, 'Password must be at least 8 characters').max(100, 'Password must be less than 100 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    confirmPassword: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Please confirm your password'),
    role: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$constants$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["Role"].ADMIN,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$constants$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["Role"].REPORTER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$constants$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["Role"].SCOPIST
    ], {
        message: 'Please select a role'
    }),
    // Optional: Agency name for reporters
    agencyName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().optional()
}).refine((data)=>data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: [
        'confirmPassword'
    ]
});
const updateProfileSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters').optional(),
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email('Please enter a valid email address').toLowerCase().optional()
});
const changePasswordSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    currentPassword: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Current password is required'),
    newPassword: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(8, 'Password must be at least 8 characters').max(100, 'Password must be less than 100 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    confirmPassword: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Please confirm your new password')
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
const inviteUserSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email('Please enter a valid email address').toLowerCase(),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
    role: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$constants$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["Role"].REPORTER,
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$constants$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["Role"].SCOPIST
    ], {
        message: 'Please select a role'
    })
});
}),
"[project]/lib/auth-options.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ═══════════════════════════════════════════════════════════════
// NEXTAUTH CONFIGURATION
// ═══════════════════════════════════════════════════════════════
// NextAuth.js v5 configuration with Credentials provider
__turbopack_context__.s([
    "authConfig",
    ()=>authConfig
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$providers$2f$credentials$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/providers/credentials.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$credentials$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/providers/credentials.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/bcryptjs/index.js [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$validations$2f$user$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/validations/user.ts [middleware-edge] (ecmascript)");
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
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$providers$2f$credentials$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["default"])({
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
                    const validatedFields = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$validations$2f$user$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["loginSchema"].safeParse(credentials);
                    if (!validatedFields.success) {
                        console.warn('[Auth] Login attempt with invalid credentials format');
                        return null;
                    }
                    const { email, password } = validatedFields.data;
                    console.log(`[Auth] Login attempt for: ${email}`);
                    // Find user by email
                    const user = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["db"].user.findUnique({
                        where: {
                            email: email.toLowerCase()
                        },
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            passwordHash: true,
                            role: true
                        }
                    });
                    // Check if user exists
                    if (!user || !user.passwordHash) {
                        console.warn(`[Auth] Login attempt for non-existent user: ${email}`);
                        return null;
                    }
                    console.log(`[Auth] Found user: ${user.email}, Has password: ${!!user.passwordHash}`);
                    // Verify password
                    let isPasswordValid = false;
                    try {
                        isPasswordValid = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["compare"])(password, user.passwordHash);
                    } catch (error) {
                        console.error('[Auth] Password comparison error:', error);
                        // Fallback: try synchronous comparison
                        isPasswordValid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$bcryptjs$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["compareSync"])(password, user.passwordHash);
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
                        name: `${user.firstName} ${user.lastName}`,
                        role: user.role
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
"[project]/lib/auth.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ═══════════════════════════════════════════════════════════════
// AUTH HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════
// Utility functions for authentication and authorization
__turbopack_context__.s([
    "auth",
    ()=>auth,
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
    "requireRole",
    ()=>requireRole,
    "signIn",
    ()=>signIn,
    "signOut",
    ()=>signOut
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next-auth/index.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2d$options$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth-options.ts [middleware-edge] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/api/navigation.react-server.js [middleware-edge] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/esm/client/components/navigation.react-server.js [middleware-edge] (ecmascript)");
;
;
;
const { handlers, signIn, signOut, auth } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$index$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2d$options$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["authConfig"]);
async function getCurrentUser() {
    return await auth();
}
async function requireAuth() {
    const session = await getCurrentUser();
    if (!session || !session.user) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$esm$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["redirect"])('/login');
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
} // /**
 //  * Get current user's firm ID
 //  * Returns null if not authenticated or no firm assigned
 //  * 
 //  * @returns Firm ID or null
 //  */
 // export async function getCurrentFirmId(): Promise<string | null> {
 //   const session = await getCurrentUser();
 //   if (!session || !session.user) {
 //     return null;
 //   }
 //   return null; // Firm concept removed
 // }
 // /**
 //  * Require user to have a firm assigned
 //  * Useful for multi-tenant features
 //  * 
 //  * @throws Error if user doesn't have a firm
 //  * @returns Firm ID
 //  */
 // export async function requireFirm(): Promise<string> {
 //   const session = await requireAuth();
 //   // Firm concept removed
 //   throw new Error('Firm concept removed');
 // }
}),
"[project]/middleware.ts [middleware-edge] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE - ROUTE PROTECTION
// ═══════════════════════════════════════════════════════════════
// Protects dashboard, jobs, and API routes from unauthorized access
__turbopack_context__.s([
    "config",
    ()=>config,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [middleware-edge] (ecmascript)");
;
const __TURBOPACK__default__export__ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$middleware$2d$edge$5d$__$28$ecmascript$29$__["auth"])((req)=>{
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    // Define protected routes
    const isApiRoute = nextUrl.pathname.startsWith('/api');
    const isAuthRoute = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register');
    const isProtectedRoute = nextUrl.pathname.startsWith('/dashboard') || nextUrl.pathname.startsWith('/jobs') || nextUrl.pathname.startsWith('/admin') || nextUrl.pathname.startsWith('/reporter') || nextUrl.pathname.startsWith('/scopist');
    // Allow public API routes (auth endpoints)
    if (isApiRoute) {
        if (nextUrl.pathname.startsWith('/api/auth')) {
            return; // Allow NextAuth routes
        }
        // Protect other API routes
        if (!isLoggedIn) {
            return Response.json({
                error: 'Unauthorized'
            }, {
                status: 401
            });
        }
        return;
    }
    // Redirect logged-in users away from auth pages
    if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
    }
    // Redirect non-logged-in users to login
    if (isProtectedRoute && !isLoggedIn) {
        const callbackUrl = nextUrl.pathname + nextUrl.search;
        const loginUrl = new URL('/login', nextUrl);
        loginUrl.searchParams.set('callbackUrl', callbackUrl);
        return Response.redirect(loginUrl);
    }
    return;
});
const config = {
    matcher: [
        /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public files (images, etc.)
     */ '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)'
    ]
};
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__3a0428b1._.js.map