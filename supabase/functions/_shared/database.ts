// Permissive database schema for the edge functions.
//
// This project does not generate typed Supabase schema definitions, so the
// functions previously used `type Database = Record<string, never>` — which made
// every query builder resolve to `never` and produced dozens of spurious type
// errors under `deno check`. This shape satisfies supabase-js's schema constraint
// while keeping rows loosely typed; call sites cast to their concrete row types
// (e.g. `data as TranscriptionJobRecord`) as they already do.

type GenericRecord = Record<string, unknown>;

export interface Database {
  public: {
    Tables: {
      [table: string]: {
        Row: GenericRecord;
        Insert: GenericRecord;
        Update: GenericRecord;
        Relationships: [];
      };
    };
    Views: {
      [view: string]: {
        Row: GenericRecord;
        Relationships: [];
      };
    };
    Functions: {
      [fn: string]: {
        Args: GenericRecord;
        Returns: unknown;
      };
    };
    Enums: {
      [enumName: string]: string;
    };
    CompositeTypes: {
      [type: string]: GenericRecord;
    };
  };
}
