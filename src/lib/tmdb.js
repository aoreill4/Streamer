const BASE = 'https://api.themoviedb.org/3'
const KEY = import.meta.env.VITE_TMDB_API_KEY

export const IMG_BASE = 'https://image.tmdb.org/t/p'

export async function searchMovies(query, page = 1) {
  const url = `${BASE}/search/movie?api_key=${KEY}&query=${encodeURIComponent(query)}&page=${page}&include_adult=false`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Search failed')
  return res.json()
}

export async function getMovieDetails(id) {
  const url = `${BASE}/movie/${id}?api_key=${KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Movie fetch failed')
  return res.json()
}

export async function getWatchProviders(id) {
  const url = `${BASE}/movie/${id}/watch/providers?api_key=${KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Provider fetch failed')
  return res.json()
}
