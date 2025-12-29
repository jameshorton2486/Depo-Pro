'use client';

import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface CalendarEmptyStateProps {
  variant: 'no-events' | 'no-results' | 'error';
  dateRange?: { start: Date; end: Date };
  onClearFilters?: () => void;
}

export function CalendarEmptyState({
  variant,
  dateRange,
  onClearFilters,
}: CalendarEmptyStateProps) {
  if (variant === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <CalendarIcon className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Unable to load calendar
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Please try refreshing the page or contact support if the problem persists.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh page
        </button>
      </div>
    );
  }

  if (variant === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <CalendarIcon className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No events match your filters
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Try adjusting your search criteria or clearing filters.
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  // no-events variant
  const dateRangeText = dateRange
    ? format(dateRange.start, 'MMMM yyyy')
    : 'this period';

  return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-4">
      <CalendarIcon className="h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No events scheduled
      </h3>
      <p className="text-sm text-gray-500">
        No events scheduled for {dateRangeText}. Events will appear here when
        depositions and hearings are scheduled.
      </p>
    </div>
  );
}

