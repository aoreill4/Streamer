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
