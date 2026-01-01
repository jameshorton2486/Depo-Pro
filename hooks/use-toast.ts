/**
 * Enhanced Toast Hook with Pre-defined Patterns
 * Standardized toast notifications for Depo-Pro
 */

import { toast } from 'sonner';

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Main toast hook with consistent API
 */
export function useToast() {
  const success = (title: string, description?: string, options?: ToastOptions) => {
    toast.success(title, {
      description: description || undefined,
      duration: options?.duration || 5000,
    } as any);
  };

  const error = (title: string, description?: string, options?: ToastOptions) => {
    toast.error(title, {
      description: description || undefined,
      duration: options?.duration || 7000,
    } as any);
  };

  const info = (title: string, description?: string, options?: ToastOptions) => {
    toast.info(title, {
      description: description || undefined,
      duration: options?.duration || 5000,
    } as any);
  };

  const loading = (title: string, description?: string) => {
    return toast.loading(title, {
      description,
    });
  };

  const promise = <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    return toast.promise(promise, {
      loading: options.loading,
      success: options.success,
      error: options.error,
    });
  };

  return {
    success,
    error,
    info,
    loading,
    promise,
  };
}

/**
 * Pre-defined toast patterns for common actions
 */
export const toastPatterns = {
  job: {
    created: () => toast.success('Job created', { description: 'Your new job has been created successfully.' }),
    updated: () => toast.success('Job updated', { description: 'Job details have been saved.' }),
    deleted: () => toast.success('Job deleted', { description: 'The job has been removed.' }),
    archived: () => toast.success('Job archived', { description: 'The job has been moved to archives.' }),
    error: (message?: string) => toast.error('Job error', { description: message || 'An error occurred while processing the job.' }),
  },

  transcription: {
    started: () => toast.info('Transcription started', { description: 'AI transcription is now processing.' }),
    complete: () => toast.success('Transcription complete', { description: 'Your transcript is ready for review.' }),
    failed: (reason?: string) => toast.error('Transcription failed', { description: reason || 'Unable to process the audio file.' }),
    processing: () => toast.loading('Processing transcription', { description: 'This may take a few minutes...' }),
  },

  export: {
    started: (format: string) => toast.loading('Export started', { description: `Generating ${format} file...` }),
    complete: (format: string) => toast.success('Export complete', { description: `Your ${format} file is ready for download.` }),
    failed: (format: string) => toast.error('Export failed', { description: `Unable to generate ${format} file.` }),
  },

  upload: {
    started: (fileName: string) => toast.loading('Uploading', { description: `Uploading ${fileName}...` }),
    complete: (fileName: string) => toast.success('Upload complete', { description: `${fileName} has been uploaded successfully.` }),
    failed: (fileName: string) => toast.error('Upload failed', { description: `Failed to upload ${fileName}. Please try again.` }),
    invalid: (message?: string) => toast.error('Invalid file', { description: message || 'Please select a valid file.' }),
  },

  save: {
    success: () => toast.success('Saved', { description: 'Your changes have been saved.' }),
    failed: () => toast.error('Save failed', { description: 'Unable to save your changes. Please try again.' }),
  },

  delete: {
    success: (item: string) => toast.success('Deleted', { description: `${item} has been removed.` }),
    failed: (item: string) => toast.error('Delete failed', { description: `Unable to delete ${item}.` }),
    confirm: (item: string, onConfirm: () => void) => {
      toast('Confirm deletion', {
        description: `Are you sure you want to delete ${item}?`,
        action: {
          label: 'Delete',
          onClick: onConfirm,
        },
        duration: 5000,
      });
    },
  },

  permission: {
    denied: () => toast.error('Permission denied', { description: 'You do not have permission to perform this action.' }),
    required: () => toast.error('Permission required', { description: 'Please contact an administrator for access.' }),
  },

  network: {
    error: () => toast.error('Network error', { description: 'Unable to connect to the server. Please check your connection.' }),
    timeout: () => toast.error('Request timeout', { description: 'The request took too long. Please try again.' }),
  },
};

/**
 * Export toast directly for use in non-component contexts
 */
export { toast };
