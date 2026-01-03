// ============================================
// useCalendarDrawer Hook
// ============================================

import { useState, useCallback } from 'react';
import { CalendarEventUI, DrawerState } from '@/lib/calendar/types';

interface UseCalendarDrawerReturn {
  drawerState: DrawerState;
  openDrawer: (event: CalendarEventUI) => void;
  closeDrawer: () => void;
  setActiveTab: (tab: DrawerState['activeTab']) => void;
}

export function useCalendarDrawer(): UseCalendarDrawerReturn {
  const [drawerState, setDrawerState] = useState<DrawerState>({
    isOpen: false,
    event: null,
    action: null,
    selectedEvent: null,
    activeTab: 'details',
  });
  
  const openDrawer = useCallback((event: CalendarEventUI) => {
    setDrawerState({
      isOpen: true,
      event,
      action: null,
      selectedEvent: event,
      activeTab: 'details',
    });
  }, []);
  
  const closeDrawer = useCallback(() => {
    setDrawerState(prev => ({
      ...prev,
      isOpen: false,
      // Keep selectedEvent briefly for exit animation
    }));
    
    // Clear event after animation
    setTimeout(() => {
      setDrawerState(prev => ({
        ...prev,
        event: null,
        selectedEvent: null,
      }));
    }, 300);
  }, []);
  
  const setActiveTab = useCallback((tab: string | undefined) => {
    setDrawerState((prev: DrawerState) => ({
      ...prev,
      activeTab: tab,
    }));
  }, []);
  
  return {
    drawerState,
    openDrawer,
    closeDrawer,
    setActiveTab,
  };
}

