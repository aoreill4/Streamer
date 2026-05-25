const BASE = 'https://api.themoviedb.org/3'
const KEY = import.meta.env.VITE_TMDB_API_KEY

export const IMG_BASE = 'https://image.tmdb.org/t/p'

async function apiFetch(url) {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.status_message || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function searchMovies(query, page = 1) {
  return apiFetch(
    `${BASE}/search/movie?api_key=${KEY}&query=${encodeURIComponent(query)}&page=${page}&include_adult=false`
  )
}

export async function searchMulti(query, page = 1) {
  return apiFetch(
    `${BASE}/search/multi?api_key=${KEY}&query=${encodeURIComponent(query)}&page=${page}&include_adult=false`
  )
}

export async function getMovieDetails(id) {
  return apiFetch(`${BASE}/movie/${id}?api_key=${KEY}`)
}

export async function getWatchProviders(id) {
  return apiFetch(`${BASE}/movie/${id}/watch/providers?api_key=${KEY}`)
}

export async function getPopularMovies(page = 1) {
  return apiFetch(`${BASE}/movie/popular?api_key=${KEY}&page=${page}`)
}

export async function getMovieVideos(id) {
  return apiFetch(`${BASE}/movie/${id}/videos?api_key=${KEY}`)
}

export async function getTrendingMovies(page = 1) {
  return apiFetch(`${BASE}/trending/movie/week?api_key=${KEY}&page=${page}`)
}

export async function getMovieCredits(id) {
  return apiFetch(`${BASE}/movie/${id}/credits?api_key=${KEY}`)
}

export async function getPersonDetails(id) {
  return apiFetch(`${BASE}/person/${id}?api_key=${KEY}`)
}

export async function getPersonMovieCredits(id) {
  return apiFetch(`${BASE}/person/${id}/movie_credits?api_key=${KEY}`)
}

export async function getGenres() {
  return apiFetch(`${BASE}/genre/movie/list?api_key=${KEY}`)
}

export async function getMovieKeywords(id) {
  return apiFetch(`${BASE}/movie/${id}/keywords?api_key=${KEY}`)
}

// options: { genreId, genreIds, keywordIds, providerIds, region, page }
// keywordIds: array of TMDB keyword IDs (OR-joined) — used for cluster-based discovery
// providerIds: array of TMDB provider_id numbers
// region: ISO 3166-1 country code — omit for global (VPN users)
export async function discoverMovies({ genreId, genreIds, keywordIds, providerIds, region, page = 1 } = {}) {
  const params = new URLSearchParams({
    api_key: KEY,
    sort_by: 'popularity.desc',
    page: String(page),
    include_adult: 'false',
  })
  // Single genre (legacy) or array of genres
  const genres = genreIds?.length ? genreIds : (genreId ? [genreId] : [])
  if (genres.length) params.set('with_genres', genres.join('|'))
  if (keywordIds?.length) params.set('with_keywords', keywordIds.join('|'))
  if (providerIds?.length) {
    params.set('with_watch_providers', providerIds.join('|'))
    params.set('watch_monetization_types', 'flatrate')
    if (region) params.set('watch_region', region)
  }
  return apiFetch(`${BASE}/discover/movie?${params}`)
}

export async function getMovieRecommendations(id) {
  return apiFetch(`${BASE}/movie/${id}/recommendations?api_key=${KEY}`)
}

export async function getWatchProvidersList() {
  return apiFetch(`${BASE}/watch/providers/movie?api_key=${KEY}&language=en-US`)
}

export async function getWatchRegions() {
  return apiFetch(`${BASE}/watch/providers/regions?api_key=${KEY}&language=en-US`)
}
