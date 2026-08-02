export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      case_audio: {
        Row: {
          audio_id: string
          case_id: string
          created_at: string
          duration_seconds: number | null
          file_size_bytes: number | null
          id: string
          media_url: string | null
          mime_type: string
          original_filename: string
          owner_user_id: string
          source_index: number
          storage_path: string | null
          uploaded_at: string | null
        }
        Insert: {
          audio_id: string
          case_id: string
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          media_url?: string | null
          mime_type?: string
          original_filename?: string
          owner_user_id?: string
          source_index?: number
          storage_path?: string | null
          uploaded_at?: string | null
        }
        Update: {
          audio_id?: string
          case_id?: string
          created_at?: string
          duration_seconds?: number | null
          file_size_bytes?: number | null
          id?: string
          media_url?: string | null
          mime_type?: string
          original_filename?: string
          owner_user_id?: string
          source_index?: number
          storage_path?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_audio_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["case_id"]
          },
        ]
      }
      case_certifications: {
        Row: {
          case_id: string
          certification_date: string | null
          certification_statement: string
          checklist: Json
          created_at: string
          id: string
          owner_user_id: string
          signature_hash: string | null
          updated_at: string
        }
        Insert: {
          case_id: string
          certification_date?: string | null
          certification_statement?: string
          checklist?: Json
          created_at?: string
          id?: string
          owner_user_id?: string
          signature_hash?: string | null
          updated_at?: string
        }
        Update: {
          case_id?: string
          certification_date?: string | null
          certification_statement?: string
          checklist?: Json
          created_at?: string
          id?: string
          owner_user_id?: string
          signature_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_certifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["case_id"]
          },
        ]
      }
      case_exhibits: {
        Row: {
          admitted: boolean
          case_id: string
          created_at: string
          description: string
          exhibit_id: string
          file_url: string | null
          filename: string | null
          id: string
          label: string
          line_reference: number | null
          marked_by: string | null
          owner_user_id: string
          page_reference: number | null
          storage_path: string | null
        }
        Insert: {
          admitted?: boolean
          case_id: string
          created_at?: string
          description?: string
          exhibit_id: string
          file_url?: string | null
          filename?: string | null
          id?: string
          label: string
          line_reference?: number | null
          marked_by?: string | null
          owner_user_id?: string
          page_reference?: number | null
          storage_path?: string | null
        }
        Update: {
          admitted?: boolean
          case_id?: string
          created_at?: string
          description?: string
          exhibit_id?: string
          file_url?: string | null
          filename?: string | null
          id?: string
          label?: string
          line_reference?: number | null
          marked_by?: string | null
          owner_user_id?: string
          page_reference?: number | null
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_exhibits_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["case_id"]
          },
        ]
      }
      case_files: {
        Row: {
          case_id: string
          checksum: string | null
          created_at: string
          file_id: string
          file_size_bytes: number | null
          file_type: string
          id: string
          mime_type: string
          original_filename: string
          owner_user_id: string
          status: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          case_id: string
          checksum?: string | null
          created_at?: string
          file_id: string
          file_size_bytes?: number | null
          file_type: string
          id?: string
          mime_type?: string
          original_filename: string
          owner_user_id?: string
          status?: string
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          case_id?: string
          checksum?: string | null
          created_at?: string
          file_id?: string
          file_size_bytes?: number | null
          file_type?: string
          id?: string
          mime_type?: string
          original_filename?: string
          owner_user_id?: string
          status?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_files_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["case_id"]
          },
        ]
      }
      cases: {
        Row: {
          case_id: string
          created_at: string
          id: string
          notes: string
          owner_user_id: string
          payload: Json
          proceeding_type: string
          stage: string
          updated_at: string
          version: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          notes?: string
          owner_user_id?: string
          payload?: Json
          proceeding_type?: string
          stage?: string
          updated_at?: string
          version?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          notes?: string
          owner_user_id?: string
          payload?: Json
          proceeding_type?: string
          stage?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address: string
          created_at: string
          details: Json
          email: string
          firm_id: string | null
          id: string
          name: string
          notes: string
          organization: string
          owner_user_id: string
          phone: string
          times_used: number
          type: string
          updated_at: string
        }
        Insert: {
          address?: string
          created_at?: string
          details?: Json
          email?: string
          firm_id?: string | null
          id?: string
          name?: string
          notes?: string
          organization?: string
          owner_user_id?: string
          phone?: string
          times_used?: number
          type: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          details?: Json
          email?: string
          firm_id?: string | null
          id?: string
          name?: string
          notes?: string
          organization?: string
          owner_user_id?: string
          phone?: string
          times_used?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      exports: {
        Row: {
          case_id: string
          created_at: string
          created_by: string | null
          export_id: string
          format: string
          id: string
          metadata: Json
          owner_user_id: string
          storage_path: string
        }
        Insert: {
          case_id: string
          created_at?: string
          created_by?: string | null
          export_id: string
          format: string
          id?: string
          metadata?: Json
          owner_user_id?: string
          storage_path?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          created_by?: string | null
          export_id?: string
          format?: string
          id?: string
          metadata?: Json
          owner_user_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "exports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["case_id"]
          },
        ]
      }
      field_provenance: {
        Row: {
          case_id: string
          confidence_score: number | null
          event_type: string
          field_label: string
          field_path: string
          id: string
          owner_user_id: string
          rejected_source: string | null
          rejected_value: string | null
          resolution_user: string
          resolved_at: string
          source: string
          value: string
          winning_value: string | null
        }
        Insert: {
          case_id: string
          confidence_score?: number | null
          event_type: string
          field_label?: string
          field_path: string
          id?: string
          owner_user_id?: string
          rejected_source?: string | null
          rejected_value?: string | null
          resolution_user?: string
          resolved_at?: string
          source?: string
          value?: string
          winning_value?: string | null
        }
        Update: {
          case_id?: string
          confidence_score?: number | null
          event_type?: string
          field_label?: string
          field_path?: string
          id?: string
          owner_user_id?: string
          rejected_source?: string | null
          rejected_value?: string | null
          resolution_user?: string
          resolved_at?: string
          source?: string
          value?: string
          winning_value?: string | null
        }
        Relationships: []
      }
      firms: {
        Row: {
          address: string
          city: string
          created_at: string
          fax: string
          id: string
          main_phone: string
          name: string
          owner_user_id: string
          state: string
          updated_at: string
          zip: string
        }
        Insert: {
          address?: string
          city?: string
          created_at?: string
          fax?: string
          id?: string
          main_phone?: string
          name?: string
          owner_user_id?: string
          state?: string
          updated_at?: string
          zip?: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          fax?: string
          id?: string
          main_phone?: string
          name?: string
          owner_user_id?: string
          state?: string
          updated_at?: string
          zip?: string
        }
        Relationships: []
      }
      reporter_profiles: {
        Row: {
          created_at: string
          csr_cert_expiration: string | null
          csr_number: string | null
          display_name: string | null
          firm_registration_number: string | null
          initials: string | null
          notary_commission_expiration: string | null
          owner_user_id: string
          preferred_signature_block: string | null
          realtime_capable: boolean
          remote_swear_authority: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          csr_cert_expiration?: string | null
          csr_number?: string | null
          display_name?: string | null
          firm_registration_number?: string | null
          initials?: string | null
          notary_commission_expiration?: string | null
          owner_user_id?: string
          preferred_signature_block?: string | null
          realtime_capable?: boolean
          remote_swear_authority?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          csr_cert_expiration?: string | null
          csr_number?: string | null
          display_name?: string | null
          firm_registration_number?: string | null
          initials?: string | null
          notary_commission_expiration?: string | null
          owner_user_id?: string
          preferred_signature_block?: string | null
          realtime_capable?: boolean
          remote_swear_authority?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      speaker_resolution_current: {
        Row: {
          ai_suggested: boolean
          authority: string
          confidence: number
          created_at: string
          evidence: string
          id: string
          owner_user_id: string
          participant_id: string
          proposed_display_name: string
          proposed_role: string | null
          raw_speaker_id: string
          raw_speaker_index: number
          resolved_at: string
          resolved_by: string
          resolved_label: string | null
          resolved_role: string | null
          transcript_id: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          ai_suggested?: boolean
          authority?: string
          confidence?: number
          created_at?: string
          evidence?: string
          id?: string
          owner_user_id?: string
          participant_id: string
          proposed_display_name?: string
          proposed_role?: string | null
          raw_speaker_id: string
          raw_speaker_index: number
          resolved_at?: string
          resolved_by?: string
          resolved_label?: string | null
          resolved_role?: string | null
          transcript_id: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          ai_suggested?: boolean
          authority?: string
          confidence?: number
          created_at?: string
          evidence?: string
          id?: string
          owner_user_id?: string
          participant_id?: string
          proposed_display_name?: string
          proposed_role?: string | null
          raw_speaker_id?: string
          raw_speaker_index?: number
          resolved_at?: string
          resolved_by?: string
          resolved_label?: string | null
          resolved_role?: string | null
          transcript_id?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "speaker_resolution_current_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["transcript_id"]
          },
          {
            foreignKeyName: "speaker_resolution_current_transcript_id_raw_speaker_id_fkey"
            columns: ["transcript_id", "raw_speaker_id"]
            isOneToOne: true
            referencedRelation: "transcript_speakers"
            referencedColumns: ["transcript_id", "speaker_id"]
          },
        ]
      }
      speaker_resolution_history: {
        Row: {
          created_at: string
          owner_user_id: string
          participant_id: string
          raw_speaker_id: string
          raw_speaker_index: number
          resolution_id: string
          resolved_at: string
          resolved_by: string
          resolved_label: string | null
          resolved_role: string | null
          supersedes_resolution_id: string | null
          transcript_id: string
        }
        Insert: {
          created_at?: string
          owner_user_id?: string
          participant_id: string
          raw_speaker_id: string
          raw_speaker_index: number
          resolution_id?: string
          resolved_at?: string
          resolved_by?: string
          resolved_label?: string | null
          resolved_role?: string | null
          supersedes_resolution_id?: string | null
          transcript_id: string
        }
        Update: {
          created_at?: string
          owner_user_id?: string
          participant_id?: string
          raw_speaker_id?: string
          raw_speaker_index?: number
          resolution_id?: string
          resolved_at?: string
          resolved_by?: string
          resolved_label?: string | null
          resolved_role?: string | null
          supersedes_resolution_id?: string | null
          transcript_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaker_resolution_history_supersedes_resolution_id_fkey"
            columns: ["supersedes_resolution_id"]
            isOneToOne: false
            referencedRelation: "speaker_resolution_history"
            referencedColumns: ["resolution_id"]
          },
          {
            foreignKeyName: "speaker_resolution_history_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["transcript_id"]
          },
          {
            foreignKeyName: "speaker_resolution_history_transcript_id_raw_speaker_id_fkey"
            columns: ["transcript_id", "raw_speaker_id"]
            isOneToOne: false
            referencedRelation: "transcript_speakers"
            referencedColumns: ["transcript_id", "speaker_id"]
          },
        ]
      }
      transcript_audit_log: {
        Row: {
          action: string
          actor: string | null
          after_text: string | null
          before_text: string | null
          case_id: string | null
          change_id: string
          created_at: string
          id: string
          job_id: string | null
          new_text: string | null
          old_text: string | null
          owner_user_id: string
          reviewer_user_id: string | null
          source: string
          suggestion_id: string | null
          transcript_id: string
          utterance_id: string | null
          word_id: string | null
        }
        Insert: {
          action?: string
          actor?: string | null
          after_text?: string | null
          before_text?: string | null
          case_id?: string | null
          change_id: string
          created_at?: string
          id?: string
          job_id?: string | null
          new_text?: string | null
          old_text?: string | null
          owner_user_id?: string
          reviewer_user_id?: string | null
          source?: string
          suggestion_id?: string | null
          transcript_id: string
          utterance_id?: string | null
          word_id?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          after_text?: string | null
          before_text?: string | null
          case_id?: string | null
          change_id?: string
          created_at?: string
          id?: string
          job_id?: string | null
          new_text?: string | null
          old_text?: string | null
          owner_user_id?: string
          reviewer_user_id?: string | null
          source?: string
          suggestion_id?: string | null
          transcript_id?: string
          utterance_id?: string | null
          word_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transcript_audit_log_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["transcript_id"]
          },
        ]
      }
      transcript_review_state: {
        Row: {
          id: string
          owner_user_id: string
          review_complete: boolean
          review_pct: number | null
          reviewed_word_ids: Json
          transcript_id: string
          unreviewed_word_ids: Json
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id?: string
          review_complete?: boolean
          review_pct?: number | null
          reviewed_word_ids?: Json
          transcript_id: string
          unreviewed_word_ids?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          owner_user_id?: string
          review_complete?: boolean
          review_pct?: number | null
          reviewed_word_ids?: Json
          transcript_id?: string
          unreviewed_word_ids?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_review_state_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: true
            referencedRelation: "transcripts"
            referencedColumns: ["transcript_id"]
          },
        ]
      }
      transcript_speakers: {
        Row: {
          assigned_name: string | null
          deepgram_speaker: number | null
          display_name: string
          id: string
          job_id: string | null
          owner_user_id: string
          role: string | null
          speaker_id: string
          speaker_index: number | null
          speaker_label: string | null
          speaker_role: string | null
          transcript_id: string
          word_count: number
        }
        Insert: {
          assigned_name?: string | null
          deepgram_speaker?: number | null
          display_name?: string
          id?: string
          job_id?: string | null
          owner_user_id?: string
          role?: string | null
          speaker_id: string
          speaker_index?: number | null
          speaker_label?: string | null
          speaker_role?: string | null
          transcript_id: string
          word_count?: number
        }
        Update: {
          assigned_name?: string | null
          deepgram_speaker?: number | null
          display_name?: string
          id?: string
          job_id?: string | null
          owner_user_id?: string
          role?: string | null
          speaker_id?: string
          speaker_index?: number | null
          speaker_label?: string | null
          speaker_role?: string | null
          transcript_id?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "transcript_speakers_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["transcript_id"]
          },
        ]
      }
      transcript_suggestions: {
        Row: {
          confidence: number
          created_at: string
          id: string
          original_text: string
          owner_user_id: string
          reason: string
          status: string
          suggested_text: string
          suggestion_id: string
          transcript_id: string
          utterance_id: string
          word_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          id?: string
          original_text: string
          owner_user_id?: string
          reason?: string
          status?: string
          suggested_text: string
          suggestion_id: string
          transcript_id: string
          utterance_id: string
          word_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          original_text?: string
          owner_user_id?: string
          reason?: string
          status?: string
          suggested_text?: string
          suggestion_id?: string
          transcript_id?: string
          utterance_id?: string
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_suggestions_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["transcript_id"]
          },
        ]
      }
      transcript_utterances: {
        Row: {
          ai_suggested_line_type: string | null
          avg_confidence: number | null
          end_time: number
          excluded_from_output: boolean | null
          exclusion_reason: string | null
          id: string
          is_synthetic: boolean | null
          job_id: string | null
          line_type: string | null
          manually_reassigned: boolean
          ordinal: number
          owner_user_id: string
          speaker_id: string
          speaker_index: number | null
          speaker_label: string | null
          start_time: number
          text: string | null
          transcript_id: string
          utterance_id: string
          utterance_index: number | null
        }
        Insert: {
          ai_suggested_line_type?: string | null
          avg_confidence?: number | null
          end_time: number
          excluded_from_output?: boolean | null
          exclusion_reason?: string | null
          id?: string
          is_synthetic?: boolean | null
          job_id?: string | null
          line_type?: string | null
          manually_reassigned?: boolean
          ordinal: number
          owner_user_id?: string
          speaker_id: string
          speaker_index?: number | null
          speaker_label?: string | null
          start_time: number
          text?: string | null
          transcript_id: string
          utterance_id: string
          utterance_index?: number | null
        }
        Update: {
          ai_suggested_line_type?: string | null
          avg_confidence?: number | null
          end_time?: number
          excluded_from_output?: boolean | null
          exclusion_reason?: string | null
          id?: string
          is_synthetic?: boolean | null
          job_id?: string | null
          line_type?: string | null
          manually_reassigned?: boolean
          ordinal?: number
          owner_user_id?: string
          speaker_id?: string
          speaker_index?: number | null
          speaker_label?: string | null
          start_time?: number
          text?: string | null
          transcript_id?: string
          utterance_id?: string
          utterance_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transcript_utterances_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["transcript_id"]
          },
        ]
      }
      transcript_words: {
        Row: {
          ai_confidence: number | null
          ai_suggestion: string | null
          ai_suggestion_reason: string | null
          ai_suggestion_status: string | null
          confidence: number
          edited: boolean
          end_time: number
          id: string
          is_filler: boolean
          job_id: string | null
          ordinal: number
          owner_user_id: string
          raw_text: string
          removed: boolean
          reviewed: boolean
          speaker_id: string
          speaker_index: number | null
          start_time: number
          text: string
          transcript_id: string
          utterance_id: string
          word_id: string
          word_index: number | null
          working_text: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_suggestion?: string | null
          ai_suggestion_reason?: string | null
          ai_suggestion_status?: string | null
          confidence: number
          edited?: boolean
          end_time: number
          id?: string
          is_filler?: boolean
          job_id?: string | null
          ordinal: number
          owner_user_id?: string
          raw_text: string
          removed?: boolean
          reviewed?: boolean
          speaker_id: string
          speaker_index?: number | null
          start_time: number
          text: string
          transcript_id: string
          utterance_id: string
          word_id: string
          word_index?: number | null
          working_text?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_suggestion?: string | null
          ai_suggestion_reason?: string | null
          ai_suggestion_status?: string | null
          confidence?: number
          edited?: boolean
          end_time?: number
          id?: string
          is_filler?: boolean
          job_id?: string | null
          ordinal?: number
          owner_user_id?: string
          raw_text?: string
          removed?: boolean
          reviewed?: boolean
          speaker_id?: string
          speaker_index?: number | null
          start_time?: number
          text?: string
          transcript_id?: string
          utterance_id?: string
          word_id?: string
          word_index?: number | null
          working_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transcript_words_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["transcript_id"]
          },
          {
            foreignKeyName: "transcript_words_transcript_id_utterance_id_fkey"
            columns: ["transcript_id", "utterance_id"]
            isOneToOne: false
            referencedRelation: "transcript_utterances"
            referencedColumns: ["transcript_id", "utterance_id"]
          },
        ]
      }
      transcription_jobs: {
        Row: {
          auto_seed_audit: Json | null
          callback_token_hash: string
          case_id: string
          created_at: string
          error: string | null
          finalize_attempts: number
          finalize_started_at: string | null
          id: string
          owner_user_id: string
          request_path: string | null
          response_path: string | null
          source_audio_id: string | null
          source_index: number | null
          status: string
          transcript_id: string
          updated_at: string
          watchdog_attempts: number
        }
        Insert: {
          auto_seed_audit?: Json | null
          callback_token_hash: string
          case_id: string
          created_at?: string
          error?: string | null
          finalize_attempts?: number
          finalize_started_at?: string | null
          id?: string
          owner_user_id?: string
          request_path?: string | null
          response_path?: string | null
          source_audio_id?: string | null
          source_index?: number | null
          status?: string
          transcript_id: string
          updated_at?: string
          watchdog_attempts?: number
        }
        Update: {
          auto_seed_audit?: Json | null
          callback_token_hash?: string
          case_id?: string
          created_at?: string
          error?: string | null
          finalize_attempts?: number
          finalize_started_at?: string | null
          id?: string
          owner_user_id?: string
          request_path?: string | null
          response_path?: string | null
          source_audio_id?: string | null
          source_index?: number | null
          status?: string
          transcript_id?: string
          updated_at?: string
          watchdog_attempts?: number
        }
        Relationships: [
          {
            foreignKeyName: "transcription_jobs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["case_id"]
          },
        ]
      }
      transcripts: {
        Row: {
          ai_review_meta: Json | null
          avg_confidence: number | null
          based_on: string | null
          case_id: string
          created_at: string
          deepgram_request_id: string | null
          duration: number | null
          duration_seconds: number | null
          engine: string | null
          id: string
          job_id: string
          last_error: string | null
          media_kind: string
          media_url: string | null
          original_captured_at: string | null
          original_checksum: string | null
          original_storage_path: string | null
          owner_user_id: string
          pipeline_state: string
          raw_checksum: string | null
          raw_storage_path: string | null
          sequence_index: number
          session_id: string | null
          source_filename: string | null
          speaker_count: number
          speaker_map_confirmed: boolean
          speaker_map_verified: boolean
          status: string
          transcript_id: string
          transcription_source: string
          updated_at: string
          utterance_count: number
          word_count: number
        }
        Insert: {
          ai_review_meta?: Json | null
          avg_confidence?: number | null
          based_on?: string | null
          case_id: string
          created_at?: string
          deepgram_request_id?: string | null
          duration?: number | null
          duration_seconds?: number | null
          engine?: string | null
          id?: string
          job_id: string
          last_error?: string | null
          media_kind?: string
          media_url?: string | null
          original_captured_at?: string | null
          original_checksum?: string | null
          original_storage_path?: string | null
          owner_user_id?: string
          pipeline_state?: string
          raw_checksum?: string | null
          raw_storage_path?: string | null
          sequence_index?: number
          session_id?: string | null
          source_filename?: string | null
          speaker_count?: number
          speaker_map_confirmed?: boolean
          speaker_map_verified?: boolean
          status?: string
          transcript_id: string
          transcription_source?: string
          updated_at?: string
          utterance_count?: number
          word_count?: number
        }
        Update: {
          ai_review_meta?: Json | null
          avg_confidence?: number | null
          based_on?: string | null
          case_id?: string
          created_at?: string
          deepgram_request_id?: string | null
          duration?: number | null
          duration_seconds?: number | null
          engine?: string | null
          id?: string
          job_id?: string
          last_error?: string | null
          media_kind?: string
          media_url?: string | null
          original_captured_at?: string | null
          original_checksum?: string | null
          original_storage_path?: string | null
          owner_user_id?: string
          pipeline_state?: string
          raw_checksum?: string | null
          raw_storage_path?: string | null
          sequence_index?: number
          session_id?: string | null
          source_filename?: string | null
          speaker_count?: number
          speaker_map_confirmed?: boolean
          speaker_map_verified?: boolean
          status?: string
          transcript_id?: string
          transcription_source?: string
          updated_at?: string
          utterance_count?: number
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["case_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      atomic_ingest_transcript: {
        Args: {
          p_audit: Json
          p_speakers: Json
          p_transcript: Json
          p_utterances: Json
          p_words: Json
        }
        Returns: undefined
      }
      editor_apply_working_changes: {
        Args: {
          p_case_id: string
          p_changes: Json
          p_job_id: string
          p_transcript_id: string
        }
        Returns: number
      }
      editor_resolve_suggestion: {
        Args: {
          p_action: string
          p_case_id: string
          p_edited_text?: string
          p_job_id: string
          p_suggestion_id: string
          p_transcript_id: string
        }
        Returns: boolean
      }
      fail_stale_transcription_jobs: {
        Args: { p_timeout?: string }
        Returns: number
      }
      increment_contact_usage: {
        Args: { contact_id: string }
        Returns: undefined
      }
      save_case_with_certification: {
        Args: { p_case: Json; p_certification: Json; p_updated_at: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
