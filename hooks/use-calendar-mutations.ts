'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface MutationState {
  isLoading: boolean;
  error: string | null;
}

interface MutationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function useCalendarMutations() {
  const [mutations, setMutations] = useState<Record<string, MutationState>>({});

  const setMutationState = (key: string, state: Partial<MutationState>) => {
    setMutations(prev => ({
      ...prev,
      [key]: { ...prev[key], isLoading: false, error: null, ...state },
    }));
  };

  // ==========================================
  // CONVERT TO JOB
  // ==========================================
  const convertToJob = useCallback(async (
    eventId: string,
    options: {
      includeTranscription?: boolean;
      assignToScopist?: boolean;
      scopistId?: string;
      priority?: 'NORMAL' | 'RUSH' | 'URGENT';
      notes?: string;
    } = {}
  ): Promise<MutationResult<{ jobId: string }>> => {
    const key = `convert-${eventId}`;
    setMutationState(key, { isLoading: true, error: null });

    try {
      const response = await fetch(`/api/calendar/${eventId}/convert-to-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to convert event');
      }

      setMutationState(key, { isLoading: false });
      toast.success('Event converted to job successfully');
      
      return { 
        success: true, 
        data: { jobId: data.job.id } 
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setMutationState(key, { isLoading: false, error: message });
      toast.error(`Failed to convert event: ${message}`);
      
      return { success: false, error: message };
    }
  }, []);

  // ==========================================
  // ASSIGN PERSONNEL
  // ==========================================
  const assignPersonnel = useCallback(async (
    eventId: string,
    personnelType: 'REPORTER' | 'SCOPIST' | 'VIDEOGRAPHER' | 'INTERPRETER',
    personnelId: string | null,
    options: {
      notifyAssignee?: boolean;
      notes?: string;
    } = {}
  ): Promise<MutationResult<{ personnelName: string | null }>> => {
    const key = `assign-${eventId}-${personnelType}`;
    setMutationState(key, { isLoading: true, error: null });

    try {
      const response = await fetch(`/api/calendar/${eventId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personnelType,
          personnelId,
          ...options,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to assign personnel');
      }

      setMutationState(key, { isLoading: false });
      
      const action = personnelId ? 'assigned' : 'unassigned';
      toast.success(`${personnelType} ${action} successfully`);
      
      return { 
        success: true, 
        data: { personnelName: data.assignment.personnelName } 
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setMutationState(key, { isLoading: false, error: message });
      toast.error(`Failed to ${personnelId ? 'assign' : 'unassign'} ${personnelType.toLowerCase()}: ${message}`);
      
      return { success: false, error: message };
    }
  }, []);

  // ==========================================
  // CANCEL EVENT
  // ==========================================
  const cancelEvent = useCallback(async (
    eventId: string,
    reason: string,
    options: {
      notifyParties?: boolean;
    } = {}
  ): Promise<MutationResult<void>> => {
    const key = `cancel-${eventId}`;
    setMutationState(key, { isLoading: true, error: null });

    try {
      const response = await fetch(`/api/calendar/${eventId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          notifyParties: options.notifyParties ?? true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to cancel event');
      }

      setMutationState(key, { isLoading: false });
      toast.success('Event cancelled successfully');
      
      return { success: true };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setMutationState(key, { isLoading: false, error: message });
      toast.error(`Failed to cancel event: ${message}`);
      
      return { success: false, error: message };
    }
  }, []);

  // ==========================================
  // RESCHEDULE EVENT
  // ==========================================
  const rescheduleEvent = useCallback(async (
    eventId: string,
    newSchedule: {
      scheduledStart: string;
      scheduledEnd: string;
    },
    options: {
      reason?: string;
      notifyParties?: boolean;
      updateLocation?: boolean;
      newLocation?: {
        isRemote: boolean;
        address?: string;
        city?: string;
        state?: string;
        zip?: string;
        zoomUrl?: string;
      };
    } = {}
  ): Promise<MutationResult<void>> => {
    const key = `reschedule-${eventId}`;
    setMutationState(key, { isLoading: true, error: null });

    try {
      const response = await fetch(`/api/calendar/${eventId}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledStart: newSchedule.scheduledStart,
          scheduledEnd: newSchedule.scheduledEnd,
          ...options,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle conflict specifically
        if (data.code === 'CONFLICT') {
          throw new Error(`Schedule conflict: ${data.message}`);
        }
        throw new Error(data.message || data.error || 'Failed to reschedule event');
      }

      setMutationState(key, { isLoading: false });
      toast.success('Event rescheduled successfully');
      
      return { success: true };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setMutationState(key, { isLoading: false, error: message });
      toast.error(`Failed to reschedule: ${message}`);
      
      return { success: false, error: message };
    }
  }, []);

  // ==========================================
  // ADD NOTE
  // ==========================================
  const addNote = useCallback(async (
    eventId: string,
    content: string,
    options: {
      isInternal?: boolean;
    } = {}
  ): Promise<MutationResult<{ noteId: string }>> => {
    const key = `note-${eventId}`;
    setMutationState(key, { isLoading: true, error: null });

    try {
      const response = await fetch(`/api/calendar/${eventId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          isInternal: options.isInternal ?? false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to add note');
      }

      setMutationState(key, { isLoading: false });
      toast.success('Note added successfully');
      
      return { 
        success: true, 
        data: { noteId: data.note?.createdAt || Date.now().toString() } 
      };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setMutationState(key, { isLoading: false, error: message });
      toast.error(`Failed to add note: ${message}`);
      
      return { success: false, error: message };
    }
  }, []);

  // ==========================================
  // HELPERS
  // ==========================================
  const isLoading = useCallback((key: string) => {
    return mutations[key]?.isLoading ?? false;
  }, [mutations]);

  const getError = useCallback((key: string) => {
    return mutations[key]?.error ?? null;
  }, [mutations]);

  return {
    // Mutations
    convertToJob,
    assignPersonnel,
    cancelEvent,
    rescheduleEvent,
    addNote,
    
    // State helpers
    isLoading,
    getError,
    mutations,
  };
}

