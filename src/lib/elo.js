export const BASE_ELO = 1500
const K = 48 // Higher than standard (32) for faster convergence with few comparisons

export function updateElos(eloA, eloB, aWins) {
  const expected = 1 / (1 + 10 ** ((eloB - eloA) / 400))
  const delta = K * ((aWins ? 1 : 0) - expected)
  return {
    newEloA: Math.round(eloA + delta),
    newEloB: Math.round(eloB - delta),
  }
}

/**
 * Pick the best opponent for a comparison.
 * Strategy: fewest comparisons first (most uncertainty to resolve),
 * then closest Elo to targetElo (most informative match).
 * excludeIds = set of movie IDs already used in this comparison session.
 */
export function pickOpponent(ratedMovies, excludeId, targetElo = BASE_ELO, excludeIds = new Set()) {
  const candidates = Object.values(ratedMovies).filter(
    m => m.id !== excludeId && !excludeIds.has(m.id)
  )
  if (!candidates.length) return null

  candidates.sort((a, b) => {
    const compDiff = (a.comparisons || 0) - (b.comparisons || 0)
    if (compDiff !== 0) return compDiff
    return Math.abs(a.elo - targetElo) - Math.abs(b.elo - targetElo)
  })
  return candidates[0]
}

/** Map Elo to a 0.5–5.0 star display value (1 decimal place). */
export function eloToStars(elo) {
  // 1000 → 0.5★  1500 → 3.0★  2000 → 5.0★
  const raw = 0.5 + (elo - 1000) / 333
  return Math.max(0.5, Math.min(5.0, Math.round(raw * 2) / 2))
}
