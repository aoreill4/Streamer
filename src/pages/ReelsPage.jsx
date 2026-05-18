import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getTrendingMovies, getMovieVideos, IMG_BASE } from '../lib/tmdb.js'

function ReelCard({ reel, isActive, muted, onMovieClick }) {
  const { movie, trailerKey } = reel
  const year = movie.release_date?.slice(0, 4)
  const rating = movie.vote_average > 0 ? movie.vote_average.toFixed(1) : null

  const backdropUrl = movie.backdrop_path
    ? `${IMG_BASE}/w1280${movie.backdrop_path}`
    : movie.poster_path
    ? `${IMG_BASE}/w500${movie.poster_path}`
    : null

  // Key changes force iframe reload when mute state or active state changes
  const iframeKey = `${trailerKey}-${muted}-${isActive}`
  const iframeSrc = `https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=${muted ? 1 : 0}&controls=1&rel=0&modestbranding=1&playsinline=1`

  return (
    <div className="snap-start h-screen w-full relative bg-black flex items-center justify-center overflow-hidden flex-shrink-0">
      {isActive ? (
        <iframe
          key={iframeKey}
          src={iframeSrc}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={movie.title}
        />
      ) : (
        backdropUrl && (
          <img
            src={backdropUrl}
            alt={movie.title}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )
      )}

      {/* gradient overlay — pointer-events-none so clicks pass through to iframe controls */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.4) 100%)',
        }}
      />

      {/* Movie info — bottom left */}
      <div className="absolute bottom-10 left-4 right-20 z-10">
        <h2 className="text-white text-xl font-bold leading-tight drop-shadow-lg">{movie.title}</h2>
        <div className="flex items-center gap-2 mt-1 text-gray-300 text-sm">
          {year && <span>{year}</span>}
          {rating && (
            <>
              <span className="text-gray-500">·</span>
              <span>★ {rating}</span>
            </>
          )}
        </div>
        {movie.overview && (
          <p className="mt-1.5 text-gray-400 text-xs leading-relaxed line-clamp-2 max-w-sm">
            {movie.overview}
          </p>
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
  const [muted, setMuted] = useState(true)
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const itemRefs = useRef([])

  useEffect(() => {
    async function load() {
      try {
        const [page1, page2] = await Promise.all([
          getTrendingMovies(1),
          getTrendingMovies(2),
        ])
        const movies = [...(page1.results || []), ...(page2.results || [])]

        const videoResults = await Promise.allSettled(
          movies.map(m => getMovieVideos(m.id))
        )

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
        // silently fail — show empty state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // IntersectionObserver to track which reel is centered
  useEffect(() => {
    if (reels.length === 0) return
    const observers = []
    itemRefs.current.forEach((el, i) => {
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) setActiveIndex(i)
        },
        { threshold: 0.6 }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [reels])

  const handleMovieClick = useCallback((id) => {
    navigate(`/movie/${id}`)
  }, [navigate])

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Top nav */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-4 pb-8"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' }}
      >
        <Link to="/" className="text-white/80 hover:text-white text-sm transition-colors flex items-center gap-1">
          ← Back
        </Link>
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
          {/* Scroll container */}
          <div
            ref={containerRef}
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
                  isActive={i === activeIndex}
                  muted={muted}
                  onMovieClick={handleMovieClick}
                />
              </div>
            ))}
          </div>

          {/* Progress dots — right side */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5">
            {reels.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === activeIndex
                    ? 'bg-white w-1.5 h-4'
                    : 'bg-white/30 w-1.5 h-1.5'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
