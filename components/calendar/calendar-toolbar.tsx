'use client';

import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, RefreshCw, LayoutGrid, List, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
// Local props interface for this component
interface CalendarToolbarProps {
  view: 'month' | 'week' | 'agenda';
  onViewChange: (view: 'month' | 'week' | 'agenda') => void;
  currentDate: Date;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function CalendarToolbar({
  view,
  onViewChange,
  currentDate,
  onToday,
  onPrevious,
  onNext,
  onRefresh,
  isLoading,
}: CalendarToolbarProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-white">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
        <Button variant="ghost" size="icon" onClick={onPrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold ml-2">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        
        <div className="flex border rounded-md">
          <Button
            variant={view === 'month' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('month')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'week' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('week')}
          >
            <Calendar className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'agenda' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('agenda')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

