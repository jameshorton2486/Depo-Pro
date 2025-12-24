# Error Handling & Logging

## Overview
Depo-Pro includes comprehensive error handling and logging to help track issues and debug problems in both development and production environments.

## Log File Locations

All logs are stored in the `logs/` directory at the project root:

```
c:\Users\james\depo-pro\logs\
├── app-2025-11-09.log      # General application logs (INFO, DEBUG)
├── warn-2025-11-09.log     # Warning logs
└── error-2025-11-09.log    # Error logs only
```

Logs are automatically organized by date (YYYY-MM-DD format) and log level.

**Note:** The `logs/` directory is excluded from Git via `.gitignore`.

## Log Levels

- **DEBUG**: Detailed debugging information (development only)
- **INFO**: General informational messages (user actions, successful operations)
- **WARN**: Warning messages (non-critical issues, validation failures)
- **ERROR**: Error messages (exceptions, failures)

## Using the Logger

### Basic Usage

```typescript
import { logger } from '@/lib/logger';

// Info logging
logger.info('User logged in successfully', 'Authentication', {
  userId: user.id,
  email: user.email,
});

// Warning logging
logger.warn('Invalid input detected', 'Validation', {
  field: 'email',
  value: input,
});

// Error logging
logger.error('Failed to save data', 'Database', error, {
  userId: user.id,
  operation: 'update',
});
```

### Specialized Helpers

```typescript
// API route errors
logger.apiError('/api/auth/register', error, {
  email: 'user@example.com',
});

// Database errors
logger.dbError('User creation', error, {
  email: 'user@example.com',
});

// Authentication errors
logger.authError('Invalid credentials', error, {
  email: 'user@example.com',
});
```

## Error Handling Patterns

### API Routes

```typescript
export async function POST(request: Request) {
  try {
    // Validate input
    if (!data.email) {
      logger.warn('Missing email in request', 'API', { endpoint: '/api/users' });
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Perform operation
    const user = await db.user.create({ data });
    
    logger.info('User created', 'API', { userId: user.id });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    logger.apiError('/api/users', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Server Components

```typescript
export default async function Dashboard() {
  // Authenticate user
  const session = await requireRole([Role.ADMIN]);

  // Fetch data with error handling
  let stats = { users: 0, jobs: 0 };
  
  try {
    stats = await fetchDashboardStats();
  } catch (error) {
    logger.dbError('Fetching dashboard stats', error as Error, {
      userId: session.user.id,
    });
    // Component renders with default values
  }

  return <DashboardView stats={stats} />;
}
```

### Client Components

```typescript
'use client';

export function LoginForm() {
  const handleSubmit = async (data: LoginFormData) => {
    try {
      const res = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (res?.error) {
        console.error('Login failed:', res.error);
        setError('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred');
    }
  };

  // ...
}
```

## Error Boundary

The global error boundary (`app/error.tsx`) catches unhandled errors in the application:

- Displays user-friendly error message
- Logs error to console (development) or error tracking service (production)
- Provides "Try Again" and "Back to Dashboard" options
- Shows error digest for debugging

## Log Rotation

Logs are automatically organized by date. To implement log rotation:

1. **Manual**: Periodically delete old log files
2. **Automated** (recommended for production):
   ```bash
   # Add to cron job or scheduled task
   find logs/ -name "*.log" -mtime +30 -delete
   ```

## Production Considerations

### Environment Variables

Add to your `.env.production`:

```env
# Error tracking service (optional)
SENTRY_DSN=your_sentry_dsn_here
```

### Integration with Error Tracking Services

Update `app/error.tsx` to send errors to your tracking service:

```typescript
useEffect(() => {
  if (process.env.NODE_ENV === 'production') {
    // Send to Sentry, LogRocket, etc.
    Sentry.captureException(error);
  }
}, [error]);
```

### Server Logs

In production, also monitor server logs:
- Vercel: Check Function Logs in dashboard
- Self-hosted: Use PM2 or systemd logs

## Common Log Messages

### Authentication
- `User logged in successfully` - Successful login
- `Login attempt with invalid password` - Failed login attempt
- `Login attempt for non-existent user` - Login with unknown email

### Registration
- `User registered successfully` - New user created
- `Registration attempt with existing email` - Duplicate email
- `Firm created during registration` - New firm created

### Database
- `Database Error during User creation` - Failed to create user
- `Database Error during Firm creation` - Failed to create firm
- `Fetching [dashboard] data` - Failed to load dashboard data

## Viewing Logs

### Development
Logs appear in both:
1. Terminal console (formatted with colors)
2. Log files in `logs/` directory

### Production
1. Check log files on server
2. Use log aggregation service (e.g., Datadog, CloudWatch)
3. Monitor error tracking dashboard (e.g., Sentry)

## Best Practices

1. **Always include context**: Add relevant data to logs
   ```typescript
   logger.info('Job created', 'Jobs', { jobId, firmId, userId });
   ```

2. **Don't log sensitive data**: Never log passwords, tokens, or PII
   ```typescript
   // ❌ Bad
   logger.info('Login', 'Auth', { password: user.password });
   
   // ✅ Good
   logger.info('Login', 'Auth', { email: user.email });
   ```

3. **Use appropriate log levels**:
   - DEBUG: Verbose debugging info (dev only)
   - INFO: Normal operations
   - WARN: Recoverable issues
   - ERROR: Failures requiring attention

4. **Log user actions**: Track important user operations
   ```typescript
   logger.info('Job assigned to scopist', 'Jobs', {
     jobId,
     scopistId,
     reporterId,
   });
   ```

5. **Catch and log all database errors**:
   ```typescript
   try {
     await db.job.create({ data });
   } catch (error) {
     logger.dbError('Job creation', error as Error, { firmId, userId });
     throw error; // Re-throw or return error response
   }
   ```
