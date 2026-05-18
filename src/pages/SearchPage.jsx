import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import SearchBar from '../components/SearchBar.jsx'
import MovieCard from '../components/MovieCard.jsx'
import { searchMovies, getPopularMovies } from '../lib/tmdb.js'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)
  const [popular, setPopular] = useState([])
  const [popularLoading, setPopularLoading] = useState(false)

  const runSearch = useCallback(async (q, p = 1) => {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await searchMovies(q, p)
      setResults(data.results || [])
      setTotalPages(Math.min(data.total_pages || 0, 500))
      setPage(p)
      setHasSearched(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Check your API key and try again.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) {
      setQuery(q)
      runSearch(q, 1)
    } else {
      setPopularLoading(true)
      getPopularMovies().then(data => {
        setPopular(data.results || [])
      }).catch(() => {}).finally(() => setPopularLoading(false))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch() {
    if (!query.trim()) return
    navigate(`/?q=${encodeURIComponent(query.trim())}`, { replace: true })
    runSearch(query.trim(), 1)
  }

  function handlePrev() {
    const newPage = page - 1
    runSearch(query, newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleNext() {
    const newPage = page + 1
    runSearch(query, newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#141414]/90 backdrop-blur border-b border-white/5 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-4">
          <a
            href="/"
            className="text-[#E50914] text-2xl font-black tracking-tight flex-shrink-0 hover:opacity-90 transition-opacity"
          >
            Streamer
          </a>
          <div className="w-full sm:flex-1 flex justify-center">
            <SearchBar
              value={query}
              onChange={setQuery}
              onSearch={handleSearch}
              loading={loading}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full">
        {error && (
          <div className="mb-6 p-4 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center py-24">
            <div className="w-10 h-10 border-4 border-gray-700 border-t-[#E50914] rounded-full animate-spin" />
          </div>
        )}

        {!loading && !hasSearched && !error && (
          <>
            <div className="mb-6">
              <h2 className="text-white text-lg font-semibold mb-1">Popular right now</h2>
              <p className="text-gray-500 text-sm">Click any movie to see where it streams</p>
            </div>
            {popularLoading && (
              <div className="flex justify-center py-24">
                <div className="w-10 h-10 border-4 border-gray-700 border-t-[#E50914] rounded-full animate-spin" />
              </div>
            )}
            {!popularLoading && popular.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {popular.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            )}
          </>
        )}

        {!loading && hasSearched && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <span className="text-5xl">🔍</span>
            <p className="text-gray-400 text-lg">No movies found for &ldquo;{query}&rdquo;</p>
            <p className="text-gray-600 text-sm">Try a different search term.</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            <div className="mb-4 text-gray-500 text-sm">
              Showing page {page} of {totalPages} — {results.length} results
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {results.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <button
                  onClick={handlePrev}
                  disabled={page <= 1}
                  className="px-5 py-2.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  ← Prev
                </button>
                <span className="text-gray-400 text-sm">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={handleNext}
                  disabled={page >= totalPages}
                  className="px-5 py-2.5 bg-[#1f1f1f] hover:bg-[#2a2a2a] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
