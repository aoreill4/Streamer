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
 * Map Elo to a 1.0–10.0 score in 0.1 increments, scaled for a normal
 * distribution: 1500 → 5.5 (midpoint), ±150 Elo ≈ ±1.0 score point.
 * 68 % of a typical library lands in 4.5–6.5, extremes reach 1 or 10.
 */
export function eloToScore(elo) {
  const raw = 5.5 + (elo - BASE_ELO) / 150
  return Math.max(1.0, Math.min(10.0, Math.round(raw * 10) / 10))
}
