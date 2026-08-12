/**
 * Replaces the old telemetry consent prompt. torch no longer collects usage
 * data of any kind, so instead of asking for events we point at the place
 * where a human can actually answer.
 */
export function generateFeedbackLink(): string {
  return `torch collects nothing and phones home to nothing. If something is broken or missing, say so: https://github.com/h3cz/torch/issues`;
}
