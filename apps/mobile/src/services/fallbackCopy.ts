import type { AnalysisOutcome } from '../types/scan';

const REASONS: Record<NonNullable<AnalysisOutcome['fallbackReason']>, string> = {
  missing_api_url: 'No API URL is configured.',
  network: 'The network or analysis service could not be reached.',
  timeout: 'The analysis service took too long to respond.',
  invalid_response: 'The analysis service returned data that did not match the contract.',
  server: 'The analysis service reported an error.',
};

export function fallbackExplanation(outcome: AnalysisOutcome): string | null {
  if (outcome.source !== 'demo' || !outcome.fallbackReason) return null;
  return `${REASONS[outcome.fallbackReason]} Showing a clearly marked demo result so you can continue.`;
}
