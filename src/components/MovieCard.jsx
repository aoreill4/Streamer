import { Link } from 'react-router-dom'
import { IMG_BASE } from '../lib/tmdb.js'

export default function MovieCard({ movie }) {
  const year = movie.release_date ? movie.release_date.slice(0, 4) : 'N/A'
  const posterUrl = movie.poster_path
    ? `${IMG_BASE}/w342${movie.poster_path}`
    : null

  return (
    <Link
      to={`/movie/${movie.id}`}
      className="group block rounded-xl overflow-hidden bg-[#1f1f1f] hover:scale-105 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-[#E50914]"
    >
      <div className="relative w-full" style={{ aspectRatio: '2/3' }}>
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-[#2a2a2a] flex items-center justify-center p-3">
            <span className="text-gray-400 text-xs text-center leading-snug">
              {movie.title}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200" />
      </div>
      <div className="p-2 pb-3">
        <p className="text-white text-xs font-semibold leading-tight line-clamp-2">
          {movie.title}
        </p>
        <p className="text-gray-500 text-xs mt-0.5">{year}</p>
      </div>
    </Link>
  )
}
