/**
 * Incident Response & Monitoring
 * Track and respond to system incidents
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentCategory = 'auth' | 'rls' | 'ai' | 'api' | 'system' | 'other';

export interface CreateIncidentParams {
  severity: IncidentSeverity;
  category: IncidentCategory;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create an incident (non-blocking, fire-and-forget)
 */
export async function createIncident(params: CreateIncidentParams): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Insert incident (non-blocking - don't await errors)
    // Note: User ID is not stored in incidents table (system-level tracking)
    void Promise.resolve(
      supabase
        .from('incidents')
        .insert({
          severity: params.severity,
          category: params.category,
          message: params.message,
          metadata: params.metadata || {},
        })
    ).catch((error: unknown) => {
      // Log error but don't throw (incident logging shouldn't break the app)
      const errorMessage = error instanceof Error ? error.message : String(error);
       
      console.warn('[incidents] Failed to log incident', { 
        category: params.category, 
        severity: params.severity,
        error: errorMessage 
      });
    });
  } catch (error) {
    // Silently fail - incident logging should never break the app
     
    console.warn('[incidents] Incident logging error', { 
      category: params.category, 
      severity: params.severity,
      error 
    });
  }
}

/**
 * Convenience helpers for common incidents
 */
export const incidents = {
  authFailure: (message: string, metadata?: Record<string, unknown>) =>
    createIncident({ severity: 'medium', category: 'auth', message, metadata }),
  
  rlsViolation: (message: string, metadata?: Record<string, unknown>) =>
    createIncident({ severity: 'high', category: 'rls', message, metadata }),
  
  aiError: (message: string, metadata?: Record<string, unknown>) =>
    createIncident({ severity: 'medium', category: 'ai', message, metadata }),
  
  apiOutage: (service: string, message: string, metadata?: Record<string, unknown>) =>
    createIncident({ 
      severity: 'high', 
      category: 'api', 
      message: `${service}: ${message}`, 
      metadata: { ...metadata, service } 
    }),
  
  systemError: (message: string, metadata?: Record<string, unknown>) =>
    createIncident({ severity: 'high', category: 'system', message, metadata }),
};
