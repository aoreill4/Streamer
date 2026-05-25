import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getTrendingMovies, getMovieVideos, discoverMovies, IMG_BASE } from '../lib/tmdb.js'
import { buildTasteClusters } from '../lib/clustering.js'
import { useAuth } from '../context/AuthContext.jsx'
import ComparisonModal from '../components/ComparisonModal.jsx'

function ytCmd(iframe, func, args = []) {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ event: 'command', func, args }),
    '*'
  )
}

function ReelCard({ reel, iframeRef, mounted, onMovieClick, onLiked }) {
  const { movie, trailerKey } = reel
  const { user, isWatched, watchMovie, unwatchMovie, isInWatchlist, addToWatchlist, removeFromWatchlist, ratedMovies } = useAuth()
  const navigate = useNavigate()
  const year = movie.release_date?.slice(0, 4)
  const rating = movie.vote_average > 0 ? movie.vote_average.toFixed(1) : null
  const backdropUrl = movie.backdrop_path
    ? `${IMG_BASE}/w1280${movie.backdrop_path}`
    : movie.poster_path ? `${IMG_BASE}/w500${movie.poster_path}` : null

  const watched = isWatched(movie.id)
  const saved = isInWatchlist(movie.id)

  function requireAuth(fn) {
    if (!user) { navigate('/auth'); return }
    fn()
  }

  const src = `https://www.youtube.com/embed/${trailerKey}?enablejsapi=1&autoplay=0&mute=1&controls=0&rel=0&modestbranding=1&iv_load_policy=3&loop=1&playlist=${trailerKey}&playsinline=1`

  return (
    <div className="snap-start h-screen w-full relative bg-black overflow-hidden flex-shrink-0">
      {backdropUrl && (
        <img src={backdropUrl} alt={movie.title} className="absolute inset-0 w-full h-full object-cover opacity-30" />
      )}

      {mounted && (
        <iframe
          ref={iframeRef}
          src={src}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={movie.title}
        />
      )}

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.05) 45%, rgba(0,0,0,0.45) 100%)' }}
      />

      {/* Action buttons */}
      <div className="absolute right-4 bottom-24 z-10 flex flex-col items-center gap-5">
        <button
          onClick={() => requireAuth(() => {
            if (watched) { unwatchMovie(movie.id) } else {
              watchMovie(movie)
              if (Object.keys(ratedMovies).length >= 1) onLiked?.(movie)
            }
          })}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur transition-all duration-200 ${watched ? 'bg-[#E50914]/20' : 'bg-black/40 hover:bg-black/60'}`}>
            <svg className={`w-6 h-6 transition-colors ${watched ? 'text-[#E50914]' : 'text-white'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" fill={watched ? 'currentColor' : 'none'} />
            </svg>
          </div>
          <span className="text-white text-[10px] font-medium drop-shadow">{watched ? 'Watched' : 'Watch'}</span>
        </button>

        <button
          onClick={() => requireAuth(() => saved ? removeFromWatchlist(movie.id) : addToWatchlist(movie))}
          className="flex flex-col items-center gap-1"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur transition-all duration-200 ${saved ? 'bg-[#E50914]/20' : 'bg-black/40 hover:bg-black/60'}`}>
            <svg className={`w-6 h-6 transition-colors ${saved ? 'text-[#E50914]' : 'text-white'}`} viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <span className="text-white text-[10px] font-medium drop-shadow">{saved ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      <div className="absolute bottom-20 md:bottom-10 left-4 right-20 z-10">
        <h2 className="text-white text-xl font-bold leading-tight drop-shadow-lg">{movie.title}</h2>
        <div className="flex items-center gap-2 mt-1 text-gray-300 text-sm">
          {year && <span>{year}</span>}
          {rating && <><span className="text-gray-500">·</span><span>★ {rating}</span></>}
        </div>
        {movie.overview && (
          <p className="mt-1.5 text-gray-400 text-xs leading-relaxed line-clamp-2 max-w-sm">{movie.overview}</p>
        )}
        <button
          onClick={() => onMovieClick(movie.id)}
          className="mt-3 inline-flex items-center gap-1.5 bg-[#E50914] hover:bg-[#f6121d] text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
        >
          Where to Stream →
        </button>
      </div>
    </div>
  )
}

export default function ReelsPage() {
  const [reels, setReels] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [muted, setMuted] = useState(false)
  const [comparingMovie, setComparingMovie] = useState(null)
  const { user } = useAuth()
  const navigate = useNavigate()
  const itemRefs = useRef([])
  const iframeRefs = useRef({})
  const activeIndexRef = useRef(0)
  const mutedRef = useRef(false)
  const fetchPageRef = useRef(1)
  const clusterIdxRef = useRef(0)   // which taste cluster to draw from next
  const seenIdsRef = useRef(new Set())
  const isFetchingRef = useRef(false)
  const tasteClustersRef = useRef([]) // computed once on mount

  useEffect(() => { activeIndexRef.current = activeIndex }, [activeIndex])
  useEffect(() => { mutedRef.current = muted }, [muted])

  // Build taste clusters from liked + watchlisted movies on mount
  useEffect(() => {
    const watched = user?.watchedMovies || []
    const watchlisted = user?.watchlist || []
    // Pre-seed seen IDs so already-watched movies never appear in the feed
    watched.forEach(m => seenIdsRef.current.add(m.id))
    // Merge, deduplicate, prefer watched (they have stronger signal)
    const seen = new Set()
    const all = []
    for (const m of [...watched, ...watchlisted]) {
      if (!seen.has(m.id)) { seen.add(m.id); all.push(m) }
    }
    tasteClustersRef.current = buildTasteClusters(all)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReels = useCallback(async (append = false) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    if (!append) setLoading(true); else setLoadingMore(true)

    try {
      const providerIds = user?.streamingServices?.length ? user.streamingServices : null
      const region = providerIds
        ? (user?.hasVPN ? undefined : user?.country || undefined)
        : undefined

      const clusters = tasteClustersRef.current
      const page = fetchPageRef.current
      fetchPageRef.current += 1

      let movies = []

      if (clusters.length > 0) {
        // Pick next cluster in round-robin; every (clusters.length+1)th fetch is
        // an unfiltered popularity pass to keep variety
        const cycleLen = clusters.length + 1
        const slot = clusterIdxRef.current % cycleLen
        clusterIdxRef.current += 1

        if (slot < clusters.length) {
          const { keywordIds, genreIds } = clusters[slot]
          // Prefer keyword-based discovery; fall back to genre-only if no keywords
          movies = await discoverMovies({
            keywordIds: keywordIds.length ? keywordIds.slice(0, 6) : undefined,
            genreIds: genreIds.length ? genreIds.slice(0, 2) : undefined,
            providerIds: providerIds || undefined,
            region,
            page,
          }).then(d => d.results || [])
        } else {
          // Popularity pass (no genre/keyword filter, just services)
          movies = await discoverMovies({ providerIds: providerIds || undefined, region, page })
            .then(d => d.results || [])
        }
      } else if (providerIds) {
        // No taste data yet — use services-filtered popularity
        movies = await discoverMovies({ providerIds, region, page }).then(d => d.results || [])
      } else {
        // Brand new user — trending
        movies = await getTrendingMovies(page).then(d => d.results || [])
      }

      // Deduplicate
      const fresh = movies.filter(m => !seenIdsRef.current.has(m.id))
      fresh.forEach(m => seenIdsRef.current.add(m.id))

      const videoResults = await Promise.allSettled(fresh.map(m => getMovieVideos(m.id)))
      const newReels = []
      for (let i = 0; i < fresh.length; i++) {
        if (videoResults[i].status !== 'fulfilled') continue
        const videos = videoResults[i].value.results || []
        const pick =
          videos.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.official) ||
          videos.find(v => v.type === 'Trailer' && v.site === 'YouTube') ||
          videos.find(v => v.site === 'YouTube')
        if (pick) newReels.push({ movie: fresh[i], trailerKey: pick.key })
      }

      setReels(prev => append ? [...prev, ...newReels] : newReels)
    } catch {
      // silently fail
    } finally {
      isFetchingRef.current = false
      if (!append) setLoading(false); else setLoadingMore(false)
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load
  useEffect(() => {
    fetchReels(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load more when within 5 reels of the end
  useEffect(() => {
    if (reels.length > 0 && activeIndex >= reels.length - 5) {
      fetchReels(true)
    }
  }, [activeIndex, reels.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // YouTube onReady
  useEffect(() => {
    function onMessage(e) {
      try {
        const data = JSON.parse(typeof e.data === 'string' ? e.data : '{}')
        if (data.event !== 'onReady') return
        Object.entries(iframeRefs.current).forEach(([idxStr, el]) => {
          if (!el || el.contentWindow !== e.source) return
          const i = parseInt(idxStr)
          if (i === activeIndexRef.current) {
            ytCmd(el, 'playVideo')
            ytCmd(el, mutedRef.current ? 'mute' : 'unMute')
          }
        })
      } catch {}
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Play/pause on index change
  useEffect(() => {
    Object.entries(iframeRefs.current).forEach(([idxStr, el]) => {
      if (!el) return
      const i = parseInt(idxStr)
      if (i === activeIndex) {
        ytCmd(el, 'playVideo')
        ytCmd(el, muted ? 'mute' : 'unMute')
      } else {
        ytCmd(el, 'pauseVideo')
        ytCmd(el, 'mute')
      }
    })
  }, [activeIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mute toggle
  useEffect(() => {
    const el = iframeRefs.current[activeIndex]
    if (el) ytCmd(el, muted ? 'mute' : 'unMute')
  }, [muted, activeIndex])

  // IntersectionObserver
  useEffect(() => {
    if (reels.length === 0) return
    const observers = []
    itemRefs.current.forEach((el, i) => {
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting && entry.intersectionRatio >= 0.6) setActiveIndex(i) },
        { threshold: 0.6 }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [reels])

  const handleMovieClick = useCallback((id) => navigate(`/movie/${id}`), [navigate])

  const hasClusters = tasteClustersRef.current.length > 0

  return (
    <>
    {comparingMovie && (
      <ComparisonModal
        newMovie={comparingMovie}
        onClose={() => setComparingMovie(null)}
      />
    )}
    <div className="h-screen bg-black flex flex-col overflow-hidden md:ml-[220px]">
      <div
        className="absolute top-0 md:left-[220px] left-0 right-0 z-20 flex items-center justify-between px-4 pt-4 pb-10"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)' }}
      >
        <Link to="/" className="text-white/80 hover:text-white text-sm transition-colors">← Back</Link>
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-white font-bold text-sm tracking-widest uppercase">Reels</span>
          {hasClusters && (
            <span className="text-[10px] text-[#E50914] font-medium tracking-wide">
              personalized
            </span>
          )}
        </div>
        <button
          onClick={() => setMuted(m => !m)}
          className="text-white/80 hover:text-white transition-colors text-xl w-8 h-8 flex items-center justify-center"
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-gray-700 border-t-[#E50914] rounded-full animate-spin" />
        </div>
      )}

      {!loading && reels.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-3">
          <p>No trailers found.</p>
          <Link to="/" className="text-[#E50914] text-sm">← Go back</Link>
        </div>
      )}

      {!loading && reels.length > 0 && (
        <div
          className="flex-1 overflow-y-scroll"
          style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}
        >
          {reels.map((reel, i) => (
            <div
              key={`${reel.movie.id}-${reel.trailerKey}`}
              ref={el => { itemRefs.current[i] = el }}
              style={{ scrollSnapAlign: 'start', height: '100vh' }}
            >
              <ReelCard
                reel={reel}
                iframeRef={el => { iframeRefs.current[i] = el }}
                mounted={Math.abs(i - activeIndex) <= 1}
                onMovieClick={handleMovieClick}
                onLiked={setComparingMovie}
              />
            </div>
          ))}
          {loadingMore && (
            <div style={{ scrollSnapAlign: 'start', height: '100vh' }} className="flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-gray-700 border-t-[#E50914] rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
    </div>
    </>
  )
}
