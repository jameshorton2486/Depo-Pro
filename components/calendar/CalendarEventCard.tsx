'use client';

import { Video, MapPin, Phone, Users, Globe, AlertCircle, AlertTriangle } from 'lucide-react';
import { CalendarEventUI, LocationType, STATUS_COLORS } from './calendar.types';
import { getEventTypeColor } from '@/lib/calendar/event-types';
import { cn } from '@/lib/utils';

// ============================================
// LOCATION ICON MAPPING
// ============================================

const LocationIcon: Record<LocationType, React.ComponentType<{ className?: string }>> = {
  IN_PERSON: MapPin,
  ZOOM: Video,
  TEAMS: Video,
  WEBEX: Video,
  PHONE: Phone,
  HYBRID: Users,
  OTHER: Globe,
};

// ============================================
// CALENDAR EVENT CARD PROPS
// ============================================

interface CalendarEventCardProps {
  event: CalendarEventUI;
  compact?: boolean;
  onClick?: () => void;
  hasConflict?: boolean;
}

// ============================================
// CALENDAR EVENT CARD COMPONENT
// ============================================

export function CalendarEventCard({ event, compact = false, onClick, hasConflict = false }: CalendarEventCardProps) {
  const Icon = LocationIcon[event.locationType] || Globe;
  const _colors = STATUS_COLORS[event.status];
  const eventTypeColor = getEventTypeColor(event);

  // Compact view (month view)
  if (compact) {
    return (
      <div
        className={cn(
          "truncate text-xs cursor-pointer hover:opacity-80 transition-opacity",
          hasConflict && "border-l-2 border-red-500 pl-1"
        )}
        style={{
          borderLeftColor: hasConflict ? undefined : eventTypeColor,
          borderLeftWidth: hasConflict ? undefined : '2px',
          paddingLeft: hasConflict ? undefined : '4px',
        }}
        onClick={onClick}
        title={`${event.deponentName} - ${event.caseStyle}${hasConflict ? ' (CONFLICT)' : ''}`}
      >
        {hasConflict && (
          <AlertTriangle className="h-3 w-3 text-red-500 inline mr-1" />
        )}
        <span className="font-medium">{event.deponentName}</span>
        {event.assignedReporter && (
          <span className="text-gray-500 ml-1">
            ({event.assignedReporter.firstName.charAt(0)}.{event.assignedReporter.lastName.charAt(0)}.)
          </span>
        )}
      </div>
    );
  }

  // Full view (week/day/timeline view)
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 cursor-pointer hover:opacity-90 transition-opacity p-1 rounded border",
        hasConflict && "border-red-500 border-2 bg-red-50"
      )}
      style={
        !hasConflict
          ? {
              borderColor: eventTypeColor,
              borderWidth: '2px',
            }
          : undefined
      }
      onClick={onClick}
    >
      {/* Conflict Warning */}
      {hasConflict && (
        <div className="flex items-center gap-1 text-[9px] text-red-700 font-medium mb-0.5">
          <AlertTriangle className="h-3 w-3" />
          <span>CONFLICT DETECTED</span>
        </div>
      )}
      
      {/* Deponent Name */}
      <div className="font-medium text-xs truncate">
        {event.deponentName}
      </div>

      {/* Case Style */}
      <div className="text-[10px] text-gray-600 truncate">
        {event.caseStyle}
      </div>

      {/* Bottom row: Location + Reporter */}
      <div className="flex items-center gap-2 mt-0.5">
        {/* Location Type Icon */}
        <div className="flex items-center gap-0.5">
          <Icon className="h-3 w-3 text-gray-500" />
        </div>

        {/* Assigned Reporter */}
        {event.assignedReporter ? (
          <span className="text-[10px] text-gray-500 truncate">
            {event.assignedReporter.firstName} {event.assignedReporter.lastName.charAt(0)}.
          </span>
        ) : (
          <span className="text-[10px] text-orange-600 flex items-center gap-0.5">
            <AlertCircle className="h-3 w-3" />
            Unassigned
          </span>
        )}

        {/* Special Requirements Indicators */}
        {(event.interpreterRequired || event.videographerRequired || event.realtimeRequired) && (
          <div className="flex items-center gap-0.5 ml-auto">
            {event.interpreterRequired && (
              <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded">
                INT
              </span>
            )}
            {event.videographerRequired && (
              <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded">
                VID
              </span>
            )}
            {event.realtimeRequired && (
              <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded">
                RT
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// STANDALONE EVENT CARD (for lists/drawers)
// ============================================

interface EventCardFullProps {
  event: CalendarEventUI;
  onClick?: () => void;
  showActions?: boolean;
}

export function EventCardFull({ event, onClick, showActions: _showActions = false }: EventCardFullProps) {
  const Icon = LocationIcon[event.locationType] || Globe;
  const colors = STATUS_COLORS[event.status];

  return (
    <div
      className={cn(
        'p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow',
        colors.bg,
        colors.border
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{event.deponentName}</h3>
          <p className="text-sm text-gray-600 truncate">{event.caseStyle}</p>
        </div>
        <span
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap',
            colors.bg,
            colors.text
          )}
        >
          {event.status.replace('_', ' ')}
        </span>
      </div>

      {/* Time */}
      <div className="mt-3 flex items-center gap-2 text-sm text-gray-700">
        <span className="font-medium">
          {new Date(event.start).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}
        </span>
        {event.end && (
          <>
            <span>-</span>
            <span>
              {new Date(event.end).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          </>
        )}
      </div>

      {/* Location */}
      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
        <Icon className="h-4 w-4" />
        <span>
          {event.locationType === 'IN_PERSON' && event.locationAddress
            ? event.locationAddress
            : event.locationType.replace('_', ' ')}
        </span>
      </div>

      {/* Reporter */}
      <div className="mt-2 flex items-center gap-2 text-sm">
        {event.assignedReporter ? (
          <span className="text-gray-600">
            <span className="text-gray-500">Reporter:</span>{' '}
            {event.assignedReporter.firstName} {event.assignedReporter.lastName}
          </span>
        ) : (
          <span className="text-orange-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            No reporter assigned
          </span>
        )}
      </div>

      {/* Requirements */}
      {(event.interpreterRequired || event.videographerRequired || event.realtimeRequired) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {event.interpreterRequired && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
              Interpreter: {event.interpreterLanguage || 'Required'}
            </span>
          )}
          {event.videographerRequired && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              Videographer
            </span>
          )}
          {event.realtimeRequired && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              Realtime
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default CalendarEventCard;
