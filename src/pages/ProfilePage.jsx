import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getMovieRecommendations, getWatchProvidersList, getWatchRegions, IMG_BASE } from '../lib/tmdb.js'
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
      onClick={() => onToggle(provider.provider_id)}
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
    if (!user.likedMovies || user.likedMovies.length === 0) {
      setLoading(false)
      return
    }

    async function fetchRecs() {
      const recent = user.likedMovies.slice(-5)
      const results = await Promise.allSettled(
        recent.map(m => getMovieRecommendations(m.id))
      )

      const watchlistIds = new Set((user.watchlist || []).map(m => m.id))
      const likedIds = new Set((user.likedMovies || []).map(m => m.id))

      const seen = new Set()
      const flat = []
      for (const r of results) {
        if (r.status !== 'fulfilled') continue
        for (const movie of r.value.results || []) {
          if (seen.has(movie.id)) continue
          seen.add(movie.id)
          if (watchlistIds.has(movie.id)) continue
          if (likedIds.has(movie.id)) continue
          flat.push(movie)
        }
      }

      flat.sort((a, b) => {
        const scoreA = a.vote_average * Math.log1p(a.popularity || 0)
        const scoreB = b.vote_average * Math.log1p(b.popularity || 0)
        return scoreB - scoreA
      })

      setRecs(flat.slice(0, 12))
      setLoading(false)
    }

    fetchRecs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const noLikes = !user?.likedMovies || user.likedMovies.length === 0

  return (
    <section className="mb-10">
      <h2 className="text-white text-lg font-semibold mb-4">Recommended for you</h2>
      {loading && !noLikes && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-700 border-t-[#E50914] rounded-full animate-spin" />
        </div>
      )}
      {noLikes && (
        <p className="text-gray-500 text-sm py-6">
          Like movies in Reels to get personalized recommendations ♥
        </p>
      )}
      {!loading && !noLikes && recs.length === 0 && (
        <p className="text-gray-500 text-sm py-6">No recommendations found yet. Like more movies!</p>
      )}
      {!loading && recs.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {recs.map(movie => <MovieCard key={movie.id} movie={movie} />)}
        </div>
      )}
    </section>
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
      .then(data => {
        const sorted = (data.results || [])
          .sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999))
        setProviders(sorted)
      })
      .catch(() => {})
    getWatchRegions()
      .then(data => {
        const sorted = (data.results || [])
          .sort((a, b) => a.english_name.localeCompare(b.english_name))
        setRegions(sorted)
      })
      .catch(() => {})
  }, [])

  function toggleService(id) {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
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
        <p className="text-gray-400 text-xs font-medium mb-3 uppercase tracking-wider">Streaming Services</p>
        {providers.length === 0 ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-gray-600 border-t-[#E50914] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-4 max-h-72 overflow-y-auto pr-1" style={{scrollbarWidth:'thin'}}>
            {providers.map(p => (
              <ProviderSelectCard
                key={p.provider_id}
                provider={p}
                selected={selectedServices.includes(p.provider_id)}
                onToggle={toggleService}
              />
            ))}
          </div>
        )}
        <button
          onClick={saveServices}
          className="bg-[#E50914] hover:bg-[#f6121d] text-white font-semibold py-2 px-5 rounded-lg text-sm transition-colors"
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
      <WatchlistSection />
      <SettingsSection />
    </div>
  )
}
