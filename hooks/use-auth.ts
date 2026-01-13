// ═══════════════════════════════════════════════════════════════
// USE AUTH HOOK (RE-EXPORT)
// ═══════════════════════════════════════════════════════════════
// Re-exports the canonical useAuth hook from lib/auth/use-auth.ts
// This file exists for backward compatibility
// 
// ✅ Use: import { useAuth } from '@/hooks/use-auth'
// ✅ Or: import { useAuth } from '@/lib/auth/use-auth'
// ═══════════════════════════════════════════════════════════════

export { useAuth } from '@/lib/auth/use-auth';
