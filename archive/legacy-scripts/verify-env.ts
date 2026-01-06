import { config } from 'dotenv';
import { resolve } from 'path';

// Explicitly load .env.local
const envPath = resolve(process.cwd(), '.env.local');
const result = config({ path: envPath });

if (result.error) {
  console.error('❌ Failed to load .env.local:', result.error.message);
  process.exit(1);
}

console.log('📁 Loaded environment from: .env.local\n');

// ═══════════════════════════════════════════════════════════════
// ENVIRONMENT VARIABLE VERIFICATION
// ═══════════════════════════════════════════════════════════════

interface EnvCheck {
  name: string;
  required: boolean;
  validator?: (value: string) => boolean;
  validatorMessage?: string;
  category: string;
}

const checks: EnvCheck[] = [
  // Database
  {
    name: 'DATABASE_URL',
    required: true,
    validator: (v) => v.startsWith('postgresql://'),
    validatorMessage: 'Must start with postgresql://',
    category: 'Database',
  },

  // Supabase
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    validator: (v) => v.startsWith('https://'),
    validatorMessage: 'Must be a valid HTTPS URL',
    category: 'Supabase',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    validator: (v) => v.startsWith('eyJ'),
    validatorMessage: 'Must be a valid JWT token',
    category: 'Supabase',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    validator: (v) => v.startsWith('eyJ'),
    validatorMessage: 'Must be a valid JWT token',
    category: 'Supabase',
  },
  {
    name: 'SUPABASE_STORAGE_BUCKET',
    required: true,
    category: 'Supabase',
  },

  // Auth
  {
    name: 'NEXTAUTH_SECRET',
    required: true,
    validator: (v) => v.length >= 32,
    validatorMessage: 'Must be at least 32 characters',
    category: 'Authentication',
  },
  {
    name: 'NEXTAUTH_URL',
    required: true,
    validator: (v) => v.startsWith('http://') || v.startsWith('https://'),
    validatorMessage: 'Must be a valid URL',
    category: 'Authentication',
  },

  // Email
  {
    name: 'SMTP_HOST',
    required: true,
    category: 'Email',
  },
  {
    name: 'SMTP_PORT',
    required: true,
    validator: (v) => !isNaN(Number(v)),
    validatorMessage: 'Must be a valid port number',
    category: 'Email',
  },
  {
    name: 'SMTP_USER',
    required: true,
    category: 'Email',
  },
  {
    name: 'SMTP_PASSWORD',
    required: true,
    category: 'Email',
  },
  {
    name: 'FROM_EMAIL',
    required: true,
    validator: (v) => v.includes('@'),
    validatorMessage: 'Must be a valid email address',
    category: 'Email',
  },

  // Transcription
  {
    name: 'DEEPGRAM_API_KEY',
    required: true,
    category: 'Transcription',
  },
  {
    name: 'USE_DEEPGRAM',
    required: true,
    validator: (v) => v === 'true' || v === 'false',
    validatorMessage: 'Must be "true" or "false"',
    category: 'Transcription',
  },

  // Feature Flags
  {
    name: 'NODE_ENV',
    required: true,
    validator: (v) => ['development', 'production', 'test'].includes(v),
    validatorMessage: 'Must be development, production, or test',
    category: 'Feature Flags',
  },
  {
    name: 'USE_CLOUD_STORAGE',
    required: true,
    validator: (v) => v === 'true' || v === 'false',
    validatorMessage: 'Must be "true" or "false"',
    category: 'Feature Flags',
  },
  {
    name: 'USE_REAL_EXPORT',
    required: true,
    validator: (v) => v === 'true' || v === 'false',
    validatorMessage: 'Must be "true" or "false"',
    category: 'Feature Flags',
  },
  {
    name: 'USE_QUEUE',
    required: false,
    validator: (v) => v === 'true' || v === 'false',
    validatorMessage: 'Must be "true" or "false"',
    category: 'Feature Flags',
  },
  {
    name: 'USE_STRIPE',
    required: false,
    validator: (v) => v === 'true' || v === 'false',
    validatorMessage: 'Must be "true" or "false"',
    category: 'Feature Flags',
  },
];

// Group checks by category
const checksByCategory = checks.reduce((acc, check) => {
  if (!acc[check.category]) {
    acc[check.category] = [];
  }
  acc[check.category].push(check);
  return acc;
}, {} as Record<string, EnvCheck[]>);

// Run verification
let hasErrors = false;
let hasWarnings = false;

console.log('🔍 Verifying environment variables...\n');

for (const [category, categoryChecks] of Object.entries(checksByCategory)) {
  console.log(`\n📦 ${category}`);
  console.log('─'.repeat(50));

  for (const check of categoryChecks) {
    const value = process.env[check.name];
    const isSet = value !== undefined && value !== '';

    if (!isSet) {
      if (check.required) {
        console.log(`  ❌ ${check.name}: MISSING (required)`);
        hasErrors = true;
      } else {
        console.log(`  ⚠️  ${check.name}: Not set (optional)`);
        hasWarnings = true;
      }
      continue;
    }

    // Validate format if validator provided
    if (check.validator && !check.validator(value)) {
      console.log(
        `  ❌ ${check.name}: Invalid format (${check.validatorMessage})`,
      );
      hasErrors = true;
      continue;
    }

    // Show value (masked for sensitive fields)
    const sensitiveFields = [
      'PASSWORD',
      'SECRET',
      'KEY',
      'TOKEN',
      'DATABASE_URL',
    ];
    const isSensitive = sensitiveFields.some((field) =>
      check.name.includes(field),
    );

    if (isSensitive) {
      const masked = value.length > 20 ? `${value.slice(0, 10)}...${value.slice(-4)}` : '****';
      console.log(`  ✅ ${check.name}: Set (${masked})`);
    } else {
      console.log(`  ✅ ${check.name}: ${value}`);
    }
  }
}

// Summary
console.log('\n' + '═'.repeat(50));
console.log('📊 SUMMARY');
console.log('═'.repeat(50));

if (!hasErrors && !hasWarnings) {
  console.log('✅ All required environment variables are set and valid!');
  console.log('\n📝 Next steps:');
  console.log('   1. Test database connection: npx tsx scripts/test-db-connection.ts');
  console.log('   2. Generate Prisma client: npx prisma generate');
  console.log('   3. Push schema: npx prisma db push');
  process.exit(0);
} else {
  if (hasErrors) {
    console.log('❌ Some required variables are missing or invalid.');
    console.log('   Please fix the errors above before proceeding.');
  }
  if (hasWarnings) {
    console.log('⚠️  Some optional variables are not set.');
    console.log('   These are not required but may be needed for certain features.');
  }
  process.exit(hasErrors ? 1 : 0);
}

