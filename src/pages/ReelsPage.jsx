import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getTrendingMovies, getMovieVideos, discoverMovies, IMG_BASE } from '../lib/tmdb.js'
import { useAuth } from '../context/AuthContext.jsx'

function ytCmd(iframe, func, args = []) {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ event: 'command', func, args }),
    '*'
  )
}

function ReelCard({ reel, iframeRef, mounted, onMovieClick }) {
  const { movie, trailerKey } = reel
  const { user, isLiked, likeMovie, unlikeMovie, isInWatchlist, addToWatchlist, removeFromWatchlist } = useAuth()
  const navigate = useNavigate()
  const year = movie.release_date?.slice(0, 4)
  const rating = movie.vote_average > 0 ? movie.vote_average.toFixed(1) : null
  const backdropUrl = movie.backdrop_path
    ? `${IMG_BASE}/w1280${movie.backdrop_path}`
    : movie.poster_path ? `${IMG_BASE}/w500${movie.poster_path}` : null

  const liked = isLiked(movie.id)
  const saved = isInWatchlist(movie.id)

  function requireAuth(fn) {
    if (!user) { navigate('/auth'); return }
    fn()
  }

  // Stable src — never changes. Playback controlled via postMessage.
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

      {/* Action buttons — right side */}
      <div className="absolute right-4 bottom-24 z-10 flex flex-col items-center gap-5">
        {/* Like */}
        <button
          onClick={() => requireAuth(() => liked ? unlikeMovie(movie.id) : likeMovie(movie))}
          className="flex flex-col items-center gap-1 group"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur transition-all duration-200 ${liked ? 'bg-[#E50914]/20' : 'bg-black/40 hover:bg-black/60'}`}>
            <svg className={`w-6 h-6 transition-colors ${liked ? 'text-[#E50914]' : 'text-white'}`} viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <span className="text-white text-[10px] font-medium drop-shadow">{liked ? 'Liked' : 'Like'}</span>
        </button>

        {/* Watchlist */}
        <button
          onClick={() => requireAuth(() => saved ? removeFromWatchlist(movie.id) : addToWatchlist(movie))}
          className="flex flex-col items-center gap-1 group"
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
  const [activeIndex, setActiveIndex] = useState(0)
  const [muted, setMuted] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const itemRefs = useRef([])
  const iframeRefs = useRef({})
  // Refs mirror state so the message listener always sees current values
  const activeIndexRef = useRef(0)
  const mutedRef = useRef(false)

  useEffect(() => { activeIndexRef.current = activeIndex }, [activeIndex])
  useEffect(() => { mutedRef.current = muted }, [muted])

  useEffect(() => {
    async function load() {
      try {
        const providerIds = user?.streamingServices?.length ? user.streamingServices : null
        const region = providerIds
          ? (user?.hasVPN ? undefined : user?.country || undefined)
          : undefined

        let movies = []
        if (providerIds) {
          const [p1, p2] = await Promise.all([
            discoverMovies({ providerIds, region, page: 1 }),
            discoverMovies({ providerIds, region, page: 2 }),
          ])
          movies = [...(p1.results || []), ...(p2.results || [])]
        } else {
          const [p1, p2] = await Promise.all([getTrendingMovies(1), getTrendingMovies(2)])
          movies = [...(p1.results || []), ...(p2.results || [])]
        }

        const videoResults = await Promise.allSettled(movies.map(m => getMovieVideos(m.id)))
        const reelData = []
        for (let i = 0; i < movies.length; i++) {
          if (videoResults[i].status !== 'fulfilled') continue
          const videos = videoResults[i].value.results || []
          const pick =
            videos.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.official) ||
            videos.find(v => v.type === 'Trailer' && v.site === 'YouTube') ||
            videos.find(v => v.site === 'YouTube')
          if (pick) reelData.push({ movie: movies[i], trailerKey: pick.key })
        }
        setReels(reelData)
      } catch {
        // silently fail — empty state shown
      } finally {
        setLoading(false)
      }
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // YouTube fires onReady when a player initialises — play + unmute the active one immediately
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

  // Active index changed — play new, pause others
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

  // Mute toggle — only affects the active player
  useEffect(() => {
    const el = iframeRefs.current[activeIndex]
    if (el) ytCmd(el, muted ? 'mute' : 'unMute')
  }, [muted, activeIndex])

  // IntersectionObserver — high threshold so it only fires once snapped
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

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden md:ml-[220px]">
      <div
        className="absolute top-0 md:left-[220px] left-0 right-0 z-20 flex items-center justify-between px-4 pt-4 pb-10"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)' }}
      >
        <Link to="/" className="text-white/80 hover:text-white text-sm transition-colors">← Back</Link>
        <span className="text-white font-bold text-sm tracking-widest uppercase">Reels</span>
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
        <>
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
                />
              </div>
            ))}
          </div>

          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5">
            {reels.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === activeIndex ? 'bg-white w-1.5 h-4' : 'bg-white/30 w-1.5 h-1.5'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
