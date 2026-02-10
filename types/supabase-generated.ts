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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      Agency: {
        Row: {
          address: string | null
          city: string | null
          createdAt: string
          email: string | null
          id: string
          maxFirms: number
          maxReporters: number
          name: string
          phone: string | null
          planType: Database["public"]["Enums"]["AgencyPlanType"]
          settings: Json | null
          slug: string
          state: string | null
          updatedAt: string
          zipCode: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          createdAt?: string
          email?: string | null
          id: string
          maxFirms?: number
          maxReporters?: number
          name: string
          phone?: string | null
          planType?: Database["public"]["Enums"]["AgencyPlanType"]
          settings?: Json | null
          slug: string
          state?: string | null
          updatedAt: string
          zipCode?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          createdAt?: string
          email?: string | null
          id?: string
          maxFirms?: number
          maxReporters?: number
          name?: string
          phone?: string | null
          planType?: Database["public"]["Enums"]["AgencyPlanType"]
          settings?: Json | null
          slug?: string
          state?: string | null
          updatedAt?: string
          zipCode?: string | null
        }
        Relationships: []
      }
      AIRule: {
        Row: {
          category: Database["public"]["Enums"]["RuleCategory"]
          createdAt: string
          description: string
          enabled: boolean
          examples: Json | null
          id: string
          name: string
          pattern: string | null
          priority: number
          prompt: string | null
          replacement: string | null
          ruleType: string
          updatedAt: string
        }
        Insert: {
          category: Database["public"]["Enums"]["RuleCategory"]
          createdAt?: string
          description: string
          enabled?: boolean
          examples?: Json | null
          id: string
          name: string
          pattern?: string | null
          priority?: number
          prompt?: string | null
          replacement?: string | null
          ruleType: string
          updatedAt: string
        }
        Update: {
          category?: Database["public"]["Enums"]["RuleCategory"]
          createdAt?: string
          description?: string
          enabled?: boolean
          examples?: Json | null
          id?: string
          name?: string
          pattern?: string | null
          priority?: number
          prompt?: string | null
          replacement?: string | null
          ruleType?: string
          updatedAt?: string
        }
        Relationships: []
      }
      Attorney: {
        Row: {
          address: string | null
          barNumber: string | null
          barState: string | null
          city: string | null
          createdAt: string
          defaultRushPreference: string | null
          email: string | null
          fax: string | null
          firmName: string | null
          firstName: string
          id: string
          lastName: string
          licensureStates: string[] | null
          normalizedName: string
          phone: string | null
          preferredDelivery: string | null
          preferredFormat: string | null
          state: string | null
          updatedAt: string
          zipCode: string | null
        }
        Insert: {
          address?: string | null
          barNumber?: string | null
          barState?: string | null
          city?: string | null
          createdAt?: string
          defaultRushPreference?: string | null
          email?: string | null
          fax?: string | null
          firmName?: string | null
          firstName: string
          id: string
          lastName: string
          licensureStates?: string[] | null
          normalizedName: string
          phone?: string | null
          preferredDelivery?: string | null
          preferredFormat?: string | null
          state?: string | null
          updatedAt: string
          zipCode?: string | null
        }
        Update: {
          address?: string | null
          barNumber?: string | null
          barState?: string | null
          city?: string | null
          createdAt?: string
          defaultRushPreference?: string | null
          email?: string | null
          fax?: string | null
          firmName?: string | null
          firstName?: string
          id?: string
          lastName?: string
          licensureStates?: string[] | null
          normalizedName?: string
          phone?: string | null
          preferredDelivery?: string | null
          preferredFormat?: string | null
          state?: string | null
          updatedAt?: string
          zipCode?: string | null
        }
        Relationships: []
      }
      AttorneyProfile: {
        Row: {
          barNumber: string | null
          barState: string | null
          billingAddress: string | null
          billingEmail: string | null
          createdAt: string
          defaultExportFormat: string | null
          emailNotifications: boolean
          firmAddress: string | null
          firmName: string | null
          firmPhone: string | null
          id: string
          practiceAreas: string[] | null
          smsNotifications: boolean
          updatedAt: string
          userId: string
        }
        Insert: {
          barNumber?: string | null
          barState?: string | null
          billingAddress?: string | null
          billingEmail?: string | null
          createdAt?: string
          defaultExportFormat?: string | null
          emailNotifications?: boolean
          firmAddress?: string | null
          firmName?: string | null
          firmPhone?: string | null
          id: string
          practiceAreas?: string[] | null
          smsNotifications?: boolean
          updatedAt: string
          userId: string
        }
        Update: {
          barNumber?: string | null
          barState?: string | null
          billingAddress?: string | null
          billingEmail?: string | null
          createdAt?: string
          defaultExportFormat?: string | null
          emailNotifications?: boolean
          firmAddress?: string | null
          firmName?: string | null
          firmPhone?: string | null
          id?: string
          practiceAreas?: string[] | null
          smsNotifications?: boolean
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "AttorneyProfile_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      AttorneyTranscript: {
        Row: {
          caseName: string | null
          deponent: string
          depositionDate: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["AttorneyTranscriptStatus"]
          totalLines: number
          totalPages: number
          transcriptData: Json
          uploadedAt: string
          uploadedById: string
        }
        Insert: {
          caseName?: string | null
          deponent: string
          depositionDate?: string | null
          id: string
          name: string
          status?: Database["public"]["Enums"]["AttorneyTranscriptStatus"]
          totalLines: number
          totalPages: number
          transcriptData: Json
          uploadedAt?: string
          uploadedById: string
        }
        Update: {
          caseName?: string | null
          deponent?: string
          depositionDate?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["AttorneyTranscriptStatus"]
          totalLines?: number
          totalPages?: number
          transcriptData?: Json
          uploadedAt?: string
          uploadedById?: string
        }
        Relationships: [
          {
            foreignKeyName: "AttorneyTranscript_uploadedById_fkey"
            columns: ["uploadedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      AudioEnhancement: {
        Row: {
          auphonicAudioUrl: string | null
          auphonicCostCents: number | null
          auphonicProcessed: boolean
          auphonicQualityScore: number | null
          completedAt: string | null
          createdAt: string
          decisionReason: string | null
          dolbyAudioUrl: string | null
          dolbyCostCents: number | null
          dolbyProcessed: boolean
          dolbyQualityScore: number | null
          engineUsed: string
          enhancementMode: Database["public"]["Enums"]["EnhancementMode"]
          finalAudioUrl: string
          id: string
          jobId: string
          originalAudioUrl: string
          originalDuration: number
          originalFileSize: number
          qualityFlags: Json | null
          totalCostCents: number
        }
        Insert: {
          auphonicAudioUrl?: string | null
          auphonicCostCents?: number | null
          auphonicProcessed?: boolean
          auphonicQualityScore?: number | null
          completedAt?: string | null
          createdAt?: string
          decisionReason?: string | null
          dolbyAudioUrl?: string | null
          dolbyCostCents?: number | null
          dolbyProcessed?: boolean
          dolbyQualityScore?: number | null
          engineUsed: string
          enhancementMode: Database["public"]["Enums"]["EnhancementMode"]
          finalAudioUrl: string
          id: string
          jobId: string
          originalAudioUrl: string
          originalDuration: number
          originalFileSize: number
          qualityFlags?: Json | null
          totalCostCents: number
        }
        Update: {
          auphonicAudioUrl?: string | null
          auphonicCostCents?: number | null
          auphonicProcessed?: boolean
          auphonicQualityScore?: number | null
          completedAt?: string | null
          createdAt?: string
          decisionReason?: string | null
          dolbyAudioUrl?: string | null
          dolbyCostCents?: number | null
          dolbyProcessed?: boolean
          dolbyQualityScore?: number | null
          engineUsed?: string
          enhancementMode?: Database["public"]["Enums"]["EnhancementMode"]
          finalAudioUrl?: string
          id?: string
          jobId?: string
          originalAudioUrl?: string
          originalDuration?: number
          originalFileSize?: number
          qualityFlags?: Json | null
          totalCostCents?: number
        }
        Relationships: []
      }
      AudioProcessingSession: {
        Row: {
          cancellationReason: string | null
          cancelledAt: string | null
          cancelledByUserId: string | null
          completedAt: string | null
          createdAt: string
          durationMinutes: number | null
          enhancementType:
            | Database["public"]["Enums"]["AudioEnhancementType"]
            | null
          feeCents: number | null
          id: string
          jobId: string
          metadata: Json | null
          operatorNotes: string | null
          operatorUserId: string | null
          outputFileId: string | null
          processingStartedAt: string | null
          processingTimeMinutes: number | null
          processingType: string
          provider: string | null
          startedAt: string
          status: Database["public"]["Enums"]["AudioSessionStatus"]
          updatedAt: string
        }
        Insert: {
          cancellationReason?: string | null
          cancelledAt?: string | null
          cancelledByUserId?: string | null
          completedAt?: string | null
          createdAt?: string
          durationMinutes?: number | null
          enhancementType?:
            | Database["public"]["Enums"]["AudioEnhancementType"]
            | null
          feeCents?: number | null
          id: string
          jobId: string
          metadata?: Json | null
          operatorNotes?: string | null
          operatorUserId?: string | null
          outputFileId?: string | null
          processingStartedAt?: string | null
          processingTimeMinutes?: number | null
          processingType: string
          provider?: string | null
          startedAt?: string
          status?: Database["public"]["Enums"]["AudioSessionStatus"]
          updatedAt: string
        }
        Update: {
          cancellationReason?: string | null
          cancelledAt?: string | null
          cancelledByUserId?: string | null
          completedAt?: string | null
          createdAt?: string
          durationMinutes?: number | null
          enhancementType?:
            | Database["public"]["Enums"]["AudioEnhancementType"]
            | null
          feeCents?: number | null
          id?: string
          jobId?: string
          metadata?: Json | null
          operatorNotes?: string | null
          operatorUserId?: string | null
          outputFileId?: string | null
          processingStartedAt?: string | null
          processingTimeMinutes?: number | null
          processingType?: string
          provider?: string | null
          startedAt?: string
          status?: Database["public"]["Enums"]["AudioSessionStatus"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "AudioProcessingSession_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AudioProcessingSession_operatorUserId_fkey"
            columns: ["operatorUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      AuditLog: {
        Row: {
          action: string
          actorUserId: string | null
          createdAt: string
          firmId: string | null
          id: string
          ipAddress: string | null
          metadata: Json | null
          targetId: string
          targetType: string
          userAgent: string | null
        }
        Insert: {
          action: string
          actorUserId?: string | null
          createdAt?: string
          firmId?: string | null
          id: string
          ipAddress?: string | null
          metadata?: Json | null
          targetId: string
          targetType: string
          userAgent?: string | null
        }
        Update: {
          action?: string
          actorUserId?: string | null
          createdAt?: string
          firmId?: string | null
          id?: string
          ipAddress?: string | null
          metadata?: Json | null
          targetId?: string
          targetType?: string
          userAgent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AuditLog_actorUserId_fkey"
            columns: ["actorUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      BackgroundJob: {
        Row: {
          attempts: number
          completedAt: string | null
          createdAt: string
          id: string
          idempotencyKey: string | null
          lastError: string | null
          maxAttempts: number
          payload: Json
          priority: number
          scheduledFor: string | null
          startedAt: string | null
          status: string
          type: string
          updatedAt: string
        }
        Insert: {
          attempts?: number
          completedAt?: string | null
          createdAt?: string
          id: string
          idempotencyKey?: string | null
          lastError?: string | null
          maxAttempts?: number
          payload: Json
          priority?: number
          scheduledFor?: string | null
          startedAt?: string | null
          status?: string
          type: string
          updatedAt: string
        }
        Update: {
          attempts?: number
          completedAt?: string | null
          createdAt?: string
          id?: string
          idempotencyKey?: string | null
          lastError?: string | null
          maxAttempts?: number
          payload?: Json
          priority?: number
          scheduledFor?: string | null
          startedAt?: string | null
          status?: string
          type?: string
          updatedAt?: string
        }
        Relationships: []
      }
      BillingAccount: {
        Row: {
          billingEmail: string
          createdAt: string
          currency: string
          firmId: string
          id: string
          stripeCustomerId: string | null
          updatedAt: string
        }
        Insert: {
          billingEmail: string
          createdAt?: string
          currency?: string
          firmId: string
          id: string
          stripeCustomerId?: string | null
          updatedAt: string
        }
        Update: {
          billingEmail?: string
          createdAt?: string
          currency?: string
          firmId?: string
          id?: string
          stripeCustomerId?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "BillingAccount_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "Firm"
            referencedColumns: ["id"]
          },
        ]
      }
      BillingPeriod: {
        Row: {
          createdAt: string
          endAt: string
          firmId: string
          id: string
          locked: boolean
          startAt: string
        }
        Insert: {
          createdAt?: string
          endAt: string
          firmId: string
          id: string
          locked?: boolean
          startAt: string
        }
        Update: {
          createdAt?: string
          endAt?: string
          firmId?: string
          id?: string
          locked?: boolean
          startAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "BillingPeriod_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "BillingAccount"
            referencedColumns: ["firmId"]
          },
        ]
      }
      BillingRate: {
        Row: {
          amountCents: number
          createdAt: string
          firmId: string
          id: string
          isActive: boolean
          serviceType: Database["public"]["Enums"]["BillingServiceType"]
          unit: Database["public"]["Enums"]["BillingUnit"]
          version: number
        }
        Insert: {
          amountCents: number
          createdAt?: string
          firmId: string
          id: string
          isActive?: boolean
          serviceType: Database["public"]["Enums"]["BillingServiceType"]
          unit: Database["public"]["Enums"]["BillingUnit"]
          version: number
        }
        Update: {
          amountCents?: number
          createdAt?: string
          firmId?: string
          id?: string
          isActive?: boolean
          serviceType?: Database["public"]["Enums"]["BillingServiceType"]
          unit?: Database["public"]["Enums"]["BillingUnit"]
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "BillingRate_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "BillingAccount"
            referencedColumns: ["firmId"]
          },
        ]
      }
      BillingUsageRecord: {
        Row: {
          firmId: string
          id: string
          invoiceLineItemId: string | null
          jobId: string
          quantity: number
          recordedAt: string
          serviceType: Database["public"]["Enums"]["BillingServiceType"]
          unit: Database["public"]["Enums"]["BillingUnit"]
        }
        Insert: {
          firmId: string
          id: string
          invoiceLineItemId?: string | null
          jobId: string
          quantity: number
          recordedAt?: string
          serviceType: Database["public"]["Enums"]["BillingServiceType"]
          unit: Database["public"]["Enums"]["BillingUnit"]
        }
        Update: {
          firmId?: string
          id?: string
          invoiceLineItemId?: string | null
          jobId?: string
          quantity?: number
          recordedAt?: string
          serviceType?: Database["public"]["Enums"]["BillingServiceType"]
          unit?: Database["public"]["Enums"]["BillingUnit"]
        }
        Relationships: [
          {
            foreignKeyName: "BillingUsageRecord_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "BillingAccount"
            referencedColumns: ["firmId"]
          },
          {
            foreignKeyName: "BillingUsageRecord_invoiceLineItemId_fkey"
            columns: ["invoiceLineItemId"]
            isOneToOne: false
            referencedRelation: "InvoiceLineItem"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          alternateDate1: string | null
          alternateDate2: string | null
          calendarEventId: string | null
          caseName: string
          caseNumber: string | null
          createdAt: string
          deponentContact: string | null
          deponentName: string
          estimatedDuration: number
          eventType: Database["public"]["Enums"]["EventType"]
          firmId: string
          id: string
          interpreterLanguage: string | null
          isRemote: boolean
          location: string | null
          needsInterpreter: boolean
          needsRealtime: boolean
          needsVideographer: boolean
          preferredDate: string
          rejectionReason: string | null
          requestedById: string
          respondedAt: string | null
          respondedById: string | null
          specialNotes: string | null
          status: Database["public"]["Enums"]["BookingRequestStatus"]
          updatedAt: string
        }
        Insert: {
          alternateDate1?: string | null
          alternateDate2?: string | null
          calendarEventId?: string | null
          caseName: string
          caseNumber?: string | null
          createdAt?: string
          deponentContact?: string | null
          deponentName: string
          estimatedDuration?: number
          eventType?: Database["public"]["Enums"]["EventType"]
          firmId: string
          id: string
          interpreterLanguage?: string | null
          isRemote?: boolean
          location?: string | null
          needsInterpreter?: boolean
          needsRealtime?: boolean
          needsVideographer?: boolean
          preferredDate: string
          rejectionReason?: string | null
          requestedById: string
          respondedAt?: string | null
          respondedById?: string | null
          specialNotes?: string | null
          status?: Database["public"]["Enums"]["BookingRequestStatus"]
          updatedAt: string
        }
        Update: {
          alternateDate1?: string | null
          alternateDate2?: string | null
          calendarEventId?: string | null
          caseName?: string
          caseNumber?: string | null
          createdAt?: string
          deponentContact?: string | null
          deponentName?: string
          estimatedDuration?: number
          eventType?: Database["public"]["Enums"]["EventType"]
          firmId?: string
          id?: string
          interpreterLanguage?: string | null
          isRemote?: boolean
          location?: string | null
          needsInterpreter?: boolean
          needsRealtime?: boolean
          needsVideographer?: boolean
          preferredDate?: string
          rejectionReason?: string | null
          requestedById?: string
          respondedAt?: string | null
          respondedById?: string | null
          specialNotes?: string | null
          status?: Database["public"]["Enums"]["BookingRequestStatus"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_calendarEventId_fkey"
            columns: ["calendarEventId"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "Firm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_requestedById_fkey"
            columns: ["requestedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_respondedById_fkey"
            columns: ["respondedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["CalendarAuditAction"]
          createdAt: string
          eventId: string
          id: string
          ipAddress: string | null
          metadata: Json | null
          newValue: Json | null
          performedById: string
          previousValue: Json | null
          userAgent: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["CalendarAuditAction"]
          createdAt?: string
          eventId: string
          id: string
          ipAddress?: string | null
          metadata?: Json | null
          newValue?: Json | null
          performedById: string
          previousValue?: Json | null
          userAgent?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["CalendarAuditAction"]
          createdAt?: string
          eventId?: string
          id?: string
          ipAddress?: string | null
          metadata?: Json | null
          newValue?: Json | null
          performedById?: string
          previousValue?: Json | null
          userAgent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_audit_logs_eventId_fkey"
            columns: ["eventId"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_audit_logs_performedById_fkey"
            columns: ["performedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_notes: {
        Row: {
          content: string
          createdAt: string
          createdById: string
          eventId: string
          id: string
          isInternal: boolean
          updatedAt: string
        }
        Insert: {
          content: string
          createdAt?: string
          createdById: string
          eventId: string
          id: string
          isInternal?: boolean
          updatedAt: string
        }
        Update: {
          content?: string
          createdAt?: string
          createdById?: string
          eventId?: string
          id?: string
          isInternal?: boolean
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_notes_createdById_fkey"
            columns: ["createdById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_event_notes_eventId_fkey"
            columns: ["eventId"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          agencyId: string | null
          allDay: boolean
          assignedReporterId: string | null
          cancellationReason: string | null
          cancelledAt: string | null
          confirmedAt: string | null
          createdAt: string
          createdById: string
          endTime: string
          eventType: Database["public"]["Enums"]["EventType"]
          firmId: string
          id: string
          internalNotes: string | null
          isRecurring: boolean
          isRemote: boolean
          jobId: string | null
          lastRescheduledAt: string | null
          lastRescheduledById: string | null
          location: string | null
          meetingLink: string | null
          notes: string | null
          orderingAttorneyId: string | null
          originalStartTime: string | null
          parentEventId: string | null
          recurrenceEndDate: string | null
          recurrenceRule: string | null
          requestedById: string | null
          rescheduleCount: number
          scheduledById: string | null
          startTime: string
          status: Database["public"]["Enums"]["CalendarEventStatus"]
          timezone: string
          title: string
          updatedAt: string
        }
        Insert: {
          agencyId?: string | null
          allDay?: boolean
          assignedReporterId?: string | null
          cancellationReason?: string | null
          cancelledAt?: string | null
          confirmedAt?: string | null
          createdAt?: string
          createdById: string
          endTime: string
          eventType?: Database["public"]["Enums"]["EventType"]
          firmId: string
          id: string
          internalNotes?: string | null
          isRecurring?: boolean
          isRemote?: boolean
          jobId?: string | null
          lastRescheduledAt?: string | null
          lastRescheduledById?: string | null
          location?: string | null
          meetingLink?: string | null
          notes?: string | null
          orderingAttorneyId?: string | null
          originalStartTime?: string | null
          parentEventId?: string | null
          recurrenceEndDate?: string | null
          recurrenceRule?: string | null
          requestedById?: string | null
          rescheduleCount?: number
          scheduledById?: string | null
          startTime: string
          status?: Database["public"]["Enums"]["CalendarEventStatus"]
          timezone?: string
          title: string
          updatedAt: string
        }
        Update: {
          agencyId?: string | null
          allDay?: boolean
          assignedReporterId?: string | null
          cancellationReason?: string | null
          cancelledAt?: string | null
          confirmedAt?: string | null
          createdAt?: string
          createdById?: string
          endTime?: string
          eventType?: Database["public"]["Enums"]["EventType"]
          firmId?: string
          id?: string
          internalNotes?: string | null
          isRecurring?: boolean
          isRemote?: boolean
          jobId?: string | null
          lastRescheduledAt?: string | null
          lastRescheduledById?: string | null
          location?: string | null
          meetingLink?: string | null
          notes?: string | null
          orderingAttorneyId?: string | null
          originalStartTime?: string | null
          parentEventId?: string | null
          recurrenceEndDate?: string | null
          recurrenceRule?: string | null
          requestedById?: string | null
          rescheduleCount?: number
          scheduledById?: string | null
          startTime?: string
          status?: Database["public"]["Enums"]["CalendarEventStatus"]
          timezone?: string
          title?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_agencyId_fkey"
            columns: ["agencyId"]
            isOneToOne: false
            referencedRelation: "Agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_assignedReporterId_fkey"
            columns: ["assignedReporterId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_createdById_fkey"
            columns: ["createdById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "Firm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_lastRescheduledById_fkey"
            columns: ["lastRescheduledById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_orderingAttorneyId_fkey"
            columns: ["orderingAttorneyId"]
            isOneToOne: false
            referencedRelation: "Attorney"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_parentEventId_fkey"
            columns: ["parentEventId"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_requestedById_fkey"
            columns: ["requestedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_scheduledById_fkey"
            columns: ["scheduledById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Case: {
        Row: {
          caseNumber: string
          caseStyle: string
          county: string | null
          courtName: string | null
          courtType: string | null
          createdAt: string
          createdById: string
          defendants: Json | null
          firmId: string
          id: string
          judgeAssigned: string | null
          notes: string | null
          otherParties: Json | null
          plaintiffs: Json | null
          shortTitle: string | null
          state: string
          status: Database["public"]["Enums"]["CaseStatus"]
          updatedAt: string
        }
        Insert: {
          caseNumber: string
          caseStyle: string
          county?: string | null
          courtName?: string | null
          courtType?: string | null
          createdAt?: string
          createdById: string
          defendants?: Json | null
          firmId: string
          id: string
          judgeAssigned?: string | null
          notes?: string | null
          otherParties?: Json | null
          plaintiffs?: Json | null
          shortTitle?: string | null
          state?: string
          status?: Database["public"]["Enums"]["CaseStatus"]
          updatedAt: string
        }
        Update: {
          caseNumber?: string
          caseStyle?: string
          county?: string | null
          courtName?: string | null
          courtType?: string | null
          createdAt?: string
          createdById?: string
          defendants?: Json | null
          firmId?: string
          id?: string
          judgeAssigned?: string | null
          notes?: string | null
          otherParties?: Json | null
          plaintiffs?: Json | null
          shortTitle?: string | null
          state?: string
          status?: Database["public"]["Enums"]["CaseStatus"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Case_createdById_fkey"
            columns: ["createdById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Case_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "Firm"
            referencedColumns: ["id"]
          },
        ]
      }
      CaseAttorney: {
        Row: {
          address: string | null
          barNumber: string | null
          caseId: string
          city: string | null
          createdAt: string
          deliveryFormat: string | null
          deliveryPriority: string | null
          email: string | null
          fax: string | null
          firm: string | null
          id: string
          name: string
          phone: string | null
          representing: string | null
          role: Database["public"]["Enums"]["AttorneyRole"]
          state: string | null
          updatedAt: string
          zipCode: string | null
        }
        Insert: {
          address?: string | null
          barNumber?: string | null
          caseId: string
          city?: string | null
          createdAt?: string
          deliveryFormat?: string | null
          deliveryPriority?: string | null
          email?: string | null
          fax?: string | null
          firm?: string | null
          id: string
          name: string
          phone?: string | null
          representing?: string | null
          role: Database["public"]["Enums"]["AttorneyRole"]
          state?: string | null
          updatedAt: string
          zipCode?: string | null
        }
        Update: {
          address?: string | null
          barNumber?: string | null
          caseId?: string
          city?: string | null
          createdAt?: string
          deliveryFormat?: string | null
          deliveryPriority?: string | null
          email?: string | null
          fax?: string | null
          firm?: string | null
          id?: string
          name?: string
          phone?: string | null
          representing?: string | null
          role?: Database["public"]["Enums"]["AttorneyRole"]
          state?: string | null
          updatedAt?: string
          zipCode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CaseAttorney_caseId_fkey"
            columns: ["caseId"]
            isOneToOne: false
            referencedRelation: "Case"
            referencedColumns: ["id"]
          },
        ]
      }
      CaseDocument: {
        Row: {
          caseId: string
          documentType: Database["public"]["Enums"]["CaseDocumentType"]
          extractedAt: string | null
          extractedData: Json | null
          extractionError: string | null
          extractionStatus: Database["public"]["Enums"]["ExtractionStatus"]
          fileName: string
          fileSize: number
          fileUrl: string
          id: string
          mimeType: string
          uploadedAt: string
          uploadedById: string
        }
        Insert: {
          caseId: string
          documentType: Database["public"]["Enums"]["CaseDocumentType"]
          extractedAt?: string | null
          extractedData?: Json | null
          extractionError?: string | null
          extractionStatus?: Database["public"]["Enums"]["ExtractionStatus"]
          fileName: string
          fileSize: number
          fileUrl: string
          id: string
          mimeType: string
          uploadedAt?: string
          uploadedById: string
        }
        Update: {
          caseId?: string
          documentType?: Database["public"]["Enums"]["CaseDocumentType"]
          extractedAt?: string | null
          extractedData?: Json | null
          extractionError?: string | null
          extractionStatus?: Database["public"]["Enums"]["ExtractionStatus"]
          fileName?: string
          fileSize?: number
          fileUrl?: string
          id?: string
          mimeType?: string
          uploadedAt?: string
          uploadedById?: string
        }
        Relationships: [
          {
            foreignKeyName: "CaseDocument_caseId_fkey"
            columns: ["caseId"]
            isOneToOne: false
            referencedRelation: "Case"
            referencedColumns: ["id"]
          },
        ]
      }
      CaseExtractedTerm: {
        Row: {
          caseId: string
          category: Database["public"]["Enums"]["TermCategory"]
          confidence: number | null
          createdAt: string
          id: string
          phonetic: string | null
          source: string | null
          term: string
          useInTranscription: boolean
        }
        Insert: {
          caseId: string
          category: Database["public"]["Enums"]["TermCategory"]
          confidence?: number | null
          createdAt?: string
          id: string
          phonetic?: string | null
          source?: string | null
          term: string
          useInTranscription?: boolean
        }
        Update: {
          caseId?: string
          category?: Database["public"]["Enums"]["TermCategory"]
          confidence?: number | null
          createdAt?: string
          id?: string
          phonetic?: string | null
          source?: string | null
          term?: string
          useInTranscription?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "CaseExtractedTerm_caseId_fkey"
            columns: ["caseId"]
            isOneToOne: false
            referencedRelation: "Case"
            referencedColumns: ["id"]
          },
        ]
      }
      CaseMembership: {
        Row: {
          caseId: string
          createdAt: string
          id: string
          permissions: Json | null
          roleInCase: Database["public"]["Enums"]["CaseRole"]
          updatedAt: string
          userId: string
        }
        Insert: {
          caseId: string
          createdAt?: string
          id: string
          permissions?: Json | null
          roleInCase: Database["public"]["Enums"]["CaseRole"]
          updatedAt: string
          userId: string
        }
        Update: {
          caseId?: string
          createdAt?: string
          id?: string
          permissions?: Json | null
          roleInCase?: Database["public"]["Enums"]["CaseRole"]
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "CaseMembership_caseId_fkey"
            columns: ["caseId"]
            isOneToOne: false
            referencedRelation: "Case"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CaseMembership_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      CSRAttorney: {
        Row: {
          attorneyId: string
          copyCount: number
          createdAt: string
          csrRecordId: string
          deliveryFormat: string | null
          deliveryMethod: string | null
          id: string
          needsCopy: boolean
          needsOriginal: boolean
          representing: string | null
          role: Database["public"]["Enums"]["CSRAttorneyRole"]
          rushRequested: boolean
          rushType: Database["public"]["Enums"]["RushType"] | null
        }
        Insert: {
          attorneyId: string
          copyCount?: number
          createdAt?: string
          csrRecordId: string
          deliveryFormat?: string | null
          deliveryMethod?: string | null
          id: string
          needsCopy?: boolean
          needsOriginal?: boolean
          representing?: string | null
          role: Database["public"]["Enums"]["CSRAttorneyRole"]
          rushRequested?: boolean
          rushType?: Database["public"]["Enums"]["RushType"] | null
        }
        Update: {
          attorneyId?: string
          copyCount?: number
          createdAt?: string
          csrRecordId?: string
          deliveryFormat?: string | null
          deliveryMethod?: string | null
          id?: string
          needsCopy?: boolean
          needsOriginal?: boolean
          representing?: string | null
          role?: Database["public"]["Enums"]["CSRAttorneyRole"]
          rushRequested?: boolean
          rushType?: Database["public"]["Enums"]["RushType"] | null
        }
        Relationships: [
          {
            foreignKeyName: "CSRAttorney_attorneyId_fkey"
            columns: ["attorneyId"]
            isOneToOne: false
            referencedRelation: "Attorney"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CSRAttorney_csrRecordId_fkey"
            columns: ["csrRecordId"]
            isOneToOne: false
            referencedRelation: "CSRRecord"
            referencedColumns: ["id"]
          },
        ]
      }
      CSRParty: {
        Row: {
          createdAt: string
          csrRecordId: string
          entityType: string | null
          id: string
          isEntity: boolean
          partyName: string
          partyType: Database["public"]["Enums"]["PartyType"]
          sortOrder: number
        }
        Insert: {
          createdAt?: string
          csrRecordId: string
          entityType?: string | null
          id: string
          isEntity?: boolean
          partyName: string
          partyType: Database["public"]["Enums"]["PartyType"]
          sortOrder?: number
        }
        Update: {
          createdAt?: string
          csrRecordId?: string
          entityType?: string | null
          id?: string
          isEntity?: boolean
          partyName?: string
          partyType?: Database["public"]["Enums"]["PartyType"]
          sortOrder?: number
        }
        Relationships: [
          {
            foreignKeyName: "CSRParty_csrRecordId_fkey"
            columns: ["csrRecordId"]
            isOneToOne: false
            referencedRelation: "CSRRecord"
            referencedColumns: ["id"]
          },
        ]
      }
      CSRProperNoun: {
        Row: {
          category: Database["public"]["Enums"]["ProperNounCategory"]
          createdAt: string
          csrRecordId: string
          id: string
          phoneticHint: string | null
          priority: number
          source: string | null
          useInTranscription: boolean
          value: string
        }
        Insert: {
          category: Database["public"]["Enums"]["ProperNounCategory"]
          createdAt?: string
          csrRecordId: string
          id: string
          phoneticHint?: string | null
          priority?: number
          source?: string | null
          useInTranscription?: boolean
          value: string
        }
        Update: {
          category?: Database["public"]["Enums"]["ProperNounCategory"]
          createdAt?: string
          csrRecordId?: string
          id?: string
          phoneticHint?: string | null
          priority?: number
          source?: string | null
          useInTranscription?: boolean
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "CSRProperNoun_csrRecordId_fkey"
            columns: ["csrRecordId"]
            isOneToOne: false
            referencedRelation: "CSRRecord"
            referencedColumns: ["id"]
          },
        ]
      }
      CSRRecord: {
        Row: {
          accessInstructions: string | null
          actualStartTime: string | null
          adjustorEmail: string | null
          adjustorName: string | null
          adjustorPhone: string | null
          aiExtractedAt: string | null
          aiExtractedFields: Json | null
          aiExtractionConfidence: number | null
          caseCaption: string
          causeNumber: string | null
          changeCount: number
          changesReceived: boolean
          claimNumber: string | null
          conferenceRoom: string | null
          county: string | null
          courtName: string | null
          courtType: string | null
          createdAt: string
          dataSource: Database["public"]["Enums"]["DataSource"] | null
          dateOfLoss: string | null
          deliveryPriority: Database["public"]["Enums"]["DeliveryPriority"]
          depositionDate: string
          endTime: string | null
          id: string
          insuredName: string | null
          insurerName: string | null
          interpreterLanguage: string | null
          interpreterRequired: boolean
          isCROnly: boolean
          isEUO: boolean
          isLocked: boolean
          isPIP: boolean
          isVideoRecord: boolean
          jobId: string
          judge: string | null
          lastModifiedAt: string | null
          lastModifiedBy: string | null
          locationAddress: string | null
          locationCity: string | null
          locationState: string | null
          locationType: Database["public"]["Enums"]["LocationType"]
          locationZip: string | null
          lockedAt: string | null
          lockedReason: string | null
          manualOverrides: Json | null
          originalDocumentType: string | null
          originalDocumentUrl: string | null
          parkingFees: number | null
          parkingNotes: string | null
          parkingRequired: boolean
          policyNumber: string | null
          readAndSignExpiresAt: string | null
          readAndSignReceivedAt: string | null
          readAndSignRequired: boolean
          readAndSignSentAt: string | null
          realtimeRequired: boolean
          rushDueDate: string | null
          scheduledStartTime: string | null
          securityNotes: string | null
          signatureWaived: boolean
          state: string
          timezone: string
          travelMiles: number | null
          updatedAt: string
          videographerName: string | null
          videographerRequired: boolean
          videoType: Database["public"]["Enums"]["VideoRecordType"]
          waivedReason: string | null
        }
        Insert: {
          accessInstructions?: string | null
          actualStartTime?: string | null
          adjustorEmail?: string | null
          adjustorName?: string | null
          adjustorPhone?: string | null
          aiExtractedAt?: string | null
          aiExtractedFields?: Json | null
          aiExtractionConfidence?: number | null
          caseCaption: string
          causeNumber?: string | null
          changeCount?: number
          changesReceived?: boolean
          claimNumber?: string | null
          conferenceRoom?: string | null
          county?: string | null
          courtName?: string | null
          courtType?: string | null
          createdAt?: string
          dataSource?: Database["public"]["Enums"]["DataSource"] | null
          dateOfLoss?: string | null
          deliveryPriority?: Database["public"]["Enums"]["DeliveryPriority"]
          depositionDate: string
          endTime?: string | null
          id: string
          insuredName?: string | null
          insurerName?: string | null
          interpreterLanguage?: string | null
          interpreterRequired?: boolean
          isCROnly?: boolean
          isEUO?: boolean
          isLocked?: boolean
          isPIP?: boolean
          isVideoRecord?: boolean
          jobId: string
          judge?: string | null
          lastModifiedAt?: string | null
          lastModifiedBy?: string | null
          locationAddress?: string | null
          locationCity?: string | null
          locationState?: string | null
          locationType?: Database["public"]["Enums"]["LocationType"]
          locationZip?: string | null
          lockedAt?: string | null
          lockedReason?: string | null
          manualOverrides?: Json | null
          originalDocumentType?: string | null
          originalDocumentUrl?: string | null
          parkingFees?: number | null
          parkingNotes?: string | null
          parkingRequired?: boolean
          policyNumber?: string | null
          readAndSignExpiresAt?: string | null
          readAndSignReceivedAt?: string | null
          readAndSignRequired?: boolean
          readAndSignSentAt?: string | null
          realtimeRequired?: boolean
          rushDueDate?: string | null
          scheduledStartTime?: string | null
          securityNotes?: string | null
          signatureWaived?: boolean
          state?: string
          timezone?: string
          travelMiles?: number | null
          updatedAt: string
          videographerName?: string | null
          videographerRequired?: boolean
          videoType?: Database["public"]["Enums"]["VideoRecordType"]
          waivedReason?: string | null
        }
        Update: {
          accessInstructions?: string | null
          actualStartTime?: string | null
          adjustorEmail?: string | null
          adjustorName?: string | null
          adjustorPhone?: string | null
          aiExtractedAt?: string | null
          aiExtractedFields?: Json | null
          aiExtractionConfidence?: number | null
          caseCaption?: string
          causeNumber?: string | null
          changeCount?: number
          changesReceived?: boolean
          claimNumber?: string | null
          conferenceRoom?: string | null
          county?: string | null
          courtName?: string | null
          courtType?: string | null
          createdAt?: string
          dataSource?: Database["public"]["Enums"]["DataSource"] | null
          dateOfLoss?: string | null
          deliveryPriority?: Database["public"]["Enums"]["DeliveryPriority"]
          depositionDate?: string
          endTime?: string | null
          id?: string
          insuredName?: string | null
          insurerName?: string | null
          interpreterLanguage?: string | null
          interpreterRequired?: boolean
          isCROnly?: boolean
          isEUO?: boolean
          isLocked?: boolean
          isPIP?: boolean
          isVideoRecord?: boolean
          jobId?: string
          judge?: string | null
          lastModifiedAt?: string | null
          lastModifiedBy?: string | null
          locationAddress?: string | null
          locationCity?: string | null
          locationState?: string | null
          locationType?: Database["public"]["Enums"]["LocationType"]
          locationZip?: string | null
          lockedAt?: string | null
          lockedReason?: string | null
          manualOverrides?: Json | null
          originalDocumentType?: string | null
          originalDocumentUrl?: string | null
          parkingFees?: number | null
          parkingNotes?: string | null
          parkingRequired?: boolean
          policyNumber?: string | null
          readAndSignExpiresAt?: string | null
          readAndSignReceivedAt?: string | null
          readAndSignRequired?: boolean
          readAndSignSentAt?: string | null
          realtimeRequired?: boolean
          rushDueDate?: string | null
          scheduledStartTime?: string | null
          securityNotes?: string | null
          signatureWaived?: boolean
          state?: string
          timezone?: string
          travelMiles?: number | null
          updatedAt?: string
          videographerName?: string | null
          videographerRequired?: boolean
          videoType?: Database["public"]["Enums"]["VideoRecordType"]
          waivedReason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CSRRecord_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
        ]
      }
      CSRTranscriptOptions: {
        Row: {
          colorExhibits: boolean
          createdAt: string
          csrRecordId: string
          deliveryMethod: Database["public"]["Enums"]["DeliveryMethod"]
          exhibitCount: number | null
          format: Database["public"]["Enums"]["TranscriptFormat"]
          id: string
          includeAppearances: boolean
          includeExhibitList: boolean
          includeWordIndex: boolean
          lineCount: number | null
          pageCount: number | null
          rushDeadline: string | null
          rushType: Database["public"]["Enums"]["RushType"]
          updatedAt: string
        }
        Insert: {
          colorExhibits?: boolean
          createdAt?: string
          csrRecordId: string
          deliveryMethod?: Database["public"]["Enums"]["DeliveryMethod"]
          exhibitCount?: number | null
          format?: Database["public"]["Enums"]["TranscriptFormat"]
          id: string
          includeAppearances?: boolean
          includeExhibitList?: boolean
          includeWordIndex?: boolean
          lineCount?: number | null
          pageCount?: number | null
          rushDeadline?: string | null
          rushType?: Database["public"]["Enums"]["RushType"]
          updatedAt: string
        }
        Update: {
          colorExhibits?: boolean
          createdAt?: string
          csrRecordId?: string
          deliveryMethod?: Database["public"]["Enums"]["DeliveryMethod"]
          exhibitCount?: number | null
          format?: Database["public"]["Enums"]["TranscriptFormat"]
          id?: string
          includeAppearances?: boolean
          includeExhibitList?: boolean
          includeWordIndex?: boolean
          lineCount?: number | null
          pageCount?: number | null
          rushDeadline?: string | null
          rushType?: Database["public"]["Enums"]["RushType"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "CSRTranscriptOptions_csrRecordId_fkey"
            columns: ["csrRecordId"]
            isOneToOne: false
            referencedRelation: "CSRRecord"
            referencedColumns: ["id"]
          },
        ]
      }
      CSRWitness: {
        Row: {
          appearanceType: Database["public"]["Enums"]["AppearanceType"]
          city: string | null
          createdAt: string
          csrRecordId: string
          entityRepresented: string | null
          fullLegalName: string
          id: string
          isPrimary: boolean
          preferredName: string | null
          readAndSignRequired: boolean
          role: Database["public"]["Enums"]["DeponentRole"]
          signatureWaived: boolean
          sortOrder: number
          state: string | null
        }
        Insert: {
          appearanceType?: Database["public"]["Enums"]["AppearanceType"]
          city?: string | null
          createdAt?: string
          csrRecordId: string
          entityRepresented?: string | null
          fullLegalName: string
          id: string
          isPrimary?: boolean
          preferredName?: string | null
          readAndSignRequired?: boolean
          role?: Database["public"]["Enums"]["DeponentRole"]
          signatureWaived?: boolean
          sortOrder?: number
          state?: string | null
        }
        Update: {
          appearanceType?: Database["public"]["Enums"]["AppearanceType"]
          city?: string | null
          createdAt?: string
          csrRecordId?: string
          entityRepresented?: string | null
          fullLegalName?: string
          id?: string
          isPrimary?: boolean
          preferredName?: string | null
          readAndSignRequired?: boolean
          role?: Database["public"]["Enums"]["DeponentRole"]
          signatureWaived?: boolean
          sortOrder?: number
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CSRWitness_csrRecordId_fkey"
            columns: ["csrRecordId"]
            isOneToOne: false
            referencedRelation: "CSRRecord"
            referencedColumns: ["id"]
          },
        ]
      }
      deposition_notes: {
        Row: {
          audioTimestamp: number | null
          content: string
          createdAt: string
          id: string
          isLocked: boolean
          jobId: string
          lockedAt: string | null
          lockedBy: string | null
          noteCategory: string | null
          reporterId: string
          type: Database["public"]["Enums"]["DepositionNoteType"]
          updatedAt: string
        }
        Insert: {
          audioTimestamp?: number | null
          content: string
          createdAt?: string
          id: string
          isLocked?: boolean
          jobId: string
          lockedAt?: string | null
          lockedBy?: string | null
          noteCategory?: string | null
          reporterId: string
          type?: Database["public"]["Enums"]["DepositionNoteType"]
          updatedAt: string
        }
        Update: {
          audioTimestamp?: number | null
          content?: string
          createdAt?: string
          id?: string
          isLocked?: boolean
          jobId?: string
          lockedAt?: string | null
          lockedBy?: string | null
          noteCategory?: string | null
          reporterId?: string
          type?: Database["public"]["Enums"]["DepositionNoteType"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposition_notes_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposition_notes_reporterId_fkey"
            columns: ["reporterId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      document_template_snapshots: {
        Row: {
          content: string
          createdAt: string
          id: string
          jobId: string
          renderedHtml: string | null
          templateId: string
          templateType: Database["public"]["Enums"]["DocumentTemplateType"]
          templateVersion: number
        }
        Insert: {
          content: string
          createdAt?: string
          id: string
          jobId: string
          renderedHtml?: string | null
          templateId: string
          templateType: Database["public"]["Enums"]["DocumentTemplateType"]
          templateVersion: number
        }
        Update: {
          content?: string
          createdAt?: string
          id?: string
          jobId?: string
          renderedHtml?: string | null
          templateId?: string
          templateType?: Database["public"]["Enums"]["DocumentTemplateType"]
          templateVersion?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_template_snapshots_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_template_snapshots_templateId_fkey"
            columns: ["templateId"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          agencyId: string | null
          content: string
          createdAt: string
          createdById: string | null
          firmId: string | null
          id: string
          isActive: boolean
          isDefault: boolean
          isSystemTemplate: boolean
          name: string
          previewHtml: string | null
          state: string
          stateVariant: string | null
          templateType: Database["public"]["Enums"]["DocumentTemplateType"]
          updatedAt: string
          variables: Json | null
          version: number
        }
        Insert: {
          agencyId?: string | null
          content: string
          createdAt?: string
          createdById?: string | null
          firmId?: string | null
          id: string
          isActive?: boolean
          isDefault?: boolean
          isSystemTemplate?: boolean
          name: string
          previewHtml?: string | null
          state: string
          stateVariant?: string | null
          templateType: Database["public"]["Enums"]["DocumentTemplateType"]
          updatedAt: string
          variables?: Json | null
          version?: number
        }
        Update: {
          agencyId?: string | null
          content?: string
          createdAt?: string
          createdById?: string | null
          firmId?: string | null
          id?: string
          isActive?: boolean
          isDefault?: boolean
          isSystemTemplate?: boolean
          name?: string
          previewHtml?: string | null
          state?: string
          stateVariant?: string | null
          templateType?: Database["public"]["Enums"]["DocumentTemplateType"]
          updatedAt?: string
          variables?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_agencyId_fkey"
            columns: ["agencyId"]
            isOneToOne: false
            referencedRelation: "Agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_templates_createdById_fkey"
            columns: ["createdById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_templates_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "Firm"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          confirmed: boolean
          confirmedAt: string | null
          createdAt: string
          eventId: string
          externalEmail: string | null
          externalName: string | null
          externalPhone: string | null
          id: string
          notified: boolean
          notifiedAt: string | null
          role: Database["public"]["Enums"]["ParticipantRole"]
          userId: string | null
        }
        Insert: {
          confirmed?: boolean
          confirmedAt?: string | null
          createdAt?: string
          eventId: string
          externalEmail?: string | null
          externalName?: string | null
          externalPhone?: string | null
          id: string
          notified?: boolean
          notifiedAt?: string | null
          role: Database["public"]["Enums"]["ParticipantRole"]
          userId?: string | null
        }
        Update: {
          confirmed?: boolean
          confirmedAt?: string | null
          createdAt?: string
          eventId?: string
          externalEmail?: string | null
          externalName?: string | null
          externalPhone?: string | null
          id?: string
          notified?: boolean
          notifiedAt?: string | null
          role?: Database["public"]["Enums"]["ParticipantRole"]
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_eventId_fkey"
            columns: ["eventId"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Exhibit: {
        Row: {
          caseId: string
          createdAt: string
          createdById: string
          description: string
          exhibitLabel: string
          exhibitNumber: number | null
          fileName: string
          fileSize: number
          fileType: string
          id: string
          jobId: string | null
          mimeType: string
          originalFileUrl: string
          stamped: boolean
          stampedFileUrl: string | null
          uploadedByRole: Database["public"]["Enums"]["UserRole"]
        }
        Insert: {
          caseId: string
          createdAt?: string
          createdById: string
          description: string
          exhibitLabel: string
          exhibitNumber?: number | null
          fileName: string
          fileSize: number
          fileType: string
          id: string
          jobId?: string | null
          mimeType: string
          originalFileUrl: string
          stamped?: boolean
          stampedFileUrl?: string | null
          uploadedByRole: Database["public"]["Enums"]["UserRole"]
        }
        Update: {
          caseId?: string
          createdAt?: string
          createdById?: string
          description?: string
          exhibitLabel?: string
          exhibitNumber?: number | null
          fileName?: string
          fileSize?: number
          fileType?: string
          id?: string
          jobId?: string | null
          mimeType?: string
          originalFileUrl?: string
          stamped?: boolean
          stampedFileUrl?: string | null
          uploadedByRole?: Database["public"]["Enums"]["UserRole"]
        }
        Relationships: [
          {
            foreignKeyName: "Exhibit_caseId_fkey"
            columns: ["caseId"]
            isOneToOne: false
            referencedRelation: "Case"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Exhibit_createdById_fkey"
            columns: ["createdById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Exhibit_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
        ]
      }
      external_calendar_connections: {
        Row: {
          accessToken: string
          autoSync: boolean
          calendarName: string | null
          createdAt: string
          firmId: string
          id: string
          isEnabled: boolean
          lastSyncedAt: string | null
          lastSyncError: string | null
          lastSyncToken: string | null
          provider: Database["public"]["Enums"]["ExternalCalendarProvider"]
          providerCalendarId: string
          refreshToken: string | null
          scopes: string[] | null
          syncErrorCount: number
          syncIntervalMins: number
          syncMode: Database["public"]["Enums"]["ExternalCalendarSyncMode"]
          tokenExpiresAt: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          accessToken: string
          autoSync?: boolean
          calendarName?: string | null
          createdAt?: string
          firmId: string
          id: string
          isEnabled?: boolean
          lastSyncedAt?: string | null
          lastSyncError?: string | null
          lastSyncToken?: string | null
          provider: Database["public"]["Enums"]["ExternalCalendarProvider"]
          providerCalendarId: string
          refreshToken?: string | null
          scopes?: string[] | null
          syncErrorCount?: number
          syncIntervalMins?: number
          syncMode?: Database["public"]["Enums"]["ExternalCalendarSyncMode"]
          tokenExpiresAt?: string | null
          updatedAt: string
          userId: string
        }
        Update: {
          accessToken?: string
          autoSync?: boolean
          calendarName?: string | null
          createdAt?: string
          firmId?: string
          id?: string
          isEnabled?: boolean
          lastSyncedAt?: string | null
          lastSyncError?: string | null
          lastSyncToken?: string | null
          provider?: Database["public"]["Enums"]["ExternalCalendarProvider"]
          providerCalendarId?: string
          refreshToken?: string | null
          scopes?: string[] | null
          syncErrorCount?: number
          syncIntervalMins?: number
          syncMode?: Database["public"]["Enums"]["ExternalCalendarSyncMode"]
          tokenExpiresAt?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_calendar_connections_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "Firm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_calendar_connections_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      external_calendar_events: {
        Row: {
          conflictingEventIds: string[] | null
          connectionId: string
          createdAt: string
          deletedAt: string | null
          description: string | null
          endTime: string
          firmId: string
          hasConflict: boolean
          id: string
          isAllDay: boolean
          isBlockingTime: boolean
          lastSyncedAt: string
          linkedEventId: string | null
          location: string | null
          meetingLink: string | null
          providerCalendarId: string
          providerEtag: string | null
          providerEventId: string
          providerMetadata: Json | null
          showInCalendar: boolean
          startTime: string
          syncError: string | null
          syncStatus: Database["public"]["Enums"]["ExternalEventSyncStatus"]
          timezone: string
          title: string
          updatedAt: string
        }
        Insert: {
          conflictingEventIds?: string[] | null
          connectionId: string
          createdAt?: string
          deletedAt?: string | null
          description?: string | null
          endTime: string
          firmId: string
          hasConflict?: boolean
          id: string
          isAllDay?: boolean
          isBlockingTime?: boolean
          lastSyncedAt?: string
          linkedEventId?: string | null
          location?: string | null
          meetingLink?: string | null
          providerCalendarId: string
          providerEtag?: string | null
          providerEventId: string
          providerMetadata?: Json | null
          showInCalendar?: boolean
          startTime: string
          syncError?: string | null
          syncStatus?: Database["public"]["Enums"]["ExternalEventSyncStatus"]
          timezone?: string
          title: string
          updatedAt: string
        }
        Update: {
          conflictingEventIds?: string[] | null
          connectionId?: string
          createdAt?: string
          deletedAt?: string | null
          description?: string | null
          endTime?: string
          firmId?: string
          hasConflict?: boolean
          id?: string
          isAllDay?: boolean
          isBlockingTime?: boolean
          lastSyncedAt?: string
          linkedEventId?: string | null
          location?: string | null
          meetingLink?: string | null
          providerCalendarId?: string
          providerEtag?: string | null
          providerEventId?: string
          providerMetadata?: Json | null
          showInCalendar?: boolean
          startTime?: string
          syncError?: string | null
          syncStatus?: Database["public"]["Enums"]["ExternalEventSyncStatus"]
          timezone?: string
          title?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_calendar_events_connectionId_fkey"
            columns: ["connectionId"]
            isOneToOne: false
            referencedRelation: "external_calendar_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_calendar_events_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "Firm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_calendar_events_linkedEventId_fkey"
            columns: ["linkedEventId"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      external_calendar_sync_logs: {
        Row: {
          completedAt: string | null
          conflictsFound: number
          connectionId: string
          durationMs: number | null
          errorDetails: Json | null
          errorMessage: string | null
          eventsCreated: number
          eventsDeleted: number
          eventsUpdated: number
          id: string
          startedAt: string
          status: string
          syncType: string
        }
        Insert: {
          completedAt?: string | null
          conflictsFound?: number
          connectionId: string
          durationMs?: number | null
          errorDetails?: Json | null
          errorMessage?: string | null
          eventsCreated?: number
          eventsDeleted?: number
          eventsUpdated?: number
          id: string
          startedAt?: string
          status: string
          syncType: string
        }
        Update: {
          completedAt?: string | null
          conflictsFound?: number
          connectionId?: string
          durationMs?: number | null
          errorDetails?: Json | null
          errorMessage?: string | null
          eventsCreated?: number
          eventsDeleted?: number
          eventsUpdated?: number
          id?: string
          startedAt?: string
          status?: string
          syncType?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_calendar_sync_logs_connectionId_fkey"
            columns: ["connectionId"]
            isOneToOne: false
            referencedRelation: "external_calendar_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      Firm: {
        Row: {
          address: string | null
          agencyId: string | null
          createdAt: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updatedAt: string
        }
        Insert: {
          address?: string | null
          agencyId?: string | null
          createdAt?: string
          email?: string | null
          id: string
          name: string
          phone?: string | null
          updatedAt: string
        }
        Update: {
          address?: string | null
          agencyId?: string | null
          createdAt?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Firm_agencyId_fkey"
            columns: ["agencyId"]
            isOneToOne: false
            referencedRelation: "Agency"
            referencedColumns: ["id"]
          },
        ]
      }
      HumanReviewSession: {
        Row: {
          confidenceThreshold: number
          createdAt: string
          id: string
          jobId: string
          minutesSpent: number
          reviewerId: string
          wordsReviewed: number
        }
        Insert: {
          confidenceThreshold?: number
          createdAt?: string
          id: string
          jobId: string
          minutesSpent: number
          reviewerId: string
          wordsReviewed: number
        }
        Update: {
          confidenceThreshold?: number
          createdAt?: string
          id?: string
          jobId?: string
          minutesSpent?: number
          reviewerId?: string
          wordsReviewed?: number
        }
        Relationships: []
      }
      Invoice: {
        Row: {
          billingAccountId: string
          createdAt: string
          finalizedAt: string | null
          id: string
          invoiceNumber: string
          paidAt: string | null
          paymentMethod: string | null
          periodEnd: string
          periodStart: string
          status: Database["public"]["Enums"]["InvoiceStatus"]
          stripeInvoiceId: string | null
          stripeInvoiceUrl: string | null
          stripePaymentIntentId: string | null
          subtotalCents: number
          taxCents: number
          totalCents: number
          updatedAt: string
          voidedAt: string | null
          voidedByUserId: string | null
          voidReason: string | null
        }
        Insert: {
          billingAccountId: string
          createdAt?: string
          finalizedAt?: string | null
          id: string
          invoiceNumber: string
          paidAt?: string | null
          paymentMethod?: string | null
          periodEnd: string
          periodStart: string
          status?: Database["public"]["Enums"]["InvoiceStatus"]
          stripeInvoiceId?: string | null
          stripeInvoiceUrl?: string | null
          stripePaymentIntentId?: string | null
          subtotalCents?: number
          taxCents?: number
          totalCents: number
          updatedAt: string
          voidedAt?: string | null
          voidedByUserId?: string | null
          voidReason?: string | null
        }
        Update: {
          billingAccountId?: string
          createdAt?: string
          finalizedAt?: string | null
          id?: string
          invoiceNumber?: string
          paidAt?: string | null
          paymentMethod?: string | null
          periodEnd?: string
          periodStart?: string
          status?: Database["public"]["Enums"]["InvoiceStatus"]
          stripeInvoiceId?: string | null
          stripeInvoiceUrl?: string | null
          stripePaymentIntentId?: string | null
          subtotalCents?: number
          taxCents?: number
          totalCents?: number
          updatedAt?: string
          voidedAt?: string | null
          voidedByUserId?: string | null
          voidReason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Invoice_billingAccountId_fkey"
            columns: ["billingAccountId"]
            isOneToOne: false
            referencedRelation: "BillingAccount"
            referencedColumns: ["id"]
          },
        ]
      }
      InvoiceLineItem: {
        Row: {
          description: string
          id: string
          invoiceId: string
          jobId: string | null
          quantity: number
          rateVersion: number
          serviceType: Database["public"]["Enums"]["BillingServiceType"]
          totalCents: number
          unit: Database["public"]["Enums"]["BillingUnit"]
          unitPriceCents: number
        }
        Insert: {
          description: string
          id: string
          invoiceId: string
          jobId?: string | null
          quantity: number
          rateVersion: number
          serviceType: Database["public"]["Enums"]["BillingServiceType"]
          totalCents: number
          unit: Database["public"]["Enums"]["BillingUnit"]
          unitPriceCents: number
        }
        Update: {
          description?: string
          id?: string
          invoiceId?: string
          jobId?: string | null
          quantity?: number
          rateVersion?: number
          serviceType?: Database["public"]["Enums"]["BillingServiceType"]
          totalCents?: number
          unit?: Database["public"]["Enums"]["BillingUnit"]
          unitPriceCents?: number
        }
        Relationships: [
          {
            foreignKeyName: "InvoiceLineItem_invoiceId_fkey"
            columns: ["invoiceId"]
            isOneToOne: false
            referencedRelation: "Invoice"
            referencedColumns: ["id"]
          },
        ]
      }
      Job: {
        Row: {
          agencyId: string | null
          asrModelTier: Database["public"]["Enums"]["ASRModelTier"]
          assignedToId: string | null
          audioDurationMinutes: number | null
          audioDurationSeconds: number | null
          audioProcessingMode: Database["public"]["Enums"]["AudioProcessingMode"]
          caseId: string | null
          caseName: string
          caseNumber: string | null
          completedAt: string | null
          createdAt: string
          createdById: string
          deletedAt: string | null
          depositionDate: string
          dueDate: string | null
          errorMessage: string | null
          firmId: string | null
          id: string
          internalNotes: string | null
          location: string | null
          lockedAt: string | null
          lockedBy: string | null
          notes: string | null
          pricingSnapshotId: string | null
          scopistId: string | null
          status: Database["public"]["Enums"]["JobStatus"]
          title: string
          transcriptionCompletedAt: string | null
          transcriptionModelType: string | null
          updatedAt: string
          zoomLink: string | null
        }
        Insert: {
          agencyId?: string | null
          asrModelTier?: Database["public"]["Enums"]["ASRModelTier"]
          assignedToId?: string | null
          audioDurationMinutes?: number | null
          audioDurationSeconds?: number | null
          audioProcessingMode?: Database["public"]["Enums"]["AudioProcessingMode"]
          caseId?: string | null
          caseName: string
          caseNumber?: string | null
          completedAt?: string | null
          createdAt?: string
          createdById: string
          deletedAt?: string | null
          depositionDate: string
          dueDate?: string | null
          errorMessage?: string | null
          firmId?: string | null
          id: string
          internalNotes?: string | null
          location?: string | null
          lockedAt?: string | null
          lockedBy?: string | null
          notes?: string | null
          pricingSnapshotId?: string | null
          scopistId?: string | null
          status?: Database["public"]["Enums"]["JobStatus"]
          title: string
          transcriptionCompletedAt?: string | null
          transcriptionModelType?: string | null
          updatedAt: string
          zoomLink?: string | null
        }
        Update: {
          agencyId?: string | null
          asrModelTier?: Database["public"]["Enums"]["ASRModelTier"]
          assignedToId?: string | null
          audioDurationMinutes?: number | null
          audioDurationSeconds?: number | null
          audioProcessingMode?: Database["public"]["Enums"]["AudioProcessingMode"]
          caseId?: string | null
          caseName?: string
          caseNumber?: string | null
          completedAt?: string | null
          createdAt?: string
          createdById?: string
          deletedAt?: string | null
          depositionDate?: string
          dueDate?: string | null
          errorMessage?: string | null
          firmId?: string | null
          id?: string
          internalNotes?: string | null
          location?: string | null
          lockedAt?: string | null
          lockedBy?: string | null
          notes?: string | null
          pricingSnapshotId?: string | null
          scopistId?: string | null
          status?: Database["public"]["Enums"]["JobStatus"]
          title?: string
          transcriptionCompletedAt?: string | null
          transcriptionModelType?: string | null
          updatedAt?: string
          zoomLink?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Job_agencyId_fkey"
            columns: ["agencyId"]
            isOneToOne: false
            referencedRelation: "Agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Job_caseId_fkey"
            columns: ["caseId"]
            isOneToOne: false
            referencedRelation: "Case"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Job_createdById_fkey"
            columns: ["createdById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Job_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "Firm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Job_lockedBy_fkey"
            columns: ["lockedBy"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Job_pricingSnapshotId_fkey"
            columns: ["pricingSnapshotId"]
            isOneToOne: false
            referencedRelation: "PricingSnapshot"
            referencedColumns: ["id"]
          },
        ]
      }
      JobAssignment: {
        Row: {
          id: string
          invitedAt: string
          jobId: string
          respondedAt: string | null
          scopistId: string
          scopistNotes: string | null
          startedAt: string | null
          status: Database["public"]["Enums"]["AssignmentStatus"]
          submittedAt: string | null
        }
        Insert: {
          id: string
          invitedAt?: string
          jobId: string
          respondedAt?: string | null
          scopistId: string
          scopistNotes?: string | null
          startedAt?: string | null
          status?: Database["public"]["Enums"]["AssignmentStatus"]
          submittedAt?: string | null
        }
        Update: {
          id?: string
          invitedAt?: string
          jobId?: string
          respondedAt?: string | null
          scopistId?: string
          scopistNotes?: string | null
          startedAt?: string | null
          status?: Database["public"]["Enums"]["AssignmentStatus"]
          submittedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "JobAssignment_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "JobAssignment_scopistId_fkey"
            columns: ["scopistId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      JobClaim: {
        Row: {
          acceptedAt: string | null
          agreedRate: number | null
          claimedAt: string
          completedAt: string | null
          createdAt: string
          id: string
          jobId: string
          proposedRate: number | null
          rateType: Database["public"]["Enums"]["RateType"]
          rejectionReason: string | null
          reporterNote: string | null
          respondedAt: string | null
          scopistId: string
          scopistNote: string | null
          status: Database["public"]["Enums"]["ClaimStatus"]
          updatedAt: string
        }
        Insert: {
          acceptedAt?: string | null
          agreedRate?: number | null
          claimedAt?: string
          completedAt?: string | null
          createdAt?: string
          id: string
          jobId: string
          proposedRate?: number | null
          rateType?: Database["public"]["Enums"]["RateType"]
          rejectionReason?: string | null
          reporterNote?: string | null
          respondedAt?: string | null
          scopistId: string
          scopistNote?: string | null
          status?: Database["public"]["Enums"]["ClaimStatus"]
          updatedAt: string
        }
        Update: {
          acceptedAt?: string | null
          agreedRate?: number | null
          claimedAt?: string
          completedAt?: string | null
          createdAt?: string
          id?: string
          jobId?: string
          proposedRate?: number | null
          rateType?: Database["public"]["Enums"]["RateType"]
          rejectionReason?: string | null
          reporterNote?: string | null
          respondedAt?: string | null
          scopistId?: string
          scopistNote?: string | null
          status?: Database["public"]["Enums"]["ClaimStatus"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "JobClaim_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "JobClaim_scopistId_fkey"
            columns: ["scopistId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      JobExhibit: {
        Row: {
          createdAt: string
          description: string | null
          discussionEndTimestamp: number | null
          discussionStartTimestamp: number | null
          exhibitLabel: string | null
          exhibitNumber: string
          externalUrl: string | null
          fileId: string | null
          id: string
          introducedAtLine: number | null
          introducedAtPage: number | null
          introducedAtTimestamp: number | null
          isMarkedForRecord: boolean
          jobId: string
          pageCount: number | null
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          description?: string | null
          discussionEndTimestamp?: number | null
          discussionStartTimestamp?: number | null
          exhibitLabel?: string | null
          exhibitNumber: string
          externalUrl?: string | null
          fileId?: string | null
          id: string
          introducedAtLine?: number | null
          introducedAtPage?: number | null
          introducedAtTimestamp?: number | null
          isMarkedForRecord?: boolean
          jobId: string
          pageCount?: number | null
          updatedAt: string
        }
        Update: {
          createdAt?: string
          description?: string | null
          discussionEndTimestamp?: number | null
          discussionStartTimestamp?: number | null
          exhibitLabel?: string | null
          exhibitNumber?: string
          externalUrl?: string | null
          fileId?: string | null
          id?: string
          introducedAtLine?: number | null
          introducedAtPage?: number | null
          introducedAtTimestamp?: number | null
          isMarkedForRecord?: boolean
          jobId?: string
          pageCount?: number | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "JobExhibit_fileId_fkey"
            columns: ["fileId"]
            isOneToOne: false
            referencedRelation: "JobFile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "JobExhibit_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
        ]
      }
      JobFile: {
        Row: {
          createdAt: string
          extractedData: Json | null
          fileName: string
          fileSize: number
          id: string
          jobId: string
          mimeType: string
          storagePath: string
          storageUrl: string
          type: Database["public"]["Enums"]["FileType"]
        }
        Insert: {
          createdAt?: string
          extractedData?: Json | null
          fileName: string
          fileSize: number
          id: string
          jobId: string
          mimeType: string
          storagePath: string
          storageUrl: string
          type: Database["public"]["Enums"]["FileType"]
        }
        Update: {
          createdAt?: string
          extractedData?: Json | null
          fileName?: string
          fileSize?: number
          id?: string
          jobId?: string
          mimeType?: string
          storagePath?: string
          storageUrl?: string
          type?: Database["public"]["Enums"]["FileType"]
        }
        Relationships: [
          {
            foreignKeyName: "JobFile_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
        ]
      }
      MarketplaceSettings: {
        Row: {
          acceptsMedicalDepos: boolean
          acceptsRushJobs: boolean
          acceptsTechnicalDepos: boolean
          autoAcceptClaims: boolean
          blockedScopists: string[] | null
          createdAt: string
          defaultRatePerPage: number | null
          id: string
          isAvailableForWork: boolean
          maxPagesAccepted: number | null
          minPagesAccepted: number | null
          preferredRatePerMinute: number | null
          preferredRatePerPage: number | null
          preferredScopists: string[] | null
          preferredStates: string[] | null
          updatedAt: string
          userId: string
        }
        Insert: {
          acceptsMedicalDepos?: boolean
          acceptsRushJobs?: boolean
          acceptsTechnicalDepos?: boolean
          autoAcceptClaims?: boolean
          blockedScopists?: string[] | null
          createdAt?: string
          defaultRatePerPage?: number | null
          id: string
          isAvailableForWork?: boolean
          maxPagesAccepted?: number | null
          minPagesAccepted?: number | null
          preferredRatePerMinute?: number | null
          preferredRatePerPage?: number | null
          preferredScopists?: string[] | null
          preferredStates?: string[] | null
          updatedAt: string
          userId: string
        }
        Update: {
          acceptsMedicalDepos?: boolean
          acceptsRushJobs?: boolean
          acceptsTechnicalDepos?: boolean
          autoAcceptClaims?: boolean
          blockedScopists?: string[] | null
          createdAt?: string
          defaultRatePerPage?: number | null
          id?: string
          isAvailableForWork?: boolean
          maxPagesAccepted?: number | null
          minPagesAccepted?: number | null
          preferredRatePerMinute?: number | null
          preferredRatePerPage?: number | null
          preferredScopists?: string[] | null
          preferredStates?: string[] | null
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "MarketplaceSettings_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Message: {
        Row: {
          content: string
          createdAt: string
          id: string
          isRead: boolean
          jobId: string
          readAt: string | null
          senderId: string
        }
        Insert: {
          content: string
          createdAt?: string
          id: string
          isRead?: boolean
          jobId: string
          readAt?: string | null
          senderId: string
        }
        Update: {
          content?: string
          createdAt?: string
          id?: string
          isRead?: boolean
          jobId?: string
          readAt?: string | null
          senderId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Message_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Message_senderId_fkey"
            columns: ["senderId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Notification: {
        Row: {
          createdAt: string
          emailSent: boolean
          emailSentAt: string | null
          id: string
          isRead: boolean
          jobId: string | null
          linkText: string | null
          linkUrl: string | null
          message: string
          readAt: string | null
          title: string
          type: Database["public"]["Enums"]["NotificationType"]
          userId: string
        }
        Insert: {
          createdAt?: string
          emailSent?: boolean
          emailSentAt?: string | null
          id: string
          isRead?: boolean
          jobId?: string | null
          linkText?: string | null
          linkUrl?: string | null
          message: string
          readAt?: string | null
          title: string
          type: Database["public"]["Enums"]["NotificationType"]
          userId: string
        }
        Update: {
          createdAt?: string
          emailSent?: boolean
          emailSentAt?: string | null
          id?: string
          isRead?: boolean
          jobId?: string | null
          linkText?: string | null
          linkUrl?: string | null
          message?: string
          readAt?: string | null
          title?: string
          type?: Database["public"]["Enums"]["NotificationType"]
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Notification_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      PasswordResetToken: {
        Row: {
          createdAt: string
          email: string
          expires: string
          id: string
          token: string
        }
        Insert: {
          createdAt?: string
          email: string
          expires: string
          id: string
          token: string
        }
        Update: {
          createdAt?: string
          email?: string
          expires?: string
          id?: string
          token?: string
        }
        Relationships: []
      }
      PricingSnapshot: {
        Row: {
          asrMultiplier: number
          confidenceReviewRateCents: number
          createdAt: string
          fullReviewRateCents: number
          id: string
          minTranscriptionMinutes: number
          rxFlatFeeCents: number
          transcriptionRateCents: number
        }
        Insert: {
          asrMultiplier?: number
          confidenceReviewRateCents: number
          createdAt?: string
          fullReviewRateCents: number
          id: string
          minTranscriptionMinutes?: number
          rxFlatFeeCents: number
          transcriptionRateCents: number
        }
        Update: {
          asrMultiplier?: number
          confidenceReviewRateCents?: number
          createdAt?: string
          fullReviewRateCents?: number
          id?: string
          minTranscriptionMinutes?: number
          rxFlatFeeCents?: number
          transcriptionRateCents?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string
        }
        Relationships: []
      }
      remote_meeting_info: {
        Row: {
          cloudRecordingPassword: string | null
          cloudRecordingUrl: string | null
          coHostKey: string | null
          createdAt: string
          dialInNumbers: Json | null
          hostKey: string | null
          id: string
          jobId: string
          meetingId: string | null
          meetingUrl: string | null
          passcode: string | null
          platform: Database["public"]["Enums"]["MeetingPlatform"]
          recordingDownloadedAt: string | null
          updatedAt: string
        }
        Insert: {
          cloudRecordingPassword?: string | null
          cloudRecordingUrl?: string | null
          coHostKey?: string | null
          createdAt?: string
          dialInNumbers?: Json | null
          hostKey?: string | null
          id: string
          jobId: string
          meetingId?: string | null
          meetingUrl?: string | null
          passcode?: string | null
          platform?: Database["public"]["Enums"]["MeetingPlatform"]
          recordingDownloadedAt?: string | null
          updatedAt: string
        }
        Update: {
          cloudRecordingPassword?: string | null
          cloudRecordingUrl?: string | null
          coHostKey?: string | null
          createdAt?: string
          dialInNumbers?: Json | null
          hostKey?: string | null
          id?: string
          jobId?: string
          meetingId?: string | null
          meetingUrl?: string | null
          passcode?: string | null
          platform?: Database["public"]["Enums"]["MeetingPlatform"]
          recordingDownloadedAt?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "remote_meeting_info_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
        ]
      }
      reporter_availability: {
        Row: {
          createdAt: string
          endTime: string
          firmId: string
          id: string
          isRecurring: boolean
          notes: string | null
          recurrenceEnd: string | null
          recurrenceRule: string | null
          reporterId: string
          startTime: string
          timezone: string
          type: Database["public"]["Enums"]["AvailabilityType"]
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          endTime: string
          firmId: string
          id: string
          isRecurring?: boolean
          notes?: string | null
          recurrenceEnd?: string | null
          recurrenceRule?: string | null
          reporterId: string
          startTime: string
          timezone?: string
          type?: Database["public"]["Enums"]["AvailabilityType"]
          updatedAt: string
        }
        Update: {
          createdAt?: string
          endTime?: string
          firmId?: string
          id?: string
          isRecurring?: boolean
          notes?: string | null
          recurrenceEnd?: string | null
          recurrenceRule?: string | null
          reporterId?: string
          startTime?: string
          timezone?: string
          type?: Database["public"]["Enums"]["AvailabilityType"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "reporter_availability_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "Firm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporter_availability_reporterId_fkey"
            columns: ["reporterId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      ReporterUnavailability: {
        Row: {
          createdAt: string
          endDate: string
          id: string
          reason: string | null
          startDate: string
          userId: string
        }
        Insert: {
          createdAt?: string
          endDate: string
          id: string
          reason?: string | null
          startDate: string
          userId: string
        }
        Update: {
          createdAt?: string
          endDate?: string
          id?: string
          reason?: string | null
          startDate?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "ReporterUnavailability_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_conflicts: {
        Row: {
          conflictEventId: string
          conflictType: Database["public"]["Enums"]["ConflictType"]
          createdAt: string
          firmId: string
          id: string
          overlapMinutes: number
          proposedEnd: string
          proposedStart: string
          resolution: Database["public"]["Enums"]["ConflictResolution"] | null
          resolutionNotes: string | null
          resolvedAt: string | null
          resolvedById: string | null
          sourceEventId: string
          status: Database["public"]["Enums"]["ConflictStatus"]
        }
        Insert: {
          conflictEventId: string
          conflictType: Database["public"]["Enums"]["ConflictType"]
          createdAt?: string
          firmId: string
          id: string
          overlapMinutes: number
          proposedEnd: string
          proposedStart: string
          resolution?: Database["public"]["Enums"]["ConflictResolution"] | null
          resolutionNotes?: string | null
          resolvedAt?: string | null
          resolvedById?: string | null
          sourceEventId: string
          status?: Database["public"]["Enums"]["ConflictStatus"]
        }
        Update: {
          conflictEventId?: string
          conflictType?: Database["public"]["Enums"]["ConflictType"]
          createdAt?: string
          firmId?: string
          id?: string
          overlapMinutes?: number
          proposedEnd?: string
          proposedStart?: string
          resolution?: Database["public"]["Enums"]["ConflictResolution"] | null
          resolutionNotes?: string | null
          resolvedAt?: string | null
          resolvedById?: string | null
          sourceEventId?: string
          status?: Database["public"]["Enums"]["ConflictStatus"]
        }
        Relationships: [
          {
            foreignKeyName: "schedule_conflicts_conflictEventId_fkey"
            columns: ["conflictEventId"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_conflicts_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "Firm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_conflicts_resolvedById_fkey"
            columns: ["resolvedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_conflicts_sourceEventId_fkey"
            columns: ["sourceEventId"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      SystemConfig: {
        Row: {
          description: string | null
          id: string
          key: string
          updatedAt: string
          value: Json
        }
        Insert: {
          description?: string | null
          id: string
          key: string
          updatedAt: string
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updatedAt?: string
          value?: Json
        }
        Relationships: []
      }
      Transcript: {
        Row: {
          aiChanges: Json | null
          aiFlags: Json | null
          averageConfidence: number | null
          content: string
          contentJson: Json
          createdAt: string
          createdBy: string
          deletedAt: string | null
          id: string
          jobId: string
          pageCount: number | null
          speakerCount: number | null
          version: string
          versionNumber: number
          wordCount: number | null
        }
        Insert: {
          aiChanges?: Json | null
          aiFlags?: Json | null
          averageConfidence?: number | null
          content: string
          contentJson: Json
          createdAt?: string
          createdBy: string
          deletedAt?: string | null
          id: string
          jobId: string
          pageCount?: number | null
          speakerCount?: number | null
          version: string
          versionNumber: number
          wordCount?: number | null
        }
        Update: {
          aiChanges?: Json | null
          aiFlags?: Json | null
          averageConfidence?: number | null
          content?: string
          contentJson?: Json
          createdAt?: string
          createdBy?: string
          deletedAt?: string | null
          id?: string
          jobId?: string
          pageCount?: number | null
          speakerCount?: number | null
          version?: string
          versionNumber?: number
          wordCount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "Transcript_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptAccess: {
        Row: {
          accessCount: number
          accessLevel: Database["public"]["Enums"]["TranscriptAccessLevel"]
          caseId: string | null
          createdAt: string
          downloadCount: number
          downloadLimit: number | null
          expiresAt: string | null
          grantedById: string
          id: string
          lastAccessedAt: string | null
          transcriptId: string
          updatedAt: string
          userId: string
        }
        Insert: {
          accessCount?: number
          accessLevel?: Database["public"]["Enums"]["TranscriptAccessLevel"]
          caseId?: string | null
          createdAt?: string
          downloadCount?: number
          downloadLimit?: number | null
          expiresAt?: string | null
          grantedById: string
          id: string
          lastAccessedAt?: string | null
          transcriptId: string
          updatedAt: string
          userId: string
        }
        Update: {
          accessCount?: number
          accessLevel?: Database["public"]["Enums"]["TranscriptAccessLevel"]
          caseId?: string | null
          createdAt?: string
          downloadCount?: number
          downloadLimit?: number | null
          expiresAt?: string | null
          grantedById?: string
          id?: string
          lastAccessedAt?: string | null
          transcriptId?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptAccess_caseId_fkey"
            columns: ["caseId"]
            isOneToOne: false
            referencedRelation: "Case"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptAccess_grantedById_fkey"
            columns: ["grantedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptAccess_transcriptId_fkey"
            columns: ["transcriptId"]
            isOneToOne: false
            referencedRelation: "Transcript"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptAccess_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptAnnotation: {
        Row: {
          createdAt: string
          createdById: string
          id: string
          issueCode: string
          issueColor: string
          issueLabel: string
          lineEnd: number
          lineStart: number
          note: string | null
          pageEnd: number
          pageStart: number
          transcriptId: string
        }
        Insert: {
          createdAt?: string
          createdById: string
          id: string
          issueCode: string
          issueColor: string
          issueLabel: string
          lineEnd: number
          lineStart: number
          note?: string | null
          pageEnd: number
          pageStart: number
          transcriptId: string
        }
        Update: {
          createdAt?: string
          createdById?: string
          id?: string
          issueCode?: string
          issueColor?: string
          issueLabel?: string
          lineEnd?: number
          lineStart?: number
          note?: string | null
          pageEnd?: number
          pageStart?: number
          transcriptId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptAnnotation_createdById_fkey"
            columns: ["createdById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptAnnotation_transcriptId_fkey"
            columns: ["transcriptId"]
            isOneToOne: false
            referencedRelation: "AttorneyTranscript"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptAnnotationExhibit: {
        Row: {
          annotationId: string
          createdAt: string
          createdById: string
          exhibitId: string
          id: string
        }
        Insert: {
          annotationId: string
          createdAt?: string
          createdById: string
          exhibitId: string
          id: string
        }
        Update: {
          annotationId?: string
          createdAt?: string
          createdById?: string
          exhibitId?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptAnnotationExhibit_annotationId_fkey"
            columns: ["annotationId"]
            isOneToOne: false
            referencedRelation: "TranscriptAnnotation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptAnnotationExhibit_createdById_fkey"
            columns: ["createdById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptAnnotationExhibit_exhibitId_fkey"
            columns: ["exhibitId"]
            isOneToOne: false
            referencedRelation: "Exhibit"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptBookmark: {
        Row: {
          createdAt: string
          description: string | null
          id: string
          label: string
          lineNumber: number
          pageNumber: number | null
          snippetText: string | null
          sortOrder: number
          timestamp: string | null
          transcriptId: string
          updatedAt: string
          userId: string
        }
        Insert: {
          createdAt?: string
          description?: string | null
          id: string
          label: string
          lineNumber: number
          pageNumber?: number | null
          snippetText?: string | null
          sortOrder?: number
          timestamp?: string | null
          transcriptId: string
          updatedAt: string
          userId: string
        }
        Update: {
          createdAt?: string
          description?: string | null
          id?: string
          label?: string
          lineNumber?: number
          pageNumber?: number | null
          snippetText?: string | null
          sortOrder?: number
          timestamp?: string | null
          transcriptId?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptBookmark_transcriptId_fkey"
            columns: ["transcriptId"]
            isOneToOne: false
            referencedRelation: "Transcript"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptBookmark_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptHighlight: {
        Row: {
          color: Database["public"]["Enums"]["HighlightColor"]
          createdAt: string
          endIndex: number
          endLine: number | null
          highlightedText: string
          id: string
          note: string | null
          startIndex: number
          startLine: number | null
          transcriptId: string
          updatedAt: string
          userId: string
        }
        Insert: {
          color?: Database["public"]["Enums"]["HighlightColor"]
          createdAt?: string
          endIndex: number
          endLine?: number | null
          highlightedText: string
          id: string
          note?: string | null
          startIndex: number
          startLine?: number | null
          transcriptId: string
          updatedAt: string
          userId: string
        }
        Update: {
          color?: Database["public"]["Enums"]["HighlightColor"]
          createdAt?: string
          endIndex?: number
          endLine?: number | null
          highlightedText?: string
          id?: string
          note?: string | null
          startIndex?: number
          startLine?: number | null
          transcriptId?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptHighlight_transcriptId_fkey"
            columns: ["transcriptId"]
            isOneToOne: false
            referencedRelation: "Transcript"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptHighlight_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptHighlightTag: {
        Row: {
          createdAt: string
          highlightId: string
          id: string
          tagId: string
        }
        Insert: {
          createdAt?: string
          highlightId: string
          id: string
          tagId: string
        }
        Update: {
          createdAt?: string
          highlightId?: string
          id?: string
          tagId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptHighlightTag_highlightId_fkey"
            columns: ["highlightId"]
            isOneToOne: false
            referencedRelation: "TranscriptHighlight"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptHighlightTag_tagId_fkey"
            columns: ["tagId"]
            isOneToOne: false
            referencedRelation: "TranscriptTag"
            referencedColumns: ["id"]
          },
        ]
      }
      Transcription: {
        Row: {
          averageConfidence: number | null
          createdAt: string
          deepgramRawJson: string | null
          duration: number | null
          flaggedSegments: Json | null
          flaggedWordCount: number | null
          fullTranscript: string
          id: string
          jobId: string
          lockedAt: string | null
          lockedBy: string | null
          lockReason: string | null
          modelUsed: string | null
          reviewedAt: string | null
          reviewedByUserId: string | null
          reviewTimeMinutes: number | null
          speakerAnalysis: Json | null
          speakerAssignments: Json | null
          speakerCount: number
          status: Database["public"]["Enums"]["TranscriptionStatus"]
          updatedAt: string
          utterances: Json | null
          version: number
          wordCount: number | null
          words: Json
        }
        Insert: {
          averageConfidence?: number | null
          createdAt?: string
          deepgramRawJson?: string | null
          duration?: number | null
          flaggedSegments?: Json | null
          flaggedWordCount?: number | null
          fullTranscript: string
          id: string
          jobId: string
          lockedAt?: string | null
          lockedBy?: string | null
          lockReason?: string | null
          modelUsed?: string | null
          reviewedAt?: string | null
          reviewedByUserId?: string | null
          reviewTimeMinutes?: number | null
          speakerAnalysis?: Json | null
          speakerAssignments?: Json | null
          speakerCount?: number
          status?: Database["public"]["Enums"]["TranscriptionStatus"]
          updatedAt: string
          utterances?: Json | null
          version?: number
          wordCount?: number | null
          words: Json
        }
        Update: {
          averageConfidence?: number | null
          createdAt?: string
          deepgramRawJson?: string | null
          duration?: number | null
          flaggedSegments?: Json | null
          flaggedWordCount?: number | null
          fullTranscript?: string
          id?: string
          jobId?: string
          lockedAt?: string | null
          lockedBy?: string | null
          lockReason?: string | null
          modelUsed?: string | null
          reviewedAt?: string | null
          reviewedByUserId?: string | null
          reviewTimeMinutes?: number | null
          speakerAnalysis?: Json | null
          speakerAssignments?: Json | null
          speakerCount?: number
          status?: Database["public"]["Enums"]["TranscriptionStatus"]
          updatedAt?: string
          utterances?: Json | null
          version?: number
          wordCount?: number | null
          words?: Json
        }
        Relationships: [
          {
            foreignKeyName: "Transcription_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptionEdit: {
        Row: {
          createdAt: string
          editedText: string | null
          editorEmail: string | null
          editorId: string
          editorRole: Database["public"]["Enums"]["UserRole"] | null
          editType: Database["public"]["Enums"]["EditType"]
          id: string
          metadata: Json | null
          originalText: string | null
          position: number | null
          transcriptionId: string
        }
        Insert: {
          createdAt?: string
          editedText?: string | null
          editorEmail?: string | null
          editorId: string
          editorRole?: Database["public"]["Enums"]["UserRole"] | null
          editType?: Database["public"]["Enums"]["EditType"]
          id: string
          metadata?: Json | null
          originalText?: string | null
          position?: number | null
          transcriptionId: string
        }
        Update: {
          createdAt?: string
          editedText?: string | null
          editorEmail?: string | null
          editorId?: string
          editorRole?: Database["public"]["Enums"]["UserRole"] | null
          editType?: Database["public"]["Enums"]["EditType"]
          id?: string
          metadata?: Json | null
          originalText?: string | null
          position?: number | null
          transcriptionId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptionEdit_transcriptionId_fkey"
            columns: ["transcriptionId"]
            isOneToOne: false
            referencedRelation: "Transcription"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptionJob: {
        Row: {
          audioUrl: string
          averageConfidence: number | null
          completedAt: string | null
          config: Json
          createdAt: string
          deepgramRequestId: string
          duration: number | null
          errorMessage: string | null
          id: string
          jobId: string
          maxRetries: number
          rawJson: Json | null
          retryCount: number
          speakerCount: number | null
          status: Database["public"]["Enums"]["TranscriptionStatus"]
          wordCount: number | null
        }
        Insert: {
          audioUrl: string
          averageConfidence?: number | null
          completedAt?: string | null
          config: Json
          createdAt?: string
          deepgramRequestId: string
          duration?: number | null
          errorMessage?: string | null
          id: string
          jobId: string
          maxRetries?: number
          rawJson?: Json | null
          retryCount?: number
          speakerCount?: number | null
          status?: Database["public"]["Enums"]["TranscriptionStatus"]
          wordCount?: number | null
        }
        Update: {
          audioUrl?: string
          averageConfidence?: number | null
          completedAt?: string | null
          config?: Json
          createdAt?: string
          deepgramRequestId?: string
          duration?: number | null
          errorMessage?: string | null
          id?: string
          jobId?: string
          maxRetries?: number
          rawJson?: Json | null
          retryCount?: number
          speakerCount?: number | null
          status?: Database["public"]["Enums"]["TranscriptionStatus"]
          wordCount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptionJob_jobId_fkey"
            columns: ["jobId"]
            isOneToOne: false
            referencedRelation: "Job"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptNote: {
        Row: {
          content: string
          createdAt: string
          id: string
          isPrivate: boolean
          lineNumber: number | null
          pageNumber: number | null
          timestamp: string | null
          title: string | null
          transcriptId: string
          updatedAt: string
          userId: string
        }
        Insert: {
          content: string
          createdAt?: string
          id: string
          isPrivate?: boolean
          lineNumber?: number | null
          pageNumber?: number | null
          timestamp?: string | null
          title?: string | null
          transcriptId: string
          updatedAt: string
          userId: string
        }
        Update: {
          content?: string
          createdAt?: string
          id?: string
          isPrivate?: boolean
          lineNumber?: number | null
          pageNumber?: number | null
          timestamp?: string | null
          title?: string | null
          transcriptId?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptNote_transcriptId_fkey"
            columns: ["transcriptId"]
            isOneToOne: false
            referencedRelation: "Transcript"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptNote_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptOrder: {
        Row: {
          address: string | null
          attorneyName: string
          city: string | null
          copyCount: number
          createdAt: string
          csrRecordId: string
          deliveredAt: string | null
          deliveryType: Database["public"]["Enums"]["TranscriptDeliveryType"]
          email: string
          fax: string | null
          fileFormat: Database["public"]["Enums"]["TranscriptFileFormat"]
          firmName: string | null
          id: string
          invoiced: boolean
          invoicedAt: string | null
          isOriginal: boolean
          pageCount: number | null
          phone: string | null
          pricePerPage: number | null
          sentAt: string | null
          state: string | null
          status: Database["public"]["Enums"]["OrderFulfillmentStatus"]
          totalPrice: number | null
          trackingNumber: string | null
          updatedAt: string
          zipCode: string | null
        }
        Insert: {
          address?: string | null
          attorneyName: string
          city?: string | null
          copyCount?: number
          createdAt?: string
          csrRecordId: string
          deliveredAt?: string | null
          deliveryType?: Database["public"]["Enums"]["TranscriptDeliveryType"]
          email: string
          fax?: string | null
          fileFormat?: Database["public"]["Enums"]["TranscriptFileFormat"]
          firmName?: string | null
          id: string
          invoiced?: boolean
          invoicedAt?: string | null
          isOriginal?: boolean
          pageCount?: number | null
          phone?: string | null
          pricePerPage?: number | null
          sentAt?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["OrderFulfillmentStatus"]
          totalPrice?: number | null
          trackingNumber?: string | null
          updatedAt: string
          zipCode?: string | null
        }
        Update: {
          address?: string | null
          attorneyName?: string
          city?: string | null
          copyCount?: number
          createdAt?: string
          csrRecordId?: string
          deliveredAt?: string | null
          deliveryType?: Database["public"]["Enums"]["TranscriptDeliveryType"]
          email?: string
          fax?: string | null
          fileFormat?: Database["public"]["Enums"]["TranscriptFileFormat"]
          firmName?: string | null
          id?: string
          invoiced?: boolean
          invoicedAt?: string | null
          isOriginal?: boolean
          pageCount?: number | null
          phone?: string | null
          pricePerPage?: number | null
          sentAt?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["OrderFulfillmentStatus"]
          totalPrice?: number | null
          trackingNumber?: string | null
          updatedAt?: string
          zipCode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptOrder_csrRecordId_fkey"
            columns: ["csrRecordId"]
            isOneToOne: false
            referencedRelation: "CSRRecord"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptReviewSession: {
        Row: {
          corrections: Json
          createdAt: string
          id: string
          reviewedIndices: number[] | null
          transcriptionId: string
          updatedAt: string
          userId: string
        }
        Insert: {
          corrections: Json
          createdAt?: string
          id: string
          reviewedIndices?: number[] | null
          transcriptionId: string
          updatedAt: string
          userId: string
        }
        Update: {
          corrections?: Json
          createdAt?: string
          id?: string
          reviewedIndices?: number[] | null
          transcriptionId?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptReviewSession_transcriptionId_fkey"
            columns: ["transcriptionId"]
            isOneToOne: false
            referencedRelation: "Transcription"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptReviewSession_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptShare: {
        Row: {
          accessCount: number
          accessLevel: Database["public"]["Enums"]["TranscriptAccessLevel"]
          createdAt: string
          deletedAt: string | null
          expiresAt: string | null
          id: string
          lastAccessedAt: string | null
          message: string | null
          password: string | null
          recipientEmail: string | null
          recipientName: string | null
          revokedAt: string | null
          sharedById: string
          shareToken: string | null
          shareType: Database["public"]["Enums"]["ShareType"]
          status: Database["public"]["Enums"]["ShareStatus"]
          transcriptId: string
        }
        Insert: {
          accessCount?: number
          accessLevel?: Database["public"]["Enums"]["TranscriptAccessLevel"]
          createdAt?: string
          deletedAt?: string | null
          expiresAt?: string | null
          id: string
          lastAccessedAt?: string | null
          message?: string | null
          password?: string | null
          recipientEmail?: string | null
          recipientName?: string | null
          revokedAt?: string | null
          sharedById: string
          shareToken?: string | null
          shareType: Database["public"]["Enums"]["ShareType"]
          status?: Database["public"]["Enums"]["ShareStatus"]
          transcriptId: string
        }
        Update: {
          accessCount?: number
          accessLevel?: Database["public"]["Enums"]["TranscriptAccessLevel"]
          createdAt?: string
          deletedAt?: string | null
          expiresAt?: string | null
          id?: string
          lastAccessedAt?: string | null
          message?: string | null
          password?: string | null
          recipientEmail?: string | null
          recipientName?: string | null
          revokedAt?: string | null
          sharedById?: string
          shareToken?: string | null
          shareType?: Database["public"]["Enums"]["ShareType"]
          status?: Database["public"]["Enums"]["ShareStatus"]
          transcriptId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptShare_sharedById_fkey"
            columns: ["sharedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptShare_transcriptId_fkey"
            columns: ["transcriptId"]
            isOneToOne: false
            referencedRelation: "Transcript"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptTag: {
        Row: {
          caseId: string | null
          color: string | null
          createdAt: string
          description: string | null
          firmId: string | null
          id: string
          isSystem: boolean
          name: string
          updatedAt: string
          userId: string | null
        }
        Insert: {
          caseId?: string | null
          color?: string | null
          createdAt?: string
          description?: string | null
          firmId?: string | null
          id: string
          isSystem?: boolean
          name: string
          updatedAt: string
          userId?: string | null
        }
        Update: {
          caseId?: string | null
          color?: string | null
          createdAt?: string
          description?: string | null
          firmId?: string | null
          id?: string
          isSystem?: boolean
          name?: string
          updatedAt?: string
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptTag_caseId_fkey"
            columns: ["caseId"]
            isOneToOne: false
            referencedRelation: "Case"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptTag_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "Firm"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "TranscriptTag_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      TranscriptToken: {
        Row: {
          confidence: number
          createdAt: string
          end: number
          id: string
          index: number
          isFlagged: boolean
          isReviewed: boolean
          punctuatedWord: string | null
          speaker: number | null
          start: number
          transcriptId: string
          word: string
        }
        Insert: {
          confidence: number
          createdAt?: string
          end: number
          id: string
          index: number
          isFlagged?: boolean
          isReviewed?: boolean
          punctuatedWord?: string | null
          speaker?: number | null
          start: number
          transcriptId: string
          word: string
        }
        Update: {
          confidence?: number
          createdAt?: string
          end?: number
          id?: string
          index?: number
          isFlagged?: boolean
          isReviewed?: boolean
          punctuatedWord?: string | null
          speaker?: number | null
          start?: number
          transcriptId?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "TranscriptToken_transcriptId_fkey"
            columns: ["transcriptId"]
            isOneToOne: false
            referencedRelation: "Transcript"
            referencedColumns: ["id"]
          },
        ]
      }
      UsageRecord: {
        Row: {
          amount: number
          createdAt: string
          firmId: string
          id: string
          type: string
        }
        Insert: {
          amount: number
          createdAt?: string
          firmId: string
          id: string
          type: string
        }
        Update: {
          amount?: number
          createdAt?: string
          firmId?: string
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "UsageRecord_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "Firm"
            referencedColumns: ["id"]
          },
        ]
      }
      User: {
        Row: {
          agencyId: string | null
          agencyName: string | null
          availability: boolean
          createdAt: string
          csrNumber: string | null
          defaultTranscriptSettings: Json | null
          deletedAt: string | null
          email: string
          experienceLevel: string | null
          firmId: string | null
          firstName: string
          id: string
          lastLoginAt: string | null
          lastName: string
          notificationPreferences: Json | null
          passwordHash: string | null
          phone: string | null
          photo: string | null
          role: Database["public"]["Enums"]["UserRole"]
          specialties: string[] | null
          timezone: string
          updatedAt: string
        }
        Insert: {
          agencyId?: string | null
          agencyName?: string | null
          availability?: boolean
          createdAt?: string
          csrNumber?: string | null
          defaultTranscriptSettings?: Json | null
          deletedAt?: string | null
          email: string
          experienceLevel?: string | null
          firmId?: string | null
          firstName: string
          id: string
          lastLoginAt?: string | null
          lastName: string
          notificationPreferences?: Json | null
          passwordHash?: string | null
          phone?: string | null
          photo?: string | null
          role: Database["public"]["Enums"]["UserRole"]
          specialties?: string[] | null
          timezone?: string
          updatedAt: string
        }
        Update: {
          agencyId?: string | null
          agencyName?: string | null
          availability?: boolean
          createdAt?: string
          csrNumber?: string | null
          defaultTranscriptSettings?: Json | null
          deletedAt?: string | null
          email?: string
          experienceLevel?: string | null
          firmId?: string | null
          firstName?: string
          id?: string
          lastLoginAt?: string | null
          lastName?: string
          notificationPreferences?: Json | null
          passwordHash?: string | null
          phone?: string | null
          photo?: string | null
          role?: Database["public"]["Enums"]["UserRole"]
          specialties?: string[] | null
          timezone?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "User_agencyId_fkey"
            columns: ["agencyId"]
            isOneToOne: false
            referencedRelation: "Agency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "User_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "Firm"
            referencedColumns: ["id"]
          },
        ]
      }
      WebhookConfig: {
        Row: {
          createdAt: string
          events: string[] | null
          firmId: string
          id: string
          isActive: boolean
          secret: string
          updatedAt: string
          url: string
        }
        Insert: {
          createdAt?: string
          events?: string[] | null
          firmId: string
          id: string
          isActive?: boolean
          secret: string
          updatedAt: string
          url: string
        }
        Update: {
          createdAt?: string
          events?: string[] | null
          firmId?: string
          id?: string
          isActive?: boolean
          secret?: string
          updatedAt?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "WebhookConfig_firmId_fkey"
            columns: ["firmId"]
            isOneToOne: false
            referencedRelation: "Firm"
            referencedColumns: ["id"]
          },
        ]
      }
      WebhookDelivery: {
        Row: {
          attempts: number
          createdAt: string
          error: string | null
          event: string
          id: string
          lastAttemptAt: string | null
          payload: string
          status: string
          statusCode: number | null
          webhookId: string
        }
        Insert: {
          attempts?: number
          createdAt?: string
          error?: string | null
          event: string
          id: string
          lastAttemptAt?: string | null
          payload: string
          status?: string
          statusCode?: number | null
          webhookId: string
        }
        Update: {
          attempts?: number
          createdAt?: string
          error?: string | null
          event?: string
          id?: string
          lastAttemptAt?: string | null
          payload?: string
          status?: string
          statusCode?: number | null
          webhookId?: string
        }
        Relationships: [
          {
            foreignKeyName: "WebhookDelivery_webhookId_fkey"
            columns: ["webhookId"]
            isOneToOne: false
            referencedRelation: "WebhookConfig"
            referencedColumns: ["id"]
          },
        ]
      }
      wkt_bookmarks: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          question_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          question_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wkt_bookmarks_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "wkt_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      wkt_mock_exams: {
        Row: {
          answers: Json | null
          category_scores: Json | null
          completed_at: string | null
          correct_answers: number | null
          id: string
          passed: boolean | null
          question_ids: string[] | null
          score_percentage: number | null
          started_at: string | null
          time_spent_seconds: number | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          category_scores?: Json | null
          completed_at?: string | null
          correct_answers?: number | null
          id?: string
          passed?: boolean | null
          question_ids?: string[] | null
          score_percentage?: number | null
          started_at?: string | null
          time_spent_seconds?: number | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          category_scores?: Json | null
          completed_at?: string | null
          correct_answers?: number | null
          id?: string
          passed?: boolean | null
          question_ids?: string[] | null
          score_percentage?: number | null
          started_at?: string | null
          time_spent_seconds?: number | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: []
      }
      wkt_questions: {
        Row: {
          ai_generated: boolean | null
          category: string
          correct_answer: string
          created_at: string | null
          difficulty: number | null
          explanation: string | null
          id: string
          options: Json | null
          question_text: string
          question_type: string
          source_reference: string | null
          subcategory: string | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          ai_generated?: boolean | null
          category: string
          correct_answer: string
          created_at?: string | null
          difficulty?: number | null
          explanation?: string | null
          id?: string
          options?: Json | null
          question_text: string
          question_type: string
          source_reference?: string | null
          subcategory?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          ai_generated?: boolean | null
          category?: string
          correct_answer?: string
          created_at?: string | null
          difficulty?: number | null
          explanation?: string | null
          id?: string
          options?: Json | null
          question_text?: string
          question_type?: string
          source_reference?: string | null
          subcategory?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      wkt_study_sessions: {
        Row: {
          category: string | null
          correct_answers: number | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          questions_answered: number | null
          session_type: string | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          correct_answers?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          questions_answered?: number | null
          session_type?: string | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          correct_answers?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          questions_answered?: number | null
          session_type?: string | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wkt_user_progress: {
        Row: {
          attempts: number | null
          correct_count: number | null
          created_at: string | null
          ease_factor: number | null
          id: string
          interval_days: number | null
          last_attempt: string | null
          next_review: string | null
          question_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          correct_count?: number | null
          created_at?: string | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_attempt?: string | null
          next_review?: string | null
          question_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          correct_count?: number | null
          created_at?: string | null
          ease_factor?: number | null
          id?: string
          interval_days?: number | null
          last_attempt?: string | null
          next_review?: string | null
          question_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wkt_user_progress_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "wkt_questions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      AgencyPlanType: "BASIC" | "PROFESSIONAL" | "ENTERPRISE"
      AppearanceType: "IN_PERSON" | "REMOTE" | "PHONE"
      ASRModelTier: "STANDARD" | "ENHANCED"
      AssignmentStatus:
        | "INVITED"
        | "ACCEPTED"
        | "DECLINED"
        | "IN_PROGRESS"
        | "SUBMITTED"
        | "EXPIRED"
        | "RELEASED"
      AttorneyRole:
        | "PLAINTIFF_COUNSEL"
        | "DEFENSE_COUNSEL"
        | "ORDERING_ATTORNEY"
        | "COPY_ATTORNEY"
        | "OTHER"
      AttorneyTranscriptStatus: "NOT_REVIEWED" | "IN_PROGRESS" | "COMPLETE"
      AudioEnhancementType: "AUTOMATED_DOLBY" | "MANUAL_RX"
      AudioProcessingMode: "AUTOMATED" | "MANUAL_RX"
      AudioSessionStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED"
      AvailabilityType: "AVAILABLE" | "UNAVAILABLE" | "TENTATIVE"
      BillingServiceType:
        | "TRANSCRIPTION_AUTOMATED"
        | "MODEL_UPGRADE"
        | "HUMAN_REVIEW_CONFIDENCE"
        | "HUMAN_REVIEW_FULL"
        | "FORENSIC_AUDIO_RX"
      BillingUnit: "PER_MINUTE" | "PER_WORD" | "PER_FILE" | "PER_HOUR"
      BookingRequestStatus:
        | "PENDING"
        | "APPROVED"
        | "REJECTED"
        | "CANCELLED"
        | "MODIFIED"
      CalendarAuditAction:
        | "EVENT_CREATED"
        | "EVENT_UPDATED"
        | "EVENT_CANCELLED"
        | "EVENT_RESCHEDULED"
        | "REPORTER_ASSIGNED"
        | "REPORTER_UNASSIGNED"
        | "SCOPIST_ASSIGNED"
        | "SCOPIST_UNASSIGNED"
        | "VIDEOGRAPHER_ASSIGNED"
        | "VIDEOGRAPHER_UNASSIGNED"
        | "INTERPRETER_ASSIGNED"
        | "INTERPRETER_UNASSIGNED"
        | "CONVERTED_TO_JOB"
        | "NOTE_ADDED"
        | "STATUS_CHANGED"
      CalendarEventStatus:
        | "REQUESTED"
        | "SCHEDULED"
        | "CONFIRMED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "CONVERTED"
        | "CANCELLED"
        | "RESCHEDULED"
        | "EXTERNAL_BLOCK"
      CaseDocumentType:
        | "NOTICE_OF_DEPOSITION"
        | "CSR_PAPERWORK"
        | "DEPO_NOTES"
        | "COURT_ORDER"
        | "SUBPOENA"
        | "EXHIBIT_LIST"
        | "OTHER"
      CaseRole: "ATTORNEY" | "PARALEGAL" | "REPORTER"
      CaseStatus: "ACTIVE" | "CLOSED" | "SETTLED" | "ARCHIVED"
      ClaimStatus:
        | "PENDING"
        | "ACCEPTED"
        | "REJECTED"
        | "IN_PROGRESS"
        | "SUBMITTED"
        | "APPROVED"
        | "DISPUTED"
        | "CANCELLED"
      ConflictResolution:
        | "KEPT_ORIGINAL"
        | "MOVED_ORIGINAL"
        | "REASSIGNED_REPORTER"
        | "OVERRIDE_ACCEPTED"
        | "TIME_ADJUSTED"
      ConflictStatus: "PENDING" | "OVERRIDDEN" | "RESOLVED" | "AUTO_FIXED"
      ConflictType:
        | "REPORTER_DOUBLE_BOOKED"
        | "LOCATION_CONFLICT"
        | "TRAVEL_TIME_INSUFFICIENT"
        | "RESOURCE_UNAVAILABLE"
      CSRAttorneyRole:
        | "ORDERING_ATTORNEY"
        | "COPY_ATTORNEY"
        | "PLAINTIFF_COUNSEL"
        | "DEFENSE_COUNSEL"
        | "CROSS_NOTICING"
        | "OTHER"
      DataSource: "IMPORT" | "MANUAL" | "REPORTER_OVERRIDE"
      DeliveryMethod: "E_TRANS" | "HARD_COPY" | "BOTH" | "FTP" | "PORTAL"
      DeliveryPriority:
        | "STANDARD"
        | "EXPEDITE"
        | "RUSH"
        | "DAILY"
        | "HOURLY"
        | "REALTIME"
      DeponentRole:
        | "PLAINTIFF"
        | "DEFENDANT"
        | "CORPORATE_REP"
        | "EXPERT_WITNESS"
        | "FACT_WITNESS"
        | "THIRD_PARTY"
      DepositionNoteType: "PROPER_NOUN" | "GENERAL_NOTE"
      DocumentTemplateType:
        | "TITLE_PAGE"
        | "APPEARANCE_PAGE"
        | "CERTIFICATE_PAGE"
        | "INDEX_PAGE"
        | "ERRATA_SHEET"
        | "WORD_INDEX"
      EditType:
        | "WORD_CORRECTION"
        | "SPEAKER_ASSIGNMENT"
        | "PUNCTUATION"
        | "INAUDIBLE_MARK"
        | "FORMATTING"
      EnhancementMode: "OFF" | "DOLBY_ONLY" | "HYBRID" | "AUPHONIC_ONLY"
      EnhancementStatus:
        | "PENDING"
        | "PROCESSING_DOLBY"
        | "PROCESSING_AUPHONIC"
        | "COMPLETED"
        | "ERROR"
      EventType:
        | "DEPOSITION"
        | "HEARING"
        | "ARBITRATION"
        | "MEDIATION"
        | "EUO"
        | "STATEMENT"
        | "OTHER"
      ExternalCalendarProvider: "GOOGLE" | "OUTLOOK" | "APPLE"
      ExternalCalendarSyncMode: "READ_ONLY" | "PUSH_INTERNAL" | "BIDIRECTIONAL"
      ExternalEventSyncStatus:
        | "SYNCED"
        | "PENDING"
        | "CONFLICT"
        | "FAILED"
        | "DELETED"
      ExtractionStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
      FileType:
        | "AUDIO"
        | "VIDEO"
        | "NOTICE"
        | "COURT_ORDER"
        | "ROUGH_TRANSCRIPT"
        | "EXHIBIT"
        | "FINAL_TRANSCRIPT"
      HighlightColor: "YELLOW" | "GREEN" | "BLUE" | "PINK" | "ORANGE" | "PURPLE"
      InvoiceStatus: "DRAFT" | "OPEN" | "PAID" | "VOID"
      JobStatus:
        | "CREATED"
        | "FILES_UPLOADED"
        | "ENHANCING_AUDIO"
        | "TRANSCRIBING"
        | "AI_REVIEWING"
        | "READY_FOR_EDIT"
        | "ASSIGNED"
        | "IN_EDIT"
        | "SUBMITTED_FOR_REVIEW"
        | "IN_REVIEW"
        | "SCOPIST_COMPLETE"
        | "REVIEW_COMPLETE"
        | "COMPLETED"
        | "CANCELLED"
      LocationType:
        | "IN_PERSON"
        | "ZOOM"
        | "TEAMS"
        | "WEBEX"
        | "PHONE"
        | "HYBRID"
        | "OTHER"
      MeetingPlatform: "ZOOM" | "TEAMS" | "WEBEX" | "GOOGLE_MEET" | "OTHER"
      NotificationType:
        | "JOB_ASSIGNED"
        | "TRANSCRIPTION_COMPLETE"
        | "AI_REVIEW_COMPLETE"
        | "SCOPIST_ACCEPTED"
        | "SCOPIST_DECLINED"
        | "SCOPIST_SUBMITTED"
        | "REPORTER_REVIEWED"
        | "JOB_COMPLETE"
        | "SYSTEM_ERROR"
        | "MESSAGE_RECEIVED"
      OrderFulfillmentStatus:
        | "PENDING"
        | "READY"
        | "SENT"
        | "DELIVERED"
        | "RETURNED"
        | "CANCELLED"
      ParticipantRole:
        | "ATTORNEY_PLAINTIFF"
        | "ATTORNEY_DEFENSE"
        | "WITNESS"
        | "DEPONENT"
        | "INTERPRETER"
        | "VIDEOGRAPHER"
        | "OBSERVER"
      PartyType:
        | "PLAINTIFF"
        | "DEFENDANT"
        | "CROSS_PLAINTIFF"
        | "CROSS_DEFENDANT"
        | "THIRD_PARTY"
        | "INTERVENOR"
      ProperNounCategory:
        | "PERSON_NAME"
        | "COMPANY_NAME"
        | "PLACE_NAME"
        | "PRODUCT_NAME"
        | "LEGAL_TERM"
        | "MEDICAL_TERM"
        | "TECHNICAL_TERM"
        | "ACRONYM"
        | "OTHER"
      RateType: "PER_PAGE" | "PER_AUDIO_MINUTE" | "FLAT_RATE" | "HOURLY"
      RecurrenceFrequency: "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY"
      RuleCategory:
        | "CAPITALIZATION"
        | "PUNCTUATION"
        | "FORMATTING"
        | "LEGAL_TERMS"
        | "SPEAKER_ID"
        | "NUMBERS"
        | "DATES"
        | "CUSTOM"
      RushType: "STANDARD" | "EXPEDITE" | "DAILY" | "HOURLY" | "REALTIME"
      ShareStatus: "ACTIVE" | "EXPIRED" | "REVOKED"
      ShareType: "USER" | "LINK" | "ORGANIZATION"
      TermCategory:
        | "PERSON_NAME"
        | "COMPANY_NAME"
        | "PLACE_NAME"
        | "LEGAL_TERM"
        | "MEDICAL_TERM"
        | "TECHNICAL_TERM"
        | "CASE_SPECIFIC"
      TranscriptAccessLevel: "VIEW" | "COMMENT" | "EDIT"
      TranscriptDeliveryType:
        | "E_TRANS"
        | "HARD_COPY"
        | "ORIGINAL"
        | "BOTH"
        | "FTP"
        | "PORTAL"
      TranscriptFileFormat:
        | "WORD"
        | "PDF"
        | "ASCII"
        | "WORD_PERFECT"
        | "RTF"
        | "PTX"
      TranscriptFormat: "WORD" | "PDF" | "ASCII" | "WORD_PERFECT" | "RTF"
      TranscriptionStatus:
        | "PENDING"
        | "PROCESSING"
        | "COMPLETED"
        | "ERROR"
        | "CANCELLED"
      UserRole:
        | "REPORTER"
        | "SCOPIST"
        | "ADMIN"
        | "ATTORNEY"
        | "PARALEGAL"
        | "AGENCY"
        | "AGENCY_ADMIN"
        | "FIRM_ADMIN"
      VideoRecordType: "CR_ONLY" | "CR_VIDEO" | "CR_PIP" | "REMOTE" | "HYBRID"
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
    Enums: {
      AgencyPlanType: ["BASIC", "PROFESSIONAL", "ENTERPRISE"],
      AppearanceType: ["IN_PERSON", "REMOTE", "PHONE"],
      ASRModelTier: ["STANDARD", "ENHANCED"],
      AssignmentStatus: [
        "INVITED",
        "ACCEPTED",
        "DECLINED",
        "IN_PROGRESS",
        "SUBMITTED",
        "EXPIRED",
        "RELEASED",
      ],
      AttorneyRole: [
        "PLAINTIFF_COUNSEL",
        "DEFENSE_COUNSEL",
        "ORDERING_ATTORNEY",
        "COPY_ATTORNEY",
        "OTHER",
      ],
      AttorneyTranscriptStatus: ["NOT_REVIEWED", "IN_PROGRESS", "COMPLETE"],
      AudioEnhancementType: ["AUTOMATED_DOLBY", "MANUAL_RX"],
      AudioProcessingMode: ["AUTOMATED", "MANUAL_RX"],
      AudioSessionStatus: ["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"],
      AvailabilityType: ["AVAILABLE", "UNAVAILABLE", "TENTATIVE"],
      BillingServiceType: [
        "TRANSCRIPTION_AUTOMATED",
        "MODEL_UPGRADE",
        "HUMAN_REVIEW_CONFIDENCE",
        "HUMAN_REVIEW_FULL",
        "FORENSIC_AUDIO_RX",
      ],
      BillingUnit: ["PER_MINUTE", "PER_WORD", "PER_FILE", "PER_HOUR"],
      BookingRequestStatus: [
        "PENDING",
        "APPROVED",
        "REJECTED",
        "CANCELLED",
        "MODIFIED",
      ],
      CalendarAuditAction: [
        "EVENT_CREATED",
        "EVENT_UPDATED",
        "EVENT_CANCELLED",
        "EVENT_RESCHEDULED",
        "REPORTER_ASSIGNED",
        "REPORTER_UNASSIGNED",
        "SCOPIST_ASSIGNED",
        "SCOPIST_UNASSIGNED",
        "VIDEOGRAPHER_ASSIGNED",
        "VIDEOGRAPHER_UNASSIGNED",
        "INTERPRETER_ASSIGNED",
        "INTERPRETER_UNASSIGNED",
        "CONVERTED_TO_JOB",
        "NOTE_ADDED",
        "STATUS_CHANGED",
      ],
      CalendarEventStatus: [
        "REQUESTED",
        "SCHEDULED",
        "CONFIRMED",
        "IN_PROGRESS",
        "COMPLETED",
        "CONVERTED",
        "CANCELLED",
        "RESCHEDULED",
        "EXTERNAL_BLOCK",
      ],
      CaseDocumentType: [
        "NOTICE_OF_DEPOSITION",
        "CSR_PAPERWORK",
        "DEPO_NOTES",
        "COURT_ORDER",
        "SUBPOENA",
        "EXHIBIT_LIST",
        "OTHER",
      ],
      CaseRole: ["ATTORNEY", "PARALEGAL", "REPORTER"],
      CaseStatus: ["ACTIVE", "CLOSED", "SETTLED", "ARCHIVED"],
      ClaimStatus: [
        "PENDING",
        "ACCEPTED",
        "REJECTED",
        "IN_PROGRESS",
        "SUBMITTED",
        "APPROVED",
        "DISPUTED",
        "CANCELLED",
      ],
      ConflictResolution: [
        "KEPT_ORIGINAL",
        "MOVED_ORIGINAL",
        "REASSIGNED_REPORTER",
        "OVERRIDE_ACCEPTED",
        "TIME_ADJUSTED",
      ],
      ConflictStatus: ["PENDING", "OVERRIDDEN", "RESOLVED", "AUTO_FIXED"],
      ConflictType: [
        "REPORTER_DOUBLE_BOOKED",
        "LOCATION_CONFLICT",
        "TRAVEL_TIME_INSUFFICIENT",
        "RESOURCE_UNAVAILABLE",
      ],
      CSRAttorneyRole: [
        "ORDERING_ATTORNEY",
        "COPY_ATTORNEY",
        "PLAINTIFF_COUNSEL",
        "DEFENSE_COUNSEL",
        "CROSS_NOTICING",
        "OTHER",
      ],
      DataSource: ["IMPORT", "MANUAL", "REPORTER_OVERRIDE"],
      DeliveryMethod: ["E_TRANS", "HARD_COPY", "BOTH", "FTP", "PORTAL"],
      DeliveryPriority: [
        "STANDARD",
        "EXPEDITE",
        "RUSH",
        "DAILY",
        "HOURLY",
        "REALTIME",
      ],
      DeponentRole: [
        "PLAINTIFF",
        "DEFENDANT",
        "CORPORATE_REP",
        "EXPERT_WITNESS",
        "FACT_WITNESS",
        "THIRD_PARTY",
      ],
      DepositionNoteType: ["PROPER_NOUN", "GENERAL_NOTE"],
      DocumentTemplateType: [
        "TITLE_PAGE",
        "APPEARANCE_PAGE",
        "CERTIFICATE_PAGE",
        "INDEX_PAGE",
        "ERRATA_SHEET",
        "WORD_INDEX",
      ],
      EditType: [
        "WORD_CORRECTION",
        "SPEAKER_ASSIGNMENT",
        "PUNCTUATION",
        "INAUDIBLE_MARK",
        "FORMATTING",
      ],
      EnhancementMode: ["OFF", "DOLBY_ONLY", "HYBRID", "AUPHONIC_ONLY"],
      EnhancementStatus: [
        "PENDING",
        "PROCESSING_DOLBY",
        "PROCESSING_AUPHONIC",
        "COMPLETED",
        "ERROR",
      ],
      EventType: [
        "DEPOSITION",
        "HEARING",
        "ARBITRATION",
        "MEDIATION",
        "EUO",
        "STATEMENT",
        "OTHER",
      ],
      ExternalCalendarProvider: ["GOOGLE", "OUTLOOK", "APPLE"],
      ExternalCalendarSyncMode: ["READ_ONLY", "PUSH_INTERNAL", "BIDIRECTIONAL"],
      ExternalEventSyncStatus: [
        "SYNCED",
        "PENDING",
        "CONFLICT",
        "FAILED",
        "DELETED",
      ],
      ExtractionStatus: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      FileType: [
        "AUDIO",
        "VIDEO",
        "NOTICE",
        "COURT_ORDER",
        "ROUGH_TRANSCRIPT",
        "EXHIBIT",
        "FINAL_TRANSCRIPT",
      ],
      HighlightColor: ["YELLOW", "GREEN", "BLUE", "PINK", "ORANGE", "PURPLE"],
      InvoiceStatus: ["DRAFT", "OPEN", "PAID", "VOID"],
      JobStatus: [
        "CREATED",
        "FILES_UPLOADED",
        "ENHANCING_AUDIO",
        "TRANSCRIBING",
        "AI_REVIEWING",
        "READY_FOR_EDIT",
        "ASSIGNED",
        "IN_EDIT",
        "SUBMITTED_FOR_REVIEW",
        "IN_REVIEW",
        "SCOPIST_COMPLETE",
        "REVIEW_COMPLETE",
        "COMPLETED",
        "CANCELLED",
      ],
      LocationType: [
        "IN_PERSON",
        "ZOOM",
        "TEAMS",
        "WEBEX",
        "PHONE",
        "HYBRID",
        "OTHER",
      ],
      MeetingPlatform: ["ZOOM", "TEAMS", "WEBEX", "GOOGLE_MEET", "OTHER"],
      NotificationType: [
        "JOB_ASSIGNED",
        "TRANSCRIPTION_COMPLETE",
        "AI_REVIEW_COMPLETE",
        "SCOPIST_ACCEPTED",
        "SCOPIST_DECLINED",
        "SCOPIST_SUBMITTED",
        "REPORTER_REVIEWED",
        "JOB_COMPLETE",
        "SYSTEM_ERROR",
        "MESSAGE_RECEIVED",
      ],
      OrderFulfillmentStatus: [
        "PENDING",
        "READY",
        "SENT",
        "DELIVERED",
        "RETURNED",
        "CANCELLED",
      ],
      ParticipantRole: [
        "ATTORNEY_PLAINTIFF",
        "ATTORNEY_DEFENSE",
        "WITNESS",
        "DEPONENT",
        "INTERPRETER",
        "VIDEOGRAPHER",
        "OBSERVER",
      ],
      PartyType: [
        "PLAINTIFF",
        "DEFENDANT",
        "CROSS_PLAINTIFF",
        "CROSS_DEFENDANT",
        "THIRD_PARTY",
        "INTERVENOR",
      ],
      ProperNounCategory: [
        "PERSON_NAME",
        "COMPANY_NAME",
        "PLACE_NAME",
        "PRODUCT_NAME",
        "LEGAL_TERM",
        "MEDICAL_TERM",
        "TECHNICAL_TERM",
        "ACRONYM",
        "OTHER",
      ],
      RateType: ["PER_PAGE", "PER_AUDIO_MINUTE", "FLAT_RATE", "HOURLY"],
      RecurrenceFrequency: ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"],
      RuleCategory: [
        "CAPITALIZATION",
        "PUNCTUATION",
        "FORMATTING",
        "LEGAL_TERMS",
        "SPEAKER_ID",
        "NUMBERS",
        "DATES",
        "CUSTOM",
      ],
      RushType: ["STANDARD", "EXPEDITE", "DAILY", "HOURLY", "REALTIME"],
      ShareStatus: ["ACTIVE", "EXPIRED", "REVOKED"],
      ShareType: ["USER", "LINK", "ORGANIZATION"],
      TermCategory: [
        "PERSON_NAME",
        "COMPANY_NAME",
        "PLACE_NAME",
        "LEGAL_TERM",
        "MEDICAL_TERM",
        "TECHNICAL_TERM",
        "CASE_SPECIFIC",
      ],
      TranscriptAccessLevel: ["VIEW", "COMMENT", "EDIT"],
      TranscriptDeliveryType: [
        "E_TRANS",
        "HARD_COPY",
        "ORIGINAL",
        "BOTH",
        "FTP",
        "PORTAL",
      ],
      TranscriptFileFormat: [
        "WORD",
        "PDF",
        "ASCII",
        "WORD_PERFECT",
        "RTF",
        "PTX",
      ],
      TranscriptFormat: ["WORD", "PDF", "ASCII", "WORD_PERFECT", "RTF"],
      TranscriptionStatus: [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "ERROR",
        "CANCELLED",
      ],
      UserRole: [
        "REPORTER",
        "SCOPIST",
        "ADMIN",
        "ATTORNEY",
        "PARALEGAL",
        "AGENCY",
        "AGENCY_ADMIN",
        "FIRM_ADMIN",
      ],
      VideoRecordType: ["CR_ONLY", "CR_VIDEO", "CR_PIP", "REMOTE", "HYBRID"],
    },
  },
} as const
