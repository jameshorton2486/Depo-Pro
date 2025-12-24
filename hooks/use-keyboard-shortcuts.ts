/**
 * Keyboard Shortcuts Hook
 *
 * Reusable hook for managing keyboard shortcuts throughout the app.
 * Prevents conflicts by checking if user is typing in input fields.
 */

import { useEffect } from 'react';

export interface ShortcutConfig {
  /** Key to press (e.g., 'Space', 'Enter', 'n', 'N') */
  key: string;

  /** Require Ctrl key */
  ctrl?: boolean;

  /** Require Shift key */
  shift?: boolean;

  /** Require Alt key */
  alt?: boolean;

  /** Require Meta/Command key */
  meta?: boolean;

  /** Action to execute when shortcut is pressed */
  action: () => void;

  /** Description for help/accessibility */
  description: string;

  /** Disable shortcut (e.g., when modal is open) */
  disabled?: boolean;
}

/**
 * Hook for managing keyboard shortcuts
 *
 * @param shortcuts Array of shortcut configurations
 * @param enabled Whether shortcuts are enabled (default: true)
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  enabled: boolean = true,
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field
      const target = e.target as HTMLElement;
      const isInputField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable;

      // Allow shortcuts in input fields only if explicitly enabled
      // (e.g., Enter to submit, Escape to cancel)
      if (isInputField && !shortcuts.some(s => s.key === e.key && (s.key === 'Enter' || s.key === 'Escape'))) {
        return;
      }

      // Match shortcuts
      for (const shortcut of shortcuts) {
        if (shortcut.disabled) continue;

        // Check modifiers
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const metaMatch = shortcut.meta ? e.metaKey : !e.metaKey;

        // Check key (case-insensitive for letter keys)
        const keyMatch =
          shortcut.key.toLowerCase() === e.key.toLowerCase() ||
          shortcut.key === e.key;

        if (ctrlMatch && shiftMatch && altMatch && metaMatch && keyMatch) {
          e.preventDefault();
          e.stopPropagation();
          shortcut.action();
          return; // Only execute first matching shortcut
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

/**
 * Common shortcut configurations for review interface
 */
export const REVIEW_SHORTCUTS = {
  PLAY_PAUSE: {
    key: ' ',
    description: 'Play/Pause audio',
  },
  SAVE: {
    key: 's',
    ctrl: true,
    description: 'Save progress',
  },
  NEXT_FLAGGED: {
    key: 'n',
    description: 'Next flagged segment',
  },
  PREV_FLAGGED: {
    key: 'p',
    description: 'Previous flagged segment',
  },
  MARK_REVIEWED: {
    key: 'Enter',
    description: 'Mark current segment as reviewed',
  },
  SEEK_BACK: {
    key: 'ArrowLeft',
    description: 'Seek back 5 seconds',
  },
  SEEK_FORWARD: {
    key: 'ArrowRight',
    description: 'Seek forward 5 seconds',
  },
  SPEED_DOWN: {
    key: '[',
    description: 'Decrease playback speed',
  },
  SPEED_UP: {
    key: ']',
    description: 'Increase playback speed',
  },
} as const;

