/**
 * Anthropic model configuration
 *
 * Centralized model names for consistency and cost control.
 * Update these when upgrading or changing models.
 *
 * - HAIKU: Fast, cheap — use for health checks, connection tests, lightweight validation
 * - SONNET: Balanced quality/cost — use for document extraction, corrections, medical extraction
 */

export const ANTHROPIC_MODELS = {
  /** Fast, low-cost. Health checks, connection tests, minimal-token validation. */
  HAIKU: 'claude-3-haiku-20240307',

  /** Balanced quality/cost. Document intake, transcript corrections, medical extraction. */
  SONNET: 'claude-3-sonnet-20240229',
} as const;

export type AnthropicModelId = (typeof ANTHROPIC_MODELS)[keyof typeof ANTHROPIC_MODELS];
