// Conflict resolution is now handled by ConflictResolutionModal.
// This file is kept as a re-export shim to avoid breaking any imports
// that may reference it, but it delegates to the new modal system.
//
// New code should import from "../conflict/ConflictResolutionModal" directly.

export { ConflictResolutionModal as ConflictResolver } from "../conflict/ConflictResolutionModal";
