'use client';

import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, RefreshCw, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CalendarView } from '@/lib/calendar/types';

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
  onViewChange: (view: CalendarView) => void;
  onFilterClick: () => void;
  isLoading?: boolean;
}

export function CalendarHeader({
  currentDate,
  view,
  onNavigate,
  onViewChange,
  onFilterClick: _onFilterClick,
  isLoading = false,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-white">
      {/* Left: Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onNavigate('today')}>
          Today
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onNavigate('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onNavigate('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold ml-2">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* View Only Badge */}
        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md">
          View Only
        </span>

        {/* Refresh */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => window.location.reload()} 
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>

        {/* View Toggle - Note: CalendarView is 'jobs' | 'availability' | 'assignments', not 'grid' | 'timeline' */}
        <div className="flex border rounded-md">
          <Button
            variant={view === 'jobs' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('jobs')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === 'assignments' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewChange('assignments')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

