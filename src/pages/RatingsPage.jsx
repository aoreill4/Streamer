import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { eloToStars } from '../lib/elo.js'
import ComparisonModal from '../components/ComparisonModal.jsx'
import { IMG_BASE } from '../lib/tmdb.js'

const TIERS = [
  { label: 'S', min: 4.5, color: '#E50914',   bg: 'rgba(229,9,20,.12)' },
  { label: 'A', min: 3.5, color: '#f97316',   bg: 'rgba(249,115,22,.1)' },
  { label: 'B', min: 2.5, color: '#eab308',   bg: 'rgba(234,179,8,.1)'  },
  { label: 'C', min: 1.5, color: '#6b7280',   bg: 'rgba(107,114,128,.1)'},
  { label: 'D', min: 0,   color: '#374151',   bg: 'rgba(55,65,81,.1)'   },
]

function getTier(stars) {
  return TIERS.find(t => stars >= t.min) ?? TIERS[TIERS.length - 1]
}

function StarBar({ stars }) {
  const pct = ((stars - 0.5) / 4.5) * 100
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
        <div className="h-full bg-[#E50914] rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-gray-400 text-xs font-medium w-6 text-right">{stars.toFixed(1)}</span>
    </div>
  )
}

export default function RatingsPage() {
  const { user, ratedMovies } = useAuth()
  const [comparingMovie, setComparingMovie] = useState(null)
  const [view, setView] = useState('ranked') // 'ranked' | 'tier'

  if (!user) return <Navigate to="/auth" replace />

  const all = Object.values(ratedMovies)
  const ranked = all.filter(m => m.comparisons > 0).sort((a, b) => b.elo - a.elo)
  const unranked = all.filter(m => !m.comparisons)
  const totalComparisons = all.reduce((s, m) => s + (m.comparisons || 0), 0) / 2 | 0

  function startCompare() {
    const pool = all.sort((a, b) => (a.comparisons || 0) - (b.comparisons || 0))
    if (pool.length >= 1) setComparingMovie(pool[0])
  }

  // Group by tier for tier view
  const tierGroups = TIERS.map(tier => ({
    ...tier,
    movies: ranked.filter(m => {
      const stars = eloToStars(m.elo)
      const nextTier = TIERS[TIERS.indexOf(tier) - 1]
      return stars >= tier.min && (!nextTier || stars < nextTier.min)
    }),
  })).filter(t => t.movies.length > 0)

  return (
    <>
      {comparingMovie && (
        <ComparisonModal
          newMovie={comparingMovie}
          onClose={() => setComparingMovie(null)}
        />
      )}

      <div className="min-h-screen px-4 sm:px-8 py-8 max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-white text-2xl font-bold">My Ratings</h1>
            <p className="text-gray-500 text-sm mt-1">
              {ranked.length} ranked · {totalComparisons} head-to-head{totalComparisons !== 1 ? 's' : ''}
              {unranked.length > 0 && ` · ${unranked.length} unranked`}
            </p>
          </div>
          {all.length >= 2 && (
            <button
              onClick={startCompare}
              className="bg-[#E50914] hover:bg-[#f6121d] text-white text-sm font-bold px-4 py-2 rounded-full transition-colors"
            >
              Compare movies
            </button>
          )}
        </div>

        {all.length === 0 && (
          <div className="text-center py-24 text-gray-500">
            <p className="text-lg">No rated movies yet.</p>
            <p className="text-sm mt-2">Like movies to start building your rankings.</p>
            <Link to="/" className="mt-4 inline-block text-[#E50914] text-sm hover:underline">
              Browse movies →
            </Link>
          </div>
        )}

        {ranked.length > 0 && (
          <>
            {/* View toggle */}
            <div className="flex gap-1 bg-[#1f1f1f] p-1 rounded-xl w-fit mb-6">
              {[['ranked', 'Ranked list'], ['tier', 'Tier board']].map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    view === v ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Ranked list view ── */}
            {view === 'ranked' && (
              <div className="flex flex-col gap-2">
                {ranked.map((m, i) => {
                  const stars = eloToStars(m.elo)
                  const tier = getTier(stars)
                  return (
                    <Link
                      key={m.id}
                      to={`/movie/${m.id}`}
                      className="flex items-center gap-4 bg-[#1a1a1a] hover:bg-[#222] rounded-2xl px-4 py-3 transition-colors group"
                    >
                      {/* Rank */}
                      <span className="text-gray-600 text-sm font-black w-7 text-right flex-shrink-0">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>

                      {/* Poster */}
                      {m.poster_path ? (
                        <img
                          src={`${IMG_BASE}/w92${m.poster_path}`}
                          alt={m.title}
                          className="w-10 h-14 rounded-lg object-cover flex-shrink-0 shadow"
                        />
                      ) : (
                        <div className="w-10 h-14 rounded-lg bg-[#2a2a2a] flex-shrink-0" />
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold leading-tight line-clamp-1 group-hover:text-[#E50914] transition-colors">
                          {m.title}
                        </p>
                        <StarBar stars={stars} />
                      </div>

                      {/* Tier badge */}
                      <span
                        className="flex-shrink-0 text-xs font-black w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ color: tier.color, background: tier.bg }}
                      >
                        {tier.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}

            {/* ── Tier board view ── */}
            {view === 'tier' && (
              <div className="flex flex-col gap-3">
                {tierGroups.map(tier => (
                  <div key={tier.label} className="rounded-2xl overflow-hidden border border-white/5">
                    {/* Tier header */}
                    <div
                      className="px-4 py-2 flex items-center gap-3"
                      style={{ background: tier.bg }}
                    >
                      <span className="text-lg font-black w-6" style={{ color: tier.color }}>
                        {tier.label}
                      </span>
                      <div className="w-px h-4 bg-white/10" />
                      <span className="text-gray-500 text-xs">
                        {tier.min.toFixed(1)}★ and {tier.label === 'D' ? 'below' : 'above'}
                      </span>
                    </div>

                    {/* Movies row */}
                    <div className="flex flex-wrap gap-2 p-3 bg-[#181818]">
                      {tier.movies.map(m => (
                        <Link
                          key={m.id}
                          to={`/movie/${m.id}`}
                          className="group relative"
                          title={m.title}
                        >
                          {m.poster_path ? (
                            <img
                              src={`${IMG_BASE}/w92${m.poster_path}`}
                              alt={m.title}
                              className="w-14 h-20 rounded-lg object-cover shadow group-hover:ring-2 ring-[#E50914] transition-all"
                            />
                          ) : (
                            <div className="w-14 h-20 rounded-lg bg-[#2a2a2a] flex items-center justify-center p-1">
                              <span className="text-gray-600 text-[9px] text-center leading-tight">{m.title}</span>
                            </div>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Unranked section */}
        {unranked.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-gray-600 text-sm font-semibold">Not yet compared</h2>
              <span className="text-gray-700 text-xs bg-white/5 px-2 py-0.5 rounded-full">{unranked.length}</span>
              <button
                onClick={startCompare}
                className="ml-auto text-[#E50914] text-xs hover:underline"
              >
                Rank them →
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {unranked.map(m => (
                <Link key={m.id} to={`/movie/${m.id}`} title={m.title}>
                  {m.poster_path ? (
                    <img
                      src={`${IMG_BASE}/w92${m.poster_path}`}
                      alt={m.title}
                      className="w-12 h-[68px] rounded-lg object-cover opacity-40 hover:opacity-70 transition-opacity"
                    />
                  ) : (
                    <div className="w-12 h-[68px] rounded-lg bg-[#2a2a2a] opacity-40" />
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
