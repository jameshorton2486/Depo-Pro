// ============================================================
// REPORTER AVAILABILITY MANAGER
// Path: components/calendar/availability-manager.tsx
// Task 2.3.1 - Reporter Availability Management UI
// ============================================================

'use client';

import { useState, useCallback, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

interface AvailabilitySlot {
  id: string;
  start: string;
  end: string;
  type: 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE';
  notes?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
}

// ------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DEFAULT_WORK_HOURS: TimeSlot = {
  startTime: '08:00',
  endTime: '17:00',
};

const AVAILABILITY_TYPES = [
  { value: 'AVAILABLE', label: 'Available', color: 'bg-green-500', icon: CheckCircle },
  { value: 'UNAVAILABLE', label: 'Unavailable', color: 'bg-red-500', icon: XCircle },
  { value: 'TENTATIVE', label: 'Tentative', color: 'bg-yellow-500', icon: AlertCircle },
];

// ------------------------------------------------------------
// MAIN COMPONENT
// ------------------------------------------------------------

export function AvailabilityManager() {
  // const { data: session } = useSession();

  // State
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    date: '',
    startTime: '08:00',
    endTime: '17:00',
    type: 'AVAILABLE' as 'AVAILABLE' | 'UNAVAILABLE' | 'TENTATIVE',
    notes: '',
    isRecurring: false,
    recurrenceWeeks: 4,
  });

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });

  // ------------------------------------------------------------
  // DATA FETCHING
  // ------------------------------------------------------------

  const fetchAvailability = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        start: weekStart.toISOString(),
        end: weekEnd.toISOString(),
      });

      const response = await fetch(`/api/calendar/availability?${params}`);

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setSlots(data.availability || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Failed to load availability');
    } finally {
      setIsLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // ------------------------------------------------------------
  // ACTIONS
  // ------------------------------------------------------------

  const handleCreateSlot = async () => {
    try {
      const startDateTime = `${formData.date}T${formData.startTime}:00`;
      const endDateTime = `${formData.date}T${formData.endTime}:00`;

      const payload: any = {
        startTime: new Date(startDateTime).toISOString(),
        endTime: new Date(endDateTime).toISOString(),
        type: formData.type,
        notes: formData.notes || undefined,
        isRecurring: formData.isRecurring,
      };

      if (formData.isRecurring) {
        // Create RRULE for weekly recurrence
        const dayIndex = new Date(formData.date).getDay();
        const dayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
        payload.recurrenceRule = `FREQ=WEEKLY;BYDAY=${dayNames[dayIndex]}`;

        // Set end date based on weeks
        const endDate = addWeeks(new Date(formData.date), formData.recurrenceWeeks);
        payload.recurrenceEnd = endDate.toISOString();
      }

      const response = await fetch('/api/calendar/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          toast.error('Overlapping slot exists');
          return;
        }
        throw new Error(data.error || 'Failed to create');
      }

      toast.success('Availability saved');
      setIsCreateOpen(false);
      resetForm();
      fetchAvailability();
    } catch (error: any) {
      console.error('Error creating slot:', error);
      toast.error(error.message || 'Failed to save availability');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      const response = await fetch(`/api/calendar/availability/${slotId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('Availability deleted');
      fetchAvailability();
    } catch (error) {
      console.error('Error deleting slot:', error);
      toast.error('Failed to delete');
    }
  };

  const handleQuickAdd = async (day: Date, type: 'AVAILABLE' | 'UNAVAILABLE') => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const startDateTime = `${dateStr}T${DEFAULT_WORK_HOURS.startTime}:00`;
    const endDateTime = `${dateStr}T${DEFAULT_WORK_HOURS.endTime}:00`;

    try {
      const response = await fetch('/api/calendar/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: new Date(startDateTime).toISOString(),
          endTime: new Date(endDateTime).toISOString(),
          type,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          toast.error('Slot already exists for this day');
          return;
        }
        throw new Error(data.error);
      }

      toast.success(`Marked ${type.toLowerCase()}`);
      fetchAvailability();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save');
    }
  };

  const handleCopyWeek = async () => {
    try {
      // Copy current week's pattern to next week
      const nextWeekStart = addWeeks(weekStart, 1);

      for (const slot of slots) {
        const originalStart = new Date(slot.start);
        const originalEnd = new Date(slot.end);

        // Calculate the day offset
        const dayOffset = originalStart.getDay();

        const newStart = new Date(nextWeekStart);
        newStart.setDate(newStart.getDate() + dayOffset);
        newStart.setHours(originalStart.getHours(), originalStart.getMinutes());

        const newEnd = new Date(nextWeekStart);
        newEnd.setDate(newEnd.getDate() + dayOffset);
        newEnd.setHours(originalEnd.getHours(), originalEnd.getMinutes());

        await fetch('/api/calendar/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startTime: newStart.toISOString(),
            endTime: newEnd.toISOString(),
            type: slot.type,
            notes: slot.notes,
          }),
        });
      }

      toast.success('Week copied to next week');
      setCurrentWeek(addWeeks(currentWeek, 1));
    } catch (error) {
      console.error('Error copying week:', error);
      toast.error('Failed to copy week');
    }
  };

  const resetForm = () => {
    setFormData({
      date: '',
      startTime: '08:00',
      endTime: '17:00',
      type: 'AVAILABLE',
      notes: '',
      isRecurring: false,
      recurrenceWeeks: 4,
    });
    setSelectedDay(null);
  };

  const openCreateForDay = (day: Date) => {
    setSelectedDay(day);
    setFormData(prev => ({
      ...prev,
      date: format(day, 'yyyy-MM-dd'),
    }));
    setIsCreateOpen(true);
  };

  // ------------------------------------------------------------
  // HELPERS
  // ------------------------------------------------------------

  const getSlotsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return slots.filter(slot => {
      const slotDate = format(new Date(slot.start), 'yyyy-MM-dd');
      return slotDate === dayStr;
    });
  };

  const getDayClasses = (day: Date) => {
    const daySlots = getSlotsForDay(day);
    if (daySlots.length === 0) return 'bg-gray-50';

    const hasAvailable = daySlots.some(s => s.type === 'AVAILABLE');
    const hasUnavailable = daySlots.some(s => s.type === 'UNAVAILABLE');

    if (hasUnavailable && !hasAvailable) return 'bg-red-50';
    if (hasAvailable && !hasUnavailable) return 'bg-green-50';
    return 'bg-yellow-50'; // Mixed
  };

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Availability</h2>
          <p className="text-muted-foreground">
            Set your available hours for scheduling
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCopyWeek}>
            <Copy className="w-4 h-4 mr-2" />
            Copy to Next Week
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Availability
          </Button>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <CardTitle className="text-center">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </CardTitle>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Day Headers */}
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground pb-2">
                  {day.slice(0, 3)}
                </div>
              ))}

              {/* Day Cells */}
              {Array.from({ length: 7 }, (_, i) => {
                const day = new Date(weekStart);
                day.setDate(day.getDate() + i);
                const daySlots = getSlotsForDay(day);
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                return (
                  <div
                    key={i}
                    className={`
                      min-h-[120px] rounded-lg border p-2
                      ${getDayClasses(day)}
                      ${isToday ? 'ring-2 ring-blue-500' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}>
                        {format(day, 'd')}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => openCreateForDay(day)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Slots for this day */}
                    <div className="space-y-1">
                      {daySlots.map(slot => {
                        const typeConfig = AVAILABILITY_TYPES.find(t => t.value === slot.type);
                        const Icon = typeConfig?.icon || CheckCircle;

                        return (
                          <div
                            key={slot.id}
                            className={`
                              text-xs p-1 rounded flex items-center justify-between
                              ${typeConfig?.color} text-white
                            `}
                          >
                            <div className="flex items-center gap-1 truncate">
                              <Icon className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">
                                {format(new Date(slot.start), 'h:mm a')}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSlot(slot.id);
                              }}
                              className="hover:bg-white/20 rounded p-0.5"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}

                      {/* Quick add buttons if no slots */}
                      {daySlots.length === 0 && (
                        <div className="flex gap-1 mt-2">
                          <button
                            onClick={() => handleQuickAdd(day, 'AVAILABLE')}
                            className="flex-1 text-xs py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleQuickAdd(day, 'UNAVAILABLE')}
                            className="flex-1 text-xs py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded"
                          >
                            ✗
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">Legend:</span>
        {AVAILABILITY_TYPES.map(type => (
          <div key={type.value} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${type.color}`} />
            <span>{type.label}</span>
          </div>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDay
                ? `Set Availability for ${format(selectedDay, 'EEEE, MMMM d')}`
                : 'Add Availability'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Date */}
            {!selectedDay && (
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
            )}

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Availability Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v: any) => setFormData(prev => ({ ...prev, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABILITY_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded ${type.color}`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recurring */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Repeat Weekly</Label>
                <p className="text-sm text-muted-foreground">
                  Apply this schedule every week
                </p>
              </div>
              <Switch
                checked={formData.isRecurring}
                onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, isRecurring: checked }))}
              />
            </div>

            {formData.isRecurring && (
              <div className="space-y-2">
                <Label>Repeat for (weeks)</Label>
                <Select
                  value={formData.recurrenceWeeks.toString()}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, recurrenceWeeks: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 4, 8, 12, 26, 52].map(weeks => (
                      <SelectItem key={weeks} value={weeks.toString()}>
                        {weeks} weeks
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="e.g., Morning availability only, prefer virtual..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateSlot} disabled={!formData.date}>
              Save Availability
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
