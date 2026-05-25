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
 * Map an Elo value to a 1.0–10.0 display score relative to the collection.
 * Pass the min and max Elo of the ranked set so #1 always = 10 and last = 1.
 * With a single movie (minElo === maxElo) it returns 10.
 */
export function eloToScore(elo, minElo, maxElo) {
  if (minElo === maxElo) return 10.0
  const raw = 1 + 9 * (elo - minElo) / (maxElo - minElo)
  return Math.round(raw * 10) / 10
}
