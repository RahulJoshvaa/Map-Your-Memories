/**
 * AI natural-language search.
 * Calls POST /api/search/ai — the Groq key and parsing live on the backend.
 */
import { apiClient } from '../api/client';
import { normalizePin } from '../memoryService';

const MEDIA_LABELS = { image: 'Photos', video: 'Videos', audio: 'Audio', document: 'Documents' };

function formatDay(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Human-readable chips describing how the query was understood.
 */
export function describeFilters(filters = {}) {
  const chips = [];
  const { date_from: from, date_to: to } = filters;
  if (from && to) chips.push(from === to ? formatDay(from) : `${formatDay(from)} – ${formatDay(to)}`);
  else if (from) chips.push(`From ${formatDay(from)}`);
  else if (to) chips.push(`Until ${formatDay(to)}`);
  (filters.locations || []).forEach((l) => chips.push(l));
  (filters.keywords || []).forEach((k) => chips.push(`“${k}”`));
  (filters.media_types || []).forEach((m) => chips.push(MEDIA_LABELS[m] || m));
  if (filters.scope === 'shared') chips.push('Shared with me');
  if (filters.scope === 'owned') chips.push('My pins');
  return chips;
}

export const aiSearchService = {
  /**
   * Run a natural-language search. Returns { query, filters, source, results, contentMatches }.
   * contentMatches maps pin id -> best file-content match ({ fileName, snippet, score }).
   */
  async search(query) {
    const data = await apiClient.post('/api/search/ai', { query });
    return {
      query: data.query,
      filters: data.filters,
      source: data.source,
      results: (data.pins || []).map(normalizePin),
      contentMatches: (data.content_matches || []).reduce((byPin, m) => {
        if (!byPin[m.pin_id]) byPin[m.pin_id] = { fileName: m.file_name, snippet: m.snippet, score: m.score };
        return byPin;
      }, {}),
    };
  },
};
