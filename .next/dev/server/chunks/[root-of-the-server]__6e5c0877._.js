module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/@prisma/client [external] (@prisma/client, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("@prisma/client", () => require("@prisma/client"));

module.exports = mod;
}),
"[project]/lib/db.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
"[project]/lib/logger.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ═══════════════════════════════════════════════════════════════
// LOGGER UTILITY
// ═══════════════════════════════════════════════════════════════
// Centralized logging with file output and console formatting
// Note: Only works in Node.js runtime (not Edge Runtime)
__turbopack_context__.s([
    "LogLevel",
    ()=>LogLevel,
    "logDebug",
    ()=>logDebug,
    "logError",
    ()=>logError,
    "logInfo",
    ()=>logInfo,
    "logWarn",
    ()=>logWarn,
    "logger",
    ()=>logger
]);
var LogLevel = /*#__PURE__*/ function(LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
    return LogLevel;
}({});
// Check if we're in a Node.js environment (not Edge Runtime)
const isNodeRuntime = typeof process !== 'undefined' && typeof process.cwd === 'function';
class Logger {
    logsDir;
    fs;
    path;
    constructor(){
        // Only initialize file logging in Node.js runtime
        if (isNodeRuntime) {
            this.initializeNodeLogger();
        }
    }
    async initializeNodeLogger() {
        try {
            // Dynamic imports only work in Node.js runtime
            this.fs = await __turbopack_context__.A("[externals]/fs [external] (fs, cjs, async loader)");
            this.path = await __turbopack_context__.A("[externals]/path [external] (path, cjs, async loader)");
            this.logsDir = this.path.join(process.cwd(), 'logs');
            this.ensureLogsDirectory();
        } catch  {
            // Silently fail if not in Node.js runtime
            console.warn('Logger: File logging not available in Edge Runtime');
        }
    }
    ensureLogsDirectory() {
        if (this.fs && this.logsDir && !this.fs.existsSync(this.logsDir)) {
            this.fs.mkdirSync(this.logsDir, {
                recursive: true
            });
        }
    }
    getLogFileName(level) {
        if (!this.path || !this.logsDir) return undefined;
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        switch(level){
            case "ERROR":
                return this.path.join(this.logsDir, `error-${date}.log`);
            case "WARN":
                return this.path.join(this.logsDir, `warn-${date}.log`);
            default:
                return this.path.join(this.logsDir, `app-${date}.log`);
        }
    }
    formatLogEntry(entry) {
        const parts = [
            `[${entry.timestamp}]`,
            `[${entry.level}]`,
            entry.context ? `[${entry.context}]` : '',
            entry.message
        ].filter(Boolean);
        let formatted = parts.join(' ');
        if (entry.data) {
            formatted += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
        }
        if (entry.stack) {
            formatted += `\n  Stack: ${entry.stack}`;
        }
        return formatted;
    }
    writeToFile(level, entry) {
        // Only write to file in Node.js runtime
        if (!this.fs || !isNodeRuntime) return;
        try {
            const fileName = this.getLogFileName(level);
            if (!fileName) return;
            const formatted = this.formatLogEntry(entry) + '\n';
            this.fs.appendFileSync(fileName, formatted, 'utf-8');
        } catch (error) {
            // Fallback to console if file write fails
            console.error('Failed to write to log file:', error);
        }
    }
    log(level, message, context, data, error) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
            data,
            stack: error?.stack
        };
        // Write to file (only in Node.js runtime)
        this.writeToFile(level, entry);
        // Always log to console
        const consoleMethod = level === "ERROR" ? console.error : level === "WARN" ? console.warn : console.log;
        consoleMethod(this.formatLogEntry(entry));
    }
    debug(message, context, data) {
        // Skip debug logs in production
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        this.log("DEBUG", message, context, data);
    }
    info(message, context, data) {
        this.log("INFO", message, context, data);
    }
    warn(message, context, data) {
        this.log("WARN", message, context, data);
    }
    error(message, context, error, data) {
        this.log("ERROR", message, context, {
            ...data,
            errorMessage: error?.message
        }, error);
    }
    // Helper for API route errors
    apiError(route, error, additionalData) {
        this.error(`API Error in ${route}`, 'API', error, {
            route,
            ...additionalData
        });
    }
    // Helper for database errors
    dbError(operation, error, additionalData) {
        this.error(`Database Error during ${operation}`, 'Database', error, {
            operation,
            ...additionalData
        });
    }
    // Helper for authentication errors
    authError(message, error, additionalData) {
        this.error(`Auth Error: ${message}`, 'Authentication', error, additionalData);
    }
}
const logger = new Logger();
const logDebug = (message, context, data)=>logger.debug(message, context, data);
const logInfo = (message, context, data)=>logger.info(message, context, data);
const logWarn = (message, context, data)=>logger.warn(message, context, data);
const logError = (message, context, error, data)=>logger.error(message, context, error, data);
}),
"[project]/app/api/auth/register/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// ═══════════════════════════════════════════════════════════════
// USER REGISTRATION API ENDPOINT
// ═══════════════════════════════════════════════════════════════
// Handles new user registration and optional firm creation
__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/logger.ts [app-route] (ecmascript)");
;
;
;
async function POST(request) {
    try {
        const body = await request.json();
        const { name, email, passwordHash, role, firmName } = body;
        // Validate required fields
        if (!name || !email || !passwordHash || !role) {
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].warn('Registration attempt with missing fields', 'Registration', {
                hasName: !!name,
                hasEmail: !!email,
                hasPassword: !!passwordHash,
                hasRole: !!role
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Missing required fields'
            }, {
                status: 400
            });
        }
        // Check if user already exists
        const existingUser = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].user.findUnique({
            where: {
                email: email.toLowerCase()
            }
        });
        if (existingUser) {
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].warn('Registration attempt with existing email', 'Registration', {
                email
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'A user with this email already exists'
            }, {
                status: 409
            });
        }
        // Create firm if firmName is provided
        let firmId = null;
        if (firmName && firmName.trim()) {
            try {
                const firm = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].firm.create({
                    data: {
                        name: firmName.trim(),
                        type: 'INDEPENDENT',
                        contactEmail: email.toLowerCase()
                    }
                });
                firmId = firm.id;
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].info('Firm created during registration', 'Registration', {
                    firmId,
                    firmName: firmName.trim()
                });
            } catch (error) {
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].dbError('Firm creation', error, {
                    firmName
                });
                return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: 'Failed to create firm'
                }, {
                    status: 500
                });
            }
        }
        // Create user
        try {
            const user = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["db"].user.create({
                data: {
                    name,
                    email: email.toLowerCase(),
                    passwordHash,
                    role: role,
                    firmId,
                    isActive: true
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true
                }
            });
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].info('User registered successfully', 'Registration', {
                userId: user.id,
                email: user.email,
                role: user.role,
                firmId
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                message: 'User registered successfully',
                user
            }, {
                status: 201
            });
        } catch (error) {
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].dbError('User creation', error, {
                email,
                role
            });
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Failed to create user account'
            }, {
                status: 500
            });
        }
    } catch (error) {
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logger"].apiError('/api/auth/register', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to register user. Please try again.'
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__6e5c0877._.js.map