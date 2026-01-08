'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { getUserMessage, isRetryableError } from '@/lib/errors/user-messages';

interface UseAsyncActionOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

export function useAsyncAction<T extends (...args: unknown[]) => Promise<unknown>>(
  action: T,
  options: UseAsyncActionOptions = {}
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: Parameters<T>) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await action(...args);
        
        if (options.successMessage) {
          toast.success(options.successMessage);
        }
        
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);

        // Extract error code from API response
        const errorCode = (err as { code?: string })?.code || 'UNKNOWN_ERROR';
        const message = options.errorMessage || getUserMessage(errorCode);
        
        if (isRetryableError(errorCode)) {
          toast.error(message, {
            action: {
              label: 'Retry',
              onClick: () => execute(...args),
            },
          });
        } else {
          toast.error(message);
        }

        options.onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [action, options]
  );

  return { execute, isLoading, error };
}
