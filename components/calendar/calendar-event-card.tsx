'use client';

import { format } from 'date-fns';
import { CalendarEventUI } from '@/lib/calendar/types';
import { formatEventTime } from '@/lib/calendar/utils';
import { EVENT_TYPE_COLORS, EVENT_STATUS_INDICATORS } from '@/lib/calendar/constants';

interface CalendarEventCardProps {
  event: CalendarEventUI;
  variant: 'compact' | 'full';
  onClick: () => void;
}

export function CalendarEventCard({ event, variant, onClick }: CalendarEventCardProps) {
  const typeColors = EVENT_TYPE_COLORS[event.eventType] || EVENT_TYPE_COLORS.OTHER;
  const statusIndicator = EVENT_STATUS_INDICATORS[event.status] || EVENT_STATUS_INDICATORS.SCHEDULED;

  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className={`px-1 py-0.5 text-xs rounded truncate cursor-pointer border ${typeColors} hover:opacity-80 transition-opacity`}
        title={event.title}
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ backgroundColor: statusIndicator }} />
        {format(event.start, 'h:mm a')} {event.title}
      </div>
    );
  }

  // Full variant
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${typeColors}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: statusIndicator }} />
            <h4 className="font-medium text-gray-900 truncate">{event.title}</h4>
          </div>
          {event.caseName && (
            <p className="text-sm text-gray-600 truncate">{event.caseName}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-gray-600">
        <div>{formatEventTime(event.start, event.end)}</div>
        {event.location && (
          <div>{event.isRemote ? 'Remote' : event.location}</div>
        )}
      </div>
    </div>
  );
}
