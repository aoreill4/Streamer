import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getMovieRecommendations, getWatchProvidersList, getWatchRegions, IMG_BASE } from '../lib/tmdb.js'
import { BASE_ELO, eloToScore } from '../lib/elo.js'
import { deduplicateProviders, isProviderSelected, toggleProvider as toggleProviderGroup } from '../lib/providers.js'
import ComparisonModal from '../components/ComparisonModal.jsx'
import MovieCard from '../components/MovieCard.jsx'

// ── VPN Toggle pill ────────────────────────────────────────────────────────
function VpnToggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        value ? 'bg-[#E50914]' : 'bg-[#3a3a3a]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ── Provider card ──────────────────────────────────────────────────────────
function ProviderSelectCard({ provider, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(provider)}
      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all duration-150 ${
        selected
          ? 'border-[#E50914] bg-[#E50914]/10'
          : 'border-white/5 bg-[#2a2a2a] hover:border-white/20'
      }`}
    >
      {provider.logo_path ? (
        <img
          src={`${IMG_BASE}/w92${provider.logo_path}`}
          alt={provider.provider_name}
          className="w-10 h-10 rounded-lg object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-[#3a3a3a] flex items-center justify-center">
          <span className="text-gray-400 text-xs">?</span>
        </div>
      )}
      <span className="text-gray-300 text-[10px] text-center leading-tight line-clamp-2">
        {provider.provider_name}
      </span>
    </button>
  )
}

// ── Recommendations section ────────────────────────────────────────────────
function RecommendationsSection() {
  const { user } = useAuth()
  const [recs, setRecs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    if (!user.watchedMovies || user.watchedMovies.length === 0) {
      setLoading(false)
      return
    }

    async function fetchRecs() {
      const watchlistIds = new Set((user.watchlist || []).map(m => m.id))
      const watchedIds = new Set((user.watchedMovies || []).map(m => m.id))

      // Build a diverse pool of source movies:
      // top-rated (by elo, score ≥ 5), most recent watched (score ≥ 5 or unrated), and watchlist items — up to 2 each
      const rated = Object.values(user.ratedMovies || {})
        .filter(m => m.comparisons > 0)
        .sort((a, b) => b.elo - a.elo)
      const ratedMaxElo = rated[0]?.elo ?? BASE_ELO
      const ratedMinElo = rated[rated.length - 1]?.elo ?? BASE_ELO
      const ratedIds = new Set(rated.map(m => m.id))

      const highRated = rated.filter(m => eloToScore(m.elo, ratedMinElo, ratedMaxElo) >= 5.0)
      const topRated = highRated.slice(0, 2)

      // Only use recently watched movies that score ≥ 5 (or haven't been compared yet)
      const recentWatched = [...user.watchedMovies]
        .reverse()
        .filter(m => {
          if (!ratedIds.has(m.id)) return true
          const rm = user.ratedMovies[m.id]
          if (!rm || !rm.comparisons) return true
          return eloToScore(rm.elo, ratedMinElo, ratedMaxElo) >= 5.0
        })
        .slice(0, 2)
      const watchlistSample = (user.watchlist || []).slice(0, 2)

      const seen = new Set()
      const sourceSets = [topRated, recentWatched, watchlistSample]
      const sources = []
      // Interleave sources so results are diverse across categories
      const maxLen = Math.max(...sourceSets.map(s => s.length))
      for (let i = 0; i < maxLen; i++) {
        for (const set of sourceSets) {
          if (set[i]) sources.push(set[i])
        }
      }
      // Deduplicate sources by id
      const uniqueSources = []
      const sourcesSeen = new Set()
      for (const m of sources) {
        if (!sourcesSeen.has(m.id)) { sourcesSeen.add(m.id); uniqueSources.push(m) }
      }

      const results = await Promise.allSettled(
        uniqueSources.map(m => getMovieRecommendations(m.id))
      )

      // Interleave results from each source (round-robin) to keep diversity
      const perSource = results.map(r =>
        r.status === 'fulfilled' ? (r.value.results || []) : []
      )
      const flat = []
      const maxMovies = Math.max(...perSource.map(a => a.length), 0)
      for (let i = 0; i < maxMovies && flat.length < 24; i++) {
        for (const arr of perSource) {
          if (!arr[i]) continue
          const movie = arr[i]
          if (seen.has(movie.id)) continue
          seen.add(movie.id)
          if (watchlistIds.has(movie.id)) continue
          if (watchedIds.has(movie.id)) continue
          flat.push(movie)
        }
      }

      setRecs(flat.slice(0, 12))
      setLoading(false)
    }

    fetchRecs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const noWatched = !user?.watchedMovies || user.watchedMovies.length === 0

  return (
    <section className="mb-10">
      <h2 className="text-white text-lg font-semibold mb-4">Recommended for you</h2>
      {loading && !noWatched && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-700 border-t-[#E50914] rounded-full animate-spin" />
        </div>
      )}
      {noWatched && (
        <p className="text-gray-500 text-sm py-6">
          Mark movies as Watched to get personalized recommendations
        </p>
      )}
      {!loading && !noWatched && recs.length === 0 && (
        <p className="text-gray-500 text-sm py-6">No recommendations found yet. Mark more movies as watched!</p>
      )}
      {!loading && recs.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {recs.map(movie => <MovieCard key={movie.id} movie={movie} />)}
        </div>
      )}
    </section>
  )
}

// ── Rankings section ───────────────────────────────────────────────────────
function ScoreDisplay({ score }) {
  const pct = ((score - 1) / 9) * 100
  return (
    <span className="flex items-center gap-2">
      <span className="text-[#E50914] text-sm font-bold tabular-nums">{score.toFixed(1)}</span>
      <span className="flex-1 max-w-[64px] h-1 bg-white/8 rounded-full overflow-hidden">
        <span className="block h-full bg-[#E50914] rounded-full" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-gray-700 text-[10px]">/10</span>
    </span>
  )
}

function RankingsSection() {
  const { ratedMovies, recordComparison } = useAuth()
  const [comparingPair, setComparingPair] = useState(null) // { movieA, movieB }

  const ranked = Object.values(ratedMovies)
    .filter(m => m.comparisons > 0)
    .sort((a, b) => b.elo - a.elo)

  const maxElo = ranked[0]?.elo ?? BASE_ELO
  const minElo = ranked[ranked.length - 1]?.elo ?? BASE_ELO

  const unranked = Object.values(ratedMovies)
    .filter(m => !m.comparisons)

  // Pick a random pair of unranked or low-comparison movies to compare
  function startCompare() {
    const pool = Object.values(ratedMovies).sort((a, b) => (a.comparisons || 0) - (b.comparisons || 0))
    if (pool.length < 2) return
    setComparingPair(pool[0])
  }

  if (Object.keys(ratedMovies).length === 0) return null

  return (
    <>
    {comparingPair && (
      <ComparisonModal
        newMovie={comparingPair}
        onClose={() => setComparingPair(null)}
      />
    )}
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h2 className="text-white text-lg font-semibold">My Rankings</h2>
        {ranked.length > 0 && (
          <span className="bg-[#1f1f1f] text-gray-400 text-xs px-2 py-0.5 rounded-full">
            {ranked.length} ranked
          </span>
        )}
        {Object.keys(ratedMovies).length >= 2 && (
          <button
            onClick={startCompare}
            className="ml-auto text-xs bg-[#E50914] hover:bg-[#f6121d] text-white font-semibold px-3 py-1.5 rounded-full transition-colors"
          >
            Compare movies
          </button>
        )}
      </div>

      {ranked.length === 0 && (
        <p className="text-gray-500 text-sm py-4">
          Mark movies as watched to start ranking them. After your second watched movie you'll be asked to compare them.
        </p>
      )}

      {ranked.length > 0 && (
        <div className="flex flex-col gap-2">
          {ranked.map((m, i) => (
            <Link
              key={m.id}
              to={`/movie/${m.id}`}
              className="flex items-center gap-3 bg-[#1f1f1f] hover:bg-[#252525] rounded-xl px-4 py-3 transition-colors group"
            >
              <span className="text-gray-600 text-sm font-bold w-6 flex-shrink-0 text-right">
                {i + 1}
              </span>
              {m.poster_path ? (
                <img
                  src={`${IMG_BASE}/w92${m.poster_path}`}
                  alt={m.title}
                  className="w-9 h-12 rounded object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-12 rounded bg-[#2a2a2a] flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold leading-tight group-hover:text-[#E50914] transition-colors line-clamp-1">
                  {m.title}
                </p>
                <ScoreDisplay score={eloToScore(m.elo, minElo, maxElo)} />
              </div>
              <span className="text-gray-700 text-xs flex-shrink-0">
                {m.comparisons} {m.comparisons === 1 ? 'match' : 'matches'}
              </span>
            </Link>
          ))}
        </div>
      )}

      {unranked.length > 0 && ranked.length > 0 && (
        <p className="text-gray-600 text-xs mt-3">
          {unranked.length} watched {unranked.length === 1 ? 'movie' : 'movies'} not yet compared — hit "Compare movies" to rank them.
        </p>
      )}
    </section>
    </>
  )
}

// ── Watchlist section ──────────────────────────────────────────────────────
function WatchlistSection() {
  const { user, removeFromWatchlist } = useAuth()
  const watchlist = user?.watchlist || []

  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-white text-lg font-semibold">My Watchlist</h2>
        {watchlist.length > 0 && (
          <span className="bg-[#E50914] text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {watchlist.length}
          </span>
        )}
      </div>
      {watchlist.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          <p className="text-sm">Your watchlist is empty.</p>
          <Link to="/" className="text-[#E50914] text-sm hover:underline mt-1 inline-block">
            Browse movies →
          </Link>
        </div>
      )}
      {watchlist.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {watchlist.map(movie => (
            <div key={movie.id} className="relative group">
              <MovieCard movie={movie} />
              <button
                onClick={() => removeFromWatchlist(movie.id)}
                className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#E50914]"
                title="Remove from watchlist"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ── Settings section ───────────────────────────────────────────────────────
function SettingsSection() {
  const { user, updateUser } = useAuth()
  const [providers, setProviders] = useState([])
  const [selectedServices, setSelectedServices] = useState(user?.streamingServices || [])
  const [providerSearch, setProviderSearch] = useState('')
  const [hasVPN, setHasVPN] = useState(user?.hasVPN || false)
  const [country, setCountry] = useState(user?.country || '')
  const [regions, setRegions] = useState([])
  const [servicesSaved, setServicesSaved] = useState(false)

  // Password change state
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  useEffect(() => {
    getWatchProvidersList()
      .then(data => setProviders(deduplicateProviders(data.results || [])))
      .catch(() => {})
    getWatchRegions()
      .then(data => {
        const sorted = (data.results || [])
          .sort((a, b) => a.english_name.localeCompare(b.english_name))
        setRegions(sorted)
      })
      .catch(() => {})
  }, [])

  function toggleService(provider) {
    setSelectedServices(prev => toggleProviderGroup(provider, prev))
    setServicesSaved(false)
  }

  function saveServices() {
    updateUser({ streamingServices: selectedServices })
    setServicesSaved(true)
    setTimeout(() => setServicesSaved(false), 2000)
  }

  function toggleVPN(val) {
    setHasVPN(val)
    updateUser({ hasVPN: val })
  }

  function handleCountryChange(val) {
    setCountry(val)
    updateUser({ country: val })
  }

  function handlePasswordSave(e) {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')
    if (!oldPw) { setPwError('Enter your current password.'); return }
    if (oldPw !== user.password) { setPwError('Current password is incorrect.'); return }
    if (newPw.length < 6) { setPwError('New password must be at least 6 characters.'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return }
    updateUser({ password: newPw })
    setOldPw('')
    setNewPw('')
    setConfirmPw('')
    setPwSuccess('Password updated successfully.')
    setTimeout(() => setPwSuccess(''), 3000)
  }

  return (
    <section className="mb-10">
      <h2 className="text-white text-lg font-semibold mb-6">Settings</h2>

      {/* User info */}
      <div className="bg-[#1f1f1f] rounded-xl p-5 mb-4">
        <p className="text-gray-400 text-xs font-medium mb-3 uppercase tracking-wider">Account</p>
        <div className="flex flex-col gap-2">
          <div>
            <span className="text-gray-500 text-xs">Name</span>
            <p className="text-white text-sm mt-0.5">{user?.name}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs">Email</span>
            <p className="text-white text-sm mt-0.5">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Streaming services */}
      <div className="bg-[#1f1f1f] rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Streaming Services</p>
          {selectedServices.length > 0 && (
            <span className="text-xs text-[#E50914] font-medium">{selectedServices.length} selected</span>
          )}
        </div>
        {providers.length === 0 ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-gray-600 border-t-[#E50914] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="relative mb-3">
              <span className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-gray-500">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={providerSearch}
                onChange={e => setProviderSearch(e.target.value)}
                placeholder="Search services…"
                className="w-full bg-[#2a2a2a] text-white placeholder-gray-600 rounded-lg pl-7 pr-7 py-1.5 text-xs outline-none border border-white/8 focus:border-[#E50914] transition-colors"
              />
              {providerSearch && (
                <button type="button" onClick={() => setProviderSearch('')} className="absolute inset-y-0 right-2 text-gray-500 hover:text-gray-300 text-xs">✕</button>
              )}
            </div>
            {(() => {
              const q = providerSearch.toLowerCase().trim()
              const filtered = providers.filter(p => !q || p.provider_name.toLowerCase().includes(q))
              const sorted = [...filtered].sort((a, b) => {
                if (q) {
                  const aOn = isProviderSelected(a, selectedServices)
                  const bOn = isProviderSelected(b, selectedServices)
                  if (aOn !== bOn) return aOn ? -1 : 1
                }
                return (a.display_priority ?? 999) - (b.display_priority ?? 999)
              })
              return sorted.length === 0 ? (
                <p className="text-gray-600 text-xs text-center py-4">No services match "{providerSearch}"</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-4 max-h-64 overflow-y-auto pr-1" style={{scrollbarWidth:'thin'}}>
                  {sorted.map(p => (
                    <ProviderSelectCard
                      key={p.provider_id}
                      provider={p}
                      selected={isProviderSelected(p, selectedServices)}
                      onToggle={toggleService}
                    />
                  ))}
                </div>
              )
            })()}
          </>
        )}
        <button
          onClick={saveServices}
          className="bg-[#E50914] hover:bg-[#f6121d] text-white font-semibold py-2 px-5 rounded-lg text-sm transition-colors mt-1"
        >
          {servicesSaved ? 'Saved ✓' : 'Save'}
        </button>
      </div>

      {/* VPN toggle + country */}
      <div className="bg-[#1f1f1f] rounded-xl p-5 mb-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-sm font-medium">VPN</p>
            <p className="text-gray-500 text-xs mt-0.5">I use a VPN to access more content</p>
          </div>
          <VpnToggle value={hasVPN} onChange={toggleVPN} />
        </div>
        <div>
          <p className="text-white text-sm font-medium mb-2">Your country</p>
          <select
            value={country}
            onChange={e => handleCountryChange(e.target.value)}
            disabled={hasVPN}
            className="w-full bg-[#2a2a2a] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-[#E50914] outline-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="">— Select your country —</option>
            {regions.map(r => (
              <option key={r.iso_3166_1} value={r.iso_3166_1}>{r.english_name}</option>
            ))}
          </select>
          {hasVPN && (
            <p className="text-gray-500 text-xs mt-1.5">VPN enabled — all regions unlocked</p>
          )}
        </div>
      </div>

      {/* Password change */}
      <div className="bg-[#1f1f1f] rounded-xl p-5">
        <p className="text-gray-400 text-xs font-medium mb-4 uppercase tracking-wider">Change Password</p>
        <form onSubmit={handlePasswordSave} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-400 text-xs font-medium">Current password</label>
            <input
              type="password"
              value={oldPw}
              onChange={e => setOldPw(e.target.value)}
              placeholder="••••••••"
              className="bg-[#2a2a2a] border border-white/10 text-white rounded-lg px-4 py-3 text-sm focus:border-[#E50914] outline-none transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-400 text-xs font-medium">New password</label>
            <input
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="Min. 6 characters"
              className="bg-[#2a2a2a] border border-white/10 text-white rounded-lg px-4 py-3 text-sm focus:border-[#E50914] outline-none transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-gray-400 text-xs font-medium">Confirm new password</label>
            <input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="Repeat new password"
              className="bg-[#2a2a2a] border border-white/10 text-white rounded-lg px-4 py-3 text-sm focus:border-[#E50914] outline-none transition-colors"
            />
          </div>
          {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
          {pwSuccess && <p className="text-green-400 text-sm">{pwSuccess}</p>}
          <button
            type="submit"
            className="bg-[#2a2a2a] hover:bg-[#333] text-gray-300 font-semibold py-2.5 px-5 rounded-lg text-sm transition-colors self-start"
          >
            Update password
          </button>
        </form>
      </div>
    </section>
  )
}

// ── ProfilePage ────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user } = useAuth()

  if (!user) return <Navigate to="/auth" replace />

  return (
    <div className="min-h-screen px-4 sm:px-8 py-8 max-w-6xl mx-auto w-full">
      <RecommendationsSection />
      <RankingsSection />
      <WatchlistSection />
      <SettingsSection />
    </div>
  )
}
