// =============================================================================
// SESSION ROTATION
// =============================================================================
// Invalidates all sessions for a user except the current one.
// Call after: password change, role change, email change, account suspension.
// =============================================================================

import { createAdminClient } from '@/lib/supabase/admin';

export async function rotateUserSessions(
  userId: string,
  reason: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.auth.admin.signOut(userId, 'others');

  if (error) {
    // Log but do not throw — rotation failure should not block the primary
    // operation (e.g., the password change itself must still succeed).
    console.error(
      `[session-rotation] Failed to rotate sessions for user ${userId} after ${reason}:`,
      error.message,
    );
  } else {
    console.info(
      `[session-rotation] Sessions rotated for user ${userId} after ${reason}`,
    );
  }
}
