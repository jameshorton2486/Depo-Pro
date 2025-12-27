'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Clock, MapPin, UserX, CheckCircle } from 'lucide-react';
import { ConflictType } from '@/lib/enums';

export interface Conflict {
  type: ConflictType | string;
  conflictEventId: string;
  conflictingEventId?: string; // Alias
  conflictEventTitle: string;
  conflictingEventTitle?: string; // Alias
  overlapMinutes: number;
  severity: 'low' | 'medium' | 'high' | 'WARNING' | 'ERROR';
  message: string;
}

export interface AlternativeTimeSlot {
  startTime: string;
  endTime: string;
  availabilityScore: number;
}

interface ConflictDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: Conflict[];
  alternativeSlots?: AlternativeTimeSlot[];
  onOverride: (reason: string) => void;
  onSelectAlternative: (slot: AlternativeTimeSlot) => void;
  onCancel: () => void;
}

const CONFLICT_TYPE_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  REPORTER_DOUBLE_BOOKED: {
    icon: UserX,
    label: 'Reporter Double-Booked',
    color: 'bg-red-100 text-red-800 border-red-300',
  },
  LOCATION_CONFLICT: {
    icon: MapPin,
    label: 'Location Conflict',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  TRAVEL_TIME_INSUFFICIENT: {
    icon: Clock,
    label: 'Insufficient Travel Time',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  RESOURCE_UNAVAILABLE: {
    icon: AlertTriangle,
    label: 'Resource Unavailable',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
  },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-yellow-100 text-yellow-800' },
  medium: { label: 'Medium', color: 'bg-orange-100 text-orange-800' },
  high: { label: 'High', color: 'bg-red-100 text-red-800' },
};

export function ConflictDialog({
  isOpen,
  onClose,
  conflicts,
  alternativeSlots = [],
  onOverride,
  onSelectAlternative,
  onCancel,
}: ConflictDialogProps) {
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideInput, setShowOverrideInput] = useState(false);

  const handleOverride = () => {
    if (!overrideReason.trim()) {
      return;
    }
    onOverride(overrideReason);
    setOverrideReason('');
    setShowOverrideInput(false);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getConflictIcon = (type: string) => {
    const config = CONFLICT_TYPE_CONFIG[type] || CONFLICT_TYPE_CONFIG.RESOURCE_UNAVAILABLE;
    const Icon = config.icon;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Scheduling Conflicts Detected
          </AlertDialogTitle>
          <AlertDialogDescription>
            {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} detected. Please resolve before proceeding.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Conflicts List */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Conflicts:</h3>
            {conflicts.map((conflict, index) => {
              const typeConfig = CONFLICT_TYPE_CONFIG[conflict.type] || CONFLICT_TYPE_CONFIG.RESOURCE_UNAVAILABLE;
              // Handle both old and new severity formats
              const severity = conflict.severity === 'ERROR' || conflict.severity === 'high' ? 'high' 
                : conflict.severity === 'WARNING' || conflict.severity === 'medium' ? 'medium' 
                : 'low';
              const severityConfig = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.medium;
              
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 border rounded-lg bg-muted/50"
                >
                  <div className={`p-2 rounded ${typeConfig.color}`}>
                    {getConflictIcon(conflict.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{typeConfig.label}</span>
                      <Badge variant="outline" className={`text-xs ${severityConfig.color}`}>
                        {severityConfig.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{conflict.message}</p>
                    <p className="text-xs text-muted-foreground">
                      Overlap: {conflict.overlapMinutes} minutes
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Alternative Time Slots */}
          {alternativeSlots.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold">Alternative Time Slots:</h3>
              <div className="space-y-2">
                {alternativeSlots.map((slot, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3"
                    onClick={() => onSelectAlternative(slot)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium">
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Availability: {slot.availabilityScore}%
                        </div>
                      </div>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Override Section */}
          {!showOverrideInput ? (
            <div className="border-t pt-4">
              <Button
                variant="destructive"
                onClick={() => setShowOverrideInput(true)}
                className="w-full"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Override Conflicts
              </Button>
            </div>
          ) : (
            <div className="space-y-3 border-t pt-4">
              <div>
                <Label htmlFor="override-reason" className="text-sm font-semibold">
                  Override Reason (Required)
                </Label>
                <Textarea
                  id="override-reason"
                  placeholder="Explain why you're overriding these conflicts..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="mt-2 min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This action will be logged for audit purposes.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleOverride}
                  disabled={!overrideReason.trim()}
                  className="flex-1"
                >
                  Confirm Override
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowOverrideInput(false);
                    setOverrideReason('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          {alternativeSlots.length === 0 && !showOverrideInput && (
            <AlertDialogAction onClick={onClose} disabled>
              Resolve Conflicts First
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

