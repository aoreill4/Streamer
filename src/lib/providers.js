// Provider name normalization and deduplication.
//
// TMDB lists some services under multiple names/IDs (e.g. "Disney+" and
// "Disney Plus", or "HBO Max" and "Max"). This module merges them so the
// picker and service filter stay clean.

// Map variant names → canonical display name.
// Keys are lowercased for matching.
const CANONICAL_NAMES = {
  'disney plus':        'Disney+',
  'disney+':            'Disney+',
  'paramount plus':     'Paramount+',
  'paramount+':         'Paramount+',
  'apple tv plus':      'Apple TV+',
  'apple tv+':          'Apple TV+',
  'espn plus':          'ESPN+',
  'espn+':              'ESPN+',
  'hbo max':            'Max',         // HBO Max was renamed to Max in 2023
  'max':                'Max',
  'peacock premium':    'Peacock',
  'peacock':            'Peacock',
  'amazon prime video': 'Amazon Prime Video',
  'amazon prime':       'Amazon Prime Video',
  'starz play':         'Starz',
  'starz':              'Starz',
  'showtime anytime':   'Showtime',
  'showtime':           'Showtime',
  'fubo tv':            'FuboTV',
  'fubo':               'FuboTV',
  'discovery plus':     'Discovery+',
  'discovery+':         'Discovery+',
}

// Normalize a raw name to its canonical form (or return as-is if unknown).
function canonicalize(name) {
  return CANONICAL_NAMES[name.toLowerCase()] ?? name
}

// Produce a stable grouping key from a (possibly canonical) name.
// "Disney+" and "Disney Plus" and "disney plus" all yield the same key.
function groupKey(name) {
  return name
    .toLowerCase()
    .replace(/\s*\+\s*/g, 'plus')
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Takes the raw TMDB `/watch/providers/movie` results array and returns a
 * deduplicated list. Entries that share the same canonical name are merged:
 * - `provider_id`  — lowest display_priority ID (most prominent)
 * - `provider_ids` — all IDs for this service (used when filtering)
 * - `provider_name` — canonical display name
 * - `logo_path` / `display_priority` — from the most prominent entry
 */
export function deduplicateProviders(providers) {
  const groups = new Map() // groupKey → merged entry

  for (const p of providers) {
    const name = canonicalize(p.provider_name)
    const key = groupKey(name)

    if (!groups.has(key)) {
      groups.set(key, {
        provider_id: p.provider_id,
        provider_ids: [p.provider_id],
        provider_name: name,
        logo_path: p.logo_path,
        display_priority: p.display_priority ?? 999,
      })
    } else {
      const g = groups.get(key)
      if (!g.provider_ids.includes(p.provider_id)) {
        g.provider_ids.push(p.provider_id)
      }
      // Adopt the more prominent entry's visuals
      if ((p.display_priority ?? 999) < g.display_priority) {
        g.display_priority = p.display_priority
        g.provider_id = p.provider_id
        g.logo_path = p.logo_path
      }
    }
  }

  return [...groups.values()].sort(
    (a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999)
  )
}

/**
 * Returns true if any of the provider's IDs are in the user's selected list.
 */
export function isProviderSelected(provider, selectedIds) {
  return provider.provider_ids.some(id => selectedIds.includes(id))
}

/**
 * Toggle a provider in the selected list. Adds or removes ALL IDs for the
 * provider group so sub-variants are always kept in sync.
 */
export function toggleProvider(provider, selectedIds) {
  const on = isProviderSelected(provider, selectedIds)
  if (on) {
    return selectedIds.filter(id => !provider.provider_ids.includes(id))
  }
  return [...selectedIds, ...provider.provider_ids.filter(id => !selectedIds.includes(id))]
}
