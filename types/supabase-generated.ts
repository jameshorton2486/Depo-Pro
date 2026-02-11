/**
 * Supabase Generated Types
 *
 * IMPORTANT: These types need to be regenerated after database migrations are applied.
 *
 * To regenerate:
 * 1. Ensure Docker is running
 * 2. Run: npx supabase start
 * 3. Run: npx supabase db reset (to apply all migrations)
 * 4. Run: npx supabase gen types typescript --local > types/supabase-generated.ts
 *
 * Alternatively, if using a remote database:
 * npx supabase gen types typescript --project-id <project-ref> --schema public > types/supabase-generated.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // Types will be generated here after running migrations
      [key: string]: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
