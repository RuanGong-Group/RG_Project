
import { safeJsonParse } from './datetime';

export interface Pronunciation {
  uk: string;
  us: string;
}

/**
 * Normalize pronunciation data from database to standard { uk, us } format.
 * Handles:
 * 1. JSON string: "{\"uk\":\"...\",\"us\":\"...\"}"
 * 2. JSON object with uk/us: { uk: "...", us: "..." }
 * 3. JSON object with ipa only: { ipa: "..." } -> maps to both uk and us
 * 4. Null/Undefined -> { uk: "", us: "" }
 */
export const normalizePronunciation = (p: any): Pronunciation => {
  if (!p) return { uk: '', us: '' };

  let parsed = p;
  if (typeof p === 'string') {
    parsed = safeJsonParse(p, {});
  }

  // Case 1 & 2: Has uk or us
  if (parsed.uk || parsed.us) {
    return {
      uk: parsed.uk || '',
      us: parsed.us || ''
    };
  }

  // Case 3: Has ipa only (common in some datasets)
  if (parsed.ipa) {
    return {
      uk: parsed.ipa,
      us: parsed.ipa
    };
  }

  // Fallback
  return { uk: '', us: '' };
};
