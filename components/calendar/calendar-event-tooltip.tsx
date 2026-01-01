"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import type { CalendarEventUI } from "./calendar.types";

interface CalendarEventTooltipProps {
  event: CalendarEventUI;
  children: React.ReactNode;
}

export function CalendarEventTooltip({ event, children }: CalendarEventTooltipProps) {
  const startTime = format(new Date(event.start), "MMM d, yyyy 'at' h:mm a");
  const endTime = event.end ? format(new Date(event.end), "h:mm a") : null;
  const duration = event.end 
    ? `${Math.round((new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60))} min`
    : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold text-sm">{event.deponentName || event.title}</p>
            {event.caseStyle && (
              <p className="text-xs text-muted-foreground">{event.caseStyle}</p>
            )}
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Start: {startTime}</p>
              {endTime && <p>End: {endTime}</p>}
              {duration && <p>Duration: {duration}</p>}
            </div>
            {event.locationAddress && (
              <p className="text-xs text-muted-foreground mt-1">
                📍 {event.locationAddress}
              </p>
            )}
            {event.status && (
              <p className="text-xs mt-1">
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                  {event.status}
                </span>
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
