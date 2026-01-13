// ═══════════════════════════════════════════════════════════════════════════
// ENVIRONMENT VARIABLE VALIDATION
// Fail fast on missing critical configuration
// ═══════════════════════════════════════════════════════════════════════════

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  validate?: (value: string) => boolean;
}

const ENV_VARS: EnvVar[] = [
  // Supabase - Required
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    validate: (v) => v.startsWith('https://') && v.includes('.supabase.co'),
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous key',
    validate: (v) => v.length > 100,
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key (server only)',
    validate: (v) => v.length > 100,
  },

  // Auth - NextAuth removed, using Supabase only

  // Deepgram - Required for transcription
  {
    name: 'DEEPGRAM_API_KEY',
    required: true,
    description: 'Deepgram transcription API key',
    validate: (v) => v.length > 20,
  },

  // Redis - Optional but recommended
  {
    name: 'REDIS_URL',
    required: false,
    description: 'Redis connection URL (for job queue)',
    validate: (v) => v.startsWith('redis://') || v.startsWith('rediss://'),
  },

  // Anthropic - Optional
  {
    name: 'ANTHROPIC_API_KEY',
    required: false,
    description: 'Claude API key (for document extraction)',
    validate: (v) => v.startsWith('sk-'),
  },
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];

    if (!value) {
      if (envVar.required) {
        errors.push(`Missing required env var: ${envVar.name} - ${envVar.description}`);
      } else {
        warnings.push(`Missing optional env var: ${envVar.name} - ${envVar.description}`);
      }
      continue;
    }

    if (envVar.validate && !envVar.validate(value)) {
      errors.push(`Invalid env var: ${envVar.name} - validation failed`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function assertEnvironment(): void {
  const result = validateEnvironment();

  if (result.warnings.length > 0) {
    console.warn('Environment warnings:');
    result.warnings.forEach(w => console.warn(`  ⚠️ ${w}`));
  }

  if (!result.valid) {
    console.error('Environment validation failed:');
    result.errors.forEach(e => console.error(`  ❌ ${e}`));
    throw new Error('Environment validation failed - check logs above');
  }
}

// Export for use in startup
export function getEnvSummary(): Record<string, 'set' | 'missing'> {
  const summary: Record<string, 'set' | 'missing'> = {};
  for (const envVar of ENV_VARS) {
    summary[envVar.name] = process.env[envVar.name] ? 'set' : 'missing';
  }
  return summary;
}
