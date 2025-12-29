// =============================================================================
// JOB HANDLERS REGISTRY
// =============================================================================
// Import all handlers to register them with the queue
// =============================================================================

// Import handlers (they self-register on import)
import './transcription';
import './notification';

export * from './transcription';
export * from './notification';

