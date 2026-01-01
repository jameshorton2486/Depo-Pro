"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarViewControlsProps {
  calendarRef: React.RefObject<any>; // FullCalendar ref
  currentView: string;
  onViewChange?: (view: string) => void;
  showPast?: boolean;
  onShowPastChange?: (show: boolean) => void;
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
}

export function CalendarViewControls({
  calendarRef,
  currentView,
  onViewChange,
  showPast = false,
  onShowPastChange,
  currentDate: _currentDate,
  onDateChange,
}: CalendarViewControlsProps) {
  const handleViewChange = (view: string) => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.changeView(view);
      onViewChange?.(view);
    }
  };

  const handleToday = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.today();
      onDateChange?.(new Date());
    }
  };

  const handlePrev = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.prev();
      const newDate = calendarApi.getDate();
      onDateChange?.(newDate);
    }
  };

  const handleNext = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.next();
      const newDate = calendarApi.getDate();
      onDateChange?.(newDate);
    }
  };

  const handleThisWeek = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const today = new Date();
      calendarApi.changeView("timeGridWeek", today);
      onViewChange?.("timeGridWeek");
      onDateChange?.(today);
    }
  };

  const handleNextWeek = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      calendarApi.changeView("timeGridWeek", nextWeek);
      onViewChange?.("timeGridWeek");
      onDateChange?.(nextWeek);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-card border-b border-border">
      {/* View Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={currentView === "timeGridWeek" ? "default" : "outline"}
          size="sm"
          onClick={handleThisWeek}
          className="text-xs"
        >
          This Week
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextWeek}
          className="text-xs"
        >
          Next Week
        </Button>
        <Button
          variant={currentView === "dayGridMonth" ? "default" : "outline"}
          size="sm"
          onClick={() => handleViewChange("dayGridMonth")}
          className="text-xs"
        >
          Month
        </Button>
        <Button
          variant={currentView === "timeGridDay" ? "default" : "outline"}
          size="sm"
          onClick={() => handleViewChange("timeGridDay")}
          className="text-xs"
        >
          Day
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleToday}
          className="text-xs"
        >
          Today
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Past Depositions Toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="show-past"
          checked={showPast}
          onCheckedChange={onShowPastChange}
        />
        <Label
          htmlFor="show-past"
          className="text-sm text-muted-foreground cursor-pointer"
        >
          Show Past Depositions
        </Label>
      </div>
    </div>
  );
}
