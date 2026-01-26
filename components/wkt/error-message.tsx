// WKT error message component

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
        <div className="space-y-3">
          <p className="text-sm">{message}</p>
          {onRetry ? (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Try Again
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
