import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import SearchBar from '../components/SearchBar.jsx'
import MovieCard from '../components/MovieCard.jsx'
import { searchMulti, getPopularMovies, getGenres, discoverMovies, getWatchProviders, IMG_BASE } from '../lib/tmdb.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [movieResults, setMovieResults] = useState([])
  const [peopleResults, setPeopleResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)

  const [browseMovies, setBrowseMovies] = useState([])
  const [browseLoading, setBrowseLoading] = useState(false)
  const [browsePage, setBrowsePage] = useState(1)
  const [browseTotalPages, setBrowseTotalPages] = useState(0)

  const [genres, setGenres] = useState([])
  const [activeGenre, setActiveGenre] = useState(null) // { id, name }

  // Fetch genre list once
  useEffect(() => {
    getGenres().then(data => setGenres(data.genres || [])).catch(() => {})
  }, [])

  const loadBrowse = useCallback(async (genreId, p = 1) => {
    setBrowseLoading(true)
    try {
      const providerIds = user?.streamingServices?.length ? user.streamingServices : null
      // VPN users get global results (no region); country users get their region only
      const region = providerIds
        ? (user?.hasVPN ? undefined : user?.country || undefined)
        : undefined

      const data = providerIds
        ? await discoverMovies({ genreId, providerIds, region, page: p })
        : genreId
          ? await discoverMovies({ genreId, page: p })
          : await getPopularMovies(p)

      setBrowseMovies(data.results || [])
      setBrowseTotalPages(Math.min(data.total_pages || 0, 500))
      setBrowsePage(p)
    } catch {
      // silently fail
    } finally {
      setBrowseLoading(false)
    }
  }, [user?.streamingServices, user?.hasVPN, user?.country])

  // Initial load — search from URL param, or load browse
  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setQuery(q)
      runSearch(q, 1)
    } else {
      loadBrowse(null, 1)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = useCallback(async (q, p = 1) => {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await searchMulti(q, p)
      const all = data.results || []

      // Split people and movies; drop TV
      const people = all.filter(r => r.media_type === 'person')
      let movies = all.filter(r => r.media_type === 'movie')

      const services = user?.streamingServices
      if (services?.length) {
        const providerResults = await Promise.allSettled(movies.map(m => getWatchProviders(m.id)))
        movies = movies.filter((_, i) => {
          if (providerResults[i].status !== 'fulfilled') return false
          const byRegion = providerResults[i].value?.results || {}
          if (user.hasVPN) {
            return Object.values(byRegion).some(rd =>
              (rd.flatrate || []).some(pr => services.includes(pr.provider_id))
            )
          }
          if (user.country) {
            const rd = byRegion[user.country] || {}
            return (rd.flatrate || []).some(pr => services.includes(pr.provider_id))
          }
          return true
        })
      }

      setPeopleResults(people)
      setMovieResults(movies)
      setTotalPages(Math.min(data.total_pages || 0, 500))
      setPage(p)
      setHasSearched(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Check your API key and try again.')
      setMovieResults([])
      setPeopleResults([])
    } finally {
      setLoading(false)
    }
  }, [user?.streamingServices, user?.hasVPN, user?.country])

  function handleSearch() {
    if (!query.trim()) return
    navigate(`/?q=${encodeURIComponent(query.trim())}`, { replace: true })
    runSearch(query.trim(), 1)
  }

  function handleGenre(genre) {
    // Clicking same genre deselects
    const next = activeGenre?.id === genre.id ? null : genre
    setActiveGenre(next)
    setBrowsePage(1)
    loadBrowse(next?.id || null, 1)
    // Clear any active search
    setHasSearched(false)
    setResults([])
    setQuery('')
    navigate('/', { replace: true })
  }

  function handleSearchPrev() { runSearch(query, page - 1); scroll() }
  function handleSearchNext() { runSearch(query, page + 1); scroll() }
  function handleBrowsePrev() { loadBrowse(activeGenre?.id || null, browsePage - 1); scroll() }
  function handleBrowseNext() { loadBrowse(activeGenre?.id || null, browsePage + 1); scroll() }
  function scroll() { window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const browseLabel = activeGenre ? activeGenre.name : 'Popular right now'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#141414]/90 backdrop-blur border-b border-white/5 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <SearchBar
            value={query}
            onChange={setQuery}
            onSearch={handleSearch}
            loading={loading}
          />
        </div>

        {/* Genre chips */}
        {genres.length > 0 && !hasSearched && (
          <div className="max-w-7xl mx-auto mt-3 -mb-1">
            <div
              className="flex gap-2 overflow-x-auto pb-1"
              style={{ scrollbarWidth: 'none' }}
            >
              {genres.map(g => (
                <button
                  key={g.id}
                  onClick={() => handleGenre(g)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                    activeGenre?.id === g.id
                      ? 'bg-[#E50914] text-white'
                      : 'bg-[#1f1f1f] text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full">
        {error && (
          <div className="mb-6 p-4 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Search results */}
        {hasSearched && (
          <>
            {loading && (
              <div className="flex justify-center items-center py-24">
                <div className="w-10 h-10 border-4 border-gray-700 border-t-[#E50914] rounded-full animate-spin" />
              </div>
            )}
            {!loading && movieResults.length === 0 && peopleResults.length === 0 && !error && (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
                <span className="text-5xl">🔍</span>
                <p className="text-gray-400 text-lg">No results for &ldquo;{query}&rdquo;</p>
                {user?.streamingServices?.length ? (
                  <p className="text-gray-600 text-sm">No results available on your streaming services. Try a different search or update your services in Profile.</p>
                ) : (
                  <p className="text-gray-600 text-sm">Try a different search term.</p>
                )}
              </div>
            )}
            {!loading && (movieResults.length > 0 || peopleResults.length > 0) && (
              <>
                <div className="mb-4 text-gray-500 text-sm flex items-center gap-2 flex-wrap">
                  <span>Results for &ldquo;{query}&rdquo;</span>
                  {user?.streamingServices?.length > 0 && (
                    <span className="text-xs bg-[#1f1f1f] px-2 py-0.5 rounded-full text-gray-400">
                      filtered to your services
                    </span>
                  )}
                </div>

                {/* People strip */}
                {peopleResults.length > 0 && (
                  <div className="mb-7">
                    <h3 className="text-white text-sm font-semibold mb-3">People</h3>
                    <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                      {peopleResults.map(person => (
                        <PersonCard key={person.id} person={person} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Movies grid */}
                {movieResults.length > 0 && (
                  <>
                    {peopleResults.length > 0 && (
                      <h3 className="text-white text-sm font-semibold mb-3">Movies</h3>
                    )}
                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                      {movieResults.map(movie => <MovieCard key={movie.id} movie={movie} />)}
                    </div>
                    {totalPages > 1 && (
                      <Pagination page={page} total={totalPages} onPrev={handleSearchPrev} onNext={handleSearchNext} />
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* Browse (popular / genre) */}
        {!hasSearched && (
          <>
            {user?.streamingServices?.length > 0 && (
              <div className="mb-4 flex items-center gap-2 text-xs text-gray-400 bg-[#1f1f1f] rounded-lg px-3 py-2">
                <span>🎬</span>
                <span>
                  Showing movies on your services
                  {user.hasVPN ? ' · all regions (VPN)' : user.country ? ` · ${user.country}` : ''}
                </span>
                <a href="/profile" className="ml-auto text-[#E50914] hover:underline">Edit services</a>
              </div>
            )}
            <div className="mb-5 flex items-center gap-3">
              <h2 className="text-white text-lg font-semibold">{browseLabel}</h2>
              {activeGenre && (
                <button
                  onClick={() => handleGenre(activeGenre)}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  ✕ Clear
                </button>
              )}
              {!activeGenre && (
                <p className="text-gray-500 text-sm">Click any movie to see where it streams</p>
              )}
            </div>

            {browseLoading && (
              <div className="flex justify-center py-24">
                <div className="w-10 h-10 border-4 border-gray-700 border-t-[#E50914] rounded-full animate-spin" />
              </div>
            )}
            {!browseLoading && browseMovies.length > 0 && (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                  {browseMovies.map(movie => <MovieCard key={movie.id} movie={movie} />)}
                </div>
                {browseTotalPages > 1 && (
                  <Pagination page={browsePage} total={browseTotalPages} onPrev={handleBrowsePrev} onNext={handleBrowseNext} />
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function PersonCard({ person }) {
  const knownFor = person.known_for?.filter(k => k.media_type === 'movie').slice(0, 2).map(k => k.title).join(', ')
  return (
    <Link
      to={`/person/${person.id}`}
      className="flex-shrink-0 flex flex-col items-center gap-2 w-20 group"
    >
      {person.profile_path ? (
        <img
          src={`${IMG_BASE}/w185${person.profile_path}`}
          alt={person.name}
          className="w-16 h-16 rounded-full object-cover object-top border-2 border-white/8 group-hover:border-[#E50914] transition-colors"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-[#2a2a2a] flex items-center justify-center border-2 border-white/8 group-hover:border-[#E50914] transition-colors">
          <span className="text-gray-500 text-xl">👤</span>
        </div>
      )}
      <div className="text-center">
        <p className="text-white text-xs font-semibold leading-tight line-clamp-2 group-hover:text-[#E50914] transition-colors">
          {person.name}
        </p>
        {person.known_for_department && (
          <p className="text-gray-600 text-[10px] mt-0.5">{person.known_for_department}</p>
        )}
        {knownFor && (
          <p className="text-gray-700 text-[9px] mt-0.5 line-clamp-1">{knownFor}</p>
        )}
      </div>
    </Link>
  )
}

function Pagination({ page, total, onPrev, onNext }) {
  return (
    <div className="flex items-center justify-center gap-4 mt-10">
      <button
        onClick={onPrev}
        disabled={page <= 1}
        className="px-5 py-2.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200"
      >
        ← Prev
      </button>
      <span className="text-gray-400 text-sm">{page} / {total}</span>
      <button
        onClick={onNext}
        disabled={page >= total}
        className="px-5 py-2.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200"
      >
        Next →
      </button>
    </div>
  )
}
