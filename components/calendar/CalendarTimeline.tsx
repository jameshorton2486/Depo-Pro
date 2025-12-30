'use client';

import { CalendarEventUI } from './calendar.types';
import { CalendarEventCard } from './CalendarEventCard';

// ============================================
// CALENDAR TIMELINE PROPS
// ============================================

interface CalendarTimelineProps {
  events: CalendarEventUI[];
  role?: string; // Reserved for future role-based filtering
  onEventClick?: (event: CalendarEventUI) => void;
}

// ============================================
// CALENDAR TIMELINE COMPONENT
// CSS Grid-based vertical timeline view
// ============================================

export function CalendarTimeline({ events, role: _role, onEventClick }: CalendarTimelineProps) {
  // Generate 12 hours of the day for the axis (8 AM to 8 PM)
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);

  // Get current time for "NOW" indicator
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const nowOffset = ((currentHour - 8) * 60 + currentMinutes) / (12 * 60) * 100;

  return (
    <div className="relative flex leading-none border rounded-lg bg-background overflow-hidden h-[800px]">
      {/* Time Axis */}
      <div className="flex flex-col border-r bg-muted/20 w-20 shrink-0">
        {hours.map((hour) => (
          <div 
            key={hour} 
            className="flex-1 border-b p-2 text-[10px] font-medium text-muted-foreground flex items-center"
          >
            {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
          </div>
        ))}
      </div>

      {/* Events Track */}
      <div className="relative flex-1 bg-grid-slate-100/[0.03] overflow-y-auto">
        {events.map((event) => {
          // Use start Date (already a Date object from CalendarEventUI)
          const start = event.start;
          const hour = start.getHours();
          const minutes = start.getMinutes();
          
          // Calculate vertical offset percentage (8 AM = 0%, 8 PM = 100%)
          const topOffset = ((hour - 8) * 60 + minutes) / (12 * 60) * 100;
          
          // Calculate height based on duration
          const durationMs = event.end.getTime() - event.start.getTime();
          const durationHours = durationMs / (1000 * 60 * 60);
          const heightPercent = (durationHours / 12) * 100;

          return (
            <div 
              key={event.id}
              className="absolute left-4 right-4 transition-all hover:z-10"
              style={{ 
                top: `${Math.max(0, topOffset)}%`, 
                minHeight: `${Math.max(4, heightPercent)}%`,
                maxHeight: '50%',
              }}
            >
              <CalendarEventCard 
                event={event} 
                compact={false}
                onClick={() => onEventClick?.(event)}
              />
            </div>
          );
        })}

        {/* Current Time Indicator */}
        {nowOffset >= 0 && nowOffset <= 100 && (
          <div 
            className="absolute left-0 right-0 border-t-2 border-red-400 z-20 pointer-events-none opacity-50"
            style={{ top: `${nowOffset}%` }}
          >
            <span className="bg-red-400 text-white text-[8px] px-1 rounded-sm absolute -top-2 left-0">
              NOW
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

