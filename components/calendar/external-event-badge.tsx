// ============================================================
// EXTERNAL CALENDAR BADGE COMPONENT
// File: components/calendar/external-event-badge.tsx
// ============================================================
// Visual indicator for external calendar events
// ============================================================

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Calendar, CloudOff, AlertTriangle } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface ExternalEventBadgeProps {
  provider: 'GOOGLE' | 'OUTLOOK' | 'APPLE';
  hasConflict?: boolean;
  isBlocking?: boolean;
  calendarName?: string;
  className?: string;
}

interface ExternalEventOverlayProps {
  provider: 'GOOGLE' | 'OUTLOOK' | 'APPLE';
  title: string;
  startTime: Date;
  endTime: Date;
  hasConflict?: boolean;
  isBlocking?: boolean;
  calendarName?: string;
  onMarkNonBlocking?: () => void;
  onHide?: () => void;
}

// ============================================================
// PROVIDER COLORS & ICONS
// ============================================================

const PROVIDER_STYLES = {
  GOOGLE: {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    stripedBg: 'bg-gradient-to-r from-blue-50 via-white to-blue-50',
    icon: '📅',
    name: 'Google Calendar',
  },
  OUTLOOK: {
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    stripedBg: 'bg-gradient-to-r from-purple-50 via-white to-purple-50',
    icon: '📆',
    name: 'Outlook',
  },
  APPLE: {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    stripedBg: 'bg-gradient-to-r from-gray-50 via-white to-gray-50',
    icon: '🍎',
    name: 'Apple Calendar',
  },
};

// ============================================================
// EXTERNAL EVENT BADGE
// ============================================================

export function ExternalEventBadge({
  provider,
  hasConflict,
  isBlocking,
  calendarName,
  className,
}: ExternalEventBadgeProps) {
  const styles = PROVIDER_STYLES[provider];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-normal gap-1',
              styles.color,
              hasConflict && 'border-yellow-400 bg-yellow-50',
              className
            )}
          >
            <span>{styles.icon}</span>
            <span className="hidden sm:inline">External</span>
            {hasConflict && <AlertTriangle className="h-3 w-3 text-yellow-600" />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{styles.name}</p>
            {calendarName && <p className="text-muted-foreground">{calendarName}</p>}
            {isBlocking && <p className="text-yellow-600">Blocks availability</p>}
            {hasConflict && <p className="text-yellow-600">Conflicts with internal event</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================
// EXTERNAL EVENT OVERLAY (for calendar view)
// ============================================================

export function ExternalEventOverlay({
  provider,
  title,
  startTime,
  endTime,
  hasConflict,
  isBlocking,
  calendarName,
  onMarkNonBlocking,
  onHide,
}: ExternalEventOverlayProps) {
  const styles = PROVIDER_STYLES[provider];
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div
      className={cn(
        'relative p-2 rounded-md border text-sm',
        'bg-opacity-60',
        styles.stripedBg,
        'border-dashed border-gray-300',
        hasConflict && 'border-yellow-400 bg-yellow-50',
        // Striped pattern for external events
        'bg-[length:10px_10px]',
        'bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.03)_25%,rgba(0,0,0,0.03)_50%,transparent_50%,transparent_75%,rgba(0,0,0,0.03)_75%)]'
      )}
    >
      {/* Provider indicator */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-lg">{styles.icon}</span>
        <ExternalEventBadge
          provider={provider}
          hasConflict={hasConflict}
          isBlocking={isBlocking}
        />
      </div>
      
      {/* Title */}
      <div className="font-medium text-gray-700 truncate">{title}</div>
      
      {/* Time */}
      <div className="text-xs text-gray-500">
        {formatTime(startTime)} - {formatTime(endTime)}
      </div>
      
      {/* Calendar name */}
      {calendarName && (
        <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {calendarName}
        </div>
      )}
      
      {/* Conflict warning */}
      {hasConflict && (
        <div className="mt-2 p-1 bg-yellow-100 rounded text-xs text-yellow-700 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Conflicts with internal event
        </div>
      )}
      
      {/* Actions */}
      {(onMarkNonBlocking || onHide) && (
        <div className="mt-2 flex gap-2 text-xs">
          {isBlocking && onMarkNonBlocking && (
            <button
              onClick={onMarkNonBlocking}
              className="text-blue-600 hover:underline"
            >
              Mark as non-blocking
            </button>
          )}
          {onHide && (
            <button
              onClick={onHide}
              className="text-gray-500 hover:underline"
            >
              Hide
            </button>
          )}
        </div>
      )}
      
      {/* Read-only indicator */}
      <div className="absolute top-1 right-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <CloudOff className="h-3 w-3 text-gray-400" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">External event (read-only)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

// ============================================================
// SYNC STATUS INDICATOR
// ============================================================

interface SyncStatusProps {
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  lastSyncAt?: Date;
  error?: string;
}

export function SyncStatusIndicator({ status, lastSyncAt, error }: SyncStatusProps) {
  const statusConfig = {
    PENDING: { color: 'text-gray-500', icon: '⏳', label: 'Pending' },
    SYNCING: { color: 'text-blue-500', icon: '🔄', label: 'Syncing...' },
    SYNCED: { color: 'text-green-500', icon: '✓', label: 'Synced' },
    FAILED: { color: 'text-red-500', icon: '✗', label: 'Failed' },
    CONFLICT: { color: 'text-yellow-500', icon: '⚠', label: 'Conflict' },
  };
  
  const config = statusConfig[status];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1 text-sm', config.color)}>
            <span>{config.icon}</span>
            <span>{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            {lastSyncAt && (
              <p>Last sync: {lastSyncAt.toLocaleString()}</p>
            )}
            {error && (
              <p className="text-red-500">{error}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================
// EXTERNAL CALENDAR CONNECTION CARD
// ============================================================

interface ConnectionCardProps {
  id: string;
  provider: 'GOOGLE' | 'OUTLOOK' | 'APPLE';
  calendarName: string;
  calendarColor?: string;
  syncEnabled: boolean;
  syncMode: string;
  lastSyncAt?: Date;
  lastSyncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
  lastSyncError?: string;
  onToggleSync?: (enabled: boolean) => void;
  onDisconnect?: () => void;
  onSync?: () => void;
}

export function ExternalCalendarConnectionCard({
  provider,
  calendarName,
  calendarColor,
  syncEnabled,
  syncMode,
  lastSyncAt,
  lastSyncStatus,
  lastSyncError,
  onToggleSync,
  onDisconnect,
  onSync,
}: ConnectionCardProps) {
  const styles = PROVIDER_STYLES[provider];
  
  return (
    <div className={cn(
      'p-4 rounded-lg border',
      !syncEnabled && 'opacity-60'
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Provider icon */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-2xl"
            style={{ backgroundColor: calendarColor || '#e5e7eb' }}
          >
            {styles.icon}
          </div>
          
          {/* Info */}
          <div>
            <h4 className="font-medium">{calendarName}</h4>
            <p className="text-sm text-muted-foreground">{styles.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {syncMode.replace('_', ' ')}
              </Badge>
              <SyncStatusIndicator
                status={lastSyncStatus}
                lastSyncAt={lastSyncAt}
                error={lastSyncError}
              />
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {onSync && (
            <button
              onClick={onSync}
              className="p-2 hover:bg-gray-100 rounded"
              title="Sync now"
            >
              🔄
            </button>
          )}
          {onToggleSync && (
            <button
              onClick={() => onToggleSync(!syncEnabled)}
              className={cn(
                'px-3 py-1 rounded text-sm',
                syncEnabled
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              )}
            >
              {syncEnabled ? 'Enabled' : 'Disabled'}
            </button>
          )}
          {onDisconnect && (
            <button
              onClick={onDisconnect}
              className="p-2 hover:bg-red-50 text-red-600 rounded"
              title="Disconnect"
            >
              ✗
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
