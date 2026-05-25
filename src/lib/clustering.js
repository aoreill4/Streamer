/**
 * Spherical k-means clustering for sparse movie feature vectors.
 *
 * Each movie is represented as a sparse vector of weighted features:
 *   `g{genreId}`   → weight 2  (genres are reliable, coarse signal)
 *   `k{keywordId}` → weight 1  (keywords are fine-grained signal)
 *
 * Vectors are L2-normalised before clustering so dot-product == cosine
 * similarity, which handles the extreme sparsity well.
 */

function buildVector(movie) {
  const vec = {}
  for (const gid of movie.genre_ids || []) {
    vec[`g${gid}`] = 2
  }
  for (const kid of movie.keyword_ids || []) {
    vec[`k${kid}`] = 1
  }
  return vec
}

function l2Norm(vec) {
  let s = 0
  for (const v of Object.values(vec)) s += v * v
  return Math.sqrt(s) || 1
}

function normalise(vec) {
  const n = l2Norm(vec)
  const out = {}
  for (const [k, v] of Object.entries(vec)) out[k] = v / n
  return out
}

function dot(a, b) {
  let s = 0
  for (const [k, v] of Object.entries(a)) s += v * (b[k] || 0)
  return s
}

// Average a list of normalised vectors and re-normalise (spherical centroid)
function centroid(vecs) {
  const out = {}
  for (const v of vecs) {
    for (const [k, val] of Object.entries(v)) out[k] = (out[k] || 0) + val
  }
  const n = l2Norm(out)
  for (const k of Object.keys(out)) out[k] /= n
  return out
}

// k-means++ initialisation: pick centroids that are spread out
function initCentroids(vecs, k) {
  const centers = [vecs[Math.floor(Math.random() * vecs.length)]]
  while (centers.length < k) {
    // Distance from each point to its nearest centre (1 - sim, so far = high)
    const dists = vecs.map(v => {
      const maxSim = Math.max(...centers.map(c => dot(v, c)))
      return Math.max(0, 1 - maxSim)
    })
    const total = dists.reduce((a, b) => a + b, 0)
    if (total === 0) break
    let r = Math.random() * total
    for (let i = 0; i < dists.length; i++) {
      r -= dists[i]
      if (r <= 0) { centers.push(vecs[i]); break }
    }
  }
  return centers
}

/**
 * Cluster an array of movie objects into k groups.
 * Each movie must have `genre_ids: number[]` and optionally `keyword_ids: number[]`.
 * Returns an array of clusters, each cluster being an array of movies.
 */
export function kMeans(movies, k, iterations = 20) {
  if (movies.length === 0) return []
  k = Math.min(k, movies.length)

  const items = movies.map(m => ({ movie: m, vec: normalise(buildVector(m)) }))
  let centroids = initCentroids(items.map(i => i.vec), k)
  let assignments = new Array(items.length).fill(0)

  for (let iter = 0; iter < iterations; iter++) {
    // Assign each item to its nearest centroid
    const next = items.map(({ vec }) => {
      let best = 0, bestSim = -Infinity
      for (let c = 0; c < centroids.length; c++) {
        const sim = dot(vec, centroids[c])
        if (sim > bestSim) { bestSim = sim; best = c }
      }
      return best
    })

    const converged = next.every((a, i) => a === assignments[i])
    assignments = next
    if (converged) break

    // Recompute centroids
    centroids = Array.from({ length: k }, (_, c) => {
      const clusterVecs = items.filter((_, i) => assignments[i] === c).map(it => it.vec)
      return clusterVecs.length ? centroid(clusterVecs) : centroids[c]
    })
  }

  const clusters = Array.from({ length: k }, () => [])
  items.forEach(({ movie }, i) => clusters[assignments[i]].push(movie))
  return clusters.filter(c => c.length > 0)
}

/** Top keyword IDs by frequency within a cluster (for TMDB discover filter) */
export function clusterKeywords(cluster, limit = 8) {
  const counts = {}
  for (const m of cluster) {
    for (const kid of m.keyword_ids || []) {
      counts[kid] = (counts[kid] || 0) + 1
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => Number(id))
}

/** Top genre IDs by frequency within a cluster */
export function clusterGenres(cluster, limit = 3) {
  const counts = {}
  for (const m of cluster) {
    for (const gid of m.genre_ids || []) {
      counts[gid] = (counts[gid] || 0) + 1
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => Number(id))
}

/**
 * High-level entry point.
 * Given the user's liked movies, return an array of "taste clusters",
 * each with { keywordIds, genreIds } ready to pass to discoverMovies.
 */
export function buildTasteClusters(watchedMovies) {
  if (!watchedMovies?.length) return []

  // Choose k: 1 cluster up to 4, roughly 1 per 3 liked movies
  const k = Math.min(4, Math.max(1, Math.floor(watchedMovies.length / 3)))
  const clusters = kMeans(watchedMovies, k)

  return clusters.map(cluster => ({
    keywordIds: clusterKeywords(cluster),
    genreIds: clusterGenres(cluster),
    size: cluster.length,
  }))
}
