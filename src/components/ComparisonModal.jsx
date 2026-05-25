import { useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { BASE_ELO, updateElos, pickOpponent } from '../lib/elo.js'
import { IMG_BASE } from '../lib/tmdb.js'

const MAX_ROUNDS = 3

function StarDisplay({ stars }) {
  const full = Math.floor(stars)
  const half = stars % 1 >= 0.5
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} className={`w-3 h-3 ${i < full ? 'text-[#E50914]' : i === full && half ? 'text-[#E50914]' : 'text-gray-700'}`} viewBox="0 0 24 24" fill="currentColor">
          {i < full ? (
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          ) : i === full && half ? (
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77V2z" />
          ) : (
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fillOpacity="0" stroke="currentColor" strokeWidth="1.5" />
          )}
        </svg>
      ))}
    </div>
  )
}

function MovieChoice({ movie, state, onClick }) {
  // state: 'idle' | 'winner' | 'loser'
  return (
    <button
      onClick={onClick}
      disabled={state !== 'idle'}
      className={`flex-1 flex flex-col items-center gap-3 rounded-2xl p-3 border-2 transition-all duration-300 cursor-pointer select-none ${
        state === 'winner'
          ? 'border-[#E50914] scale-[1.04] bg-[#E50914]/5'
          : state === 'loser'
            ? 'border-transparent opacity-25 scale-95'
            : 'border-white/10 hover:border-white/30 active:scale-[0.98]'
      }`}
    >
      {movie.poster_path ? (
        <img
          src={`${IMG_BASE}/w342${movie.poster_path}`}
          alt={movie.title}
          className="w-full rounded-xl object-cover shadow-xl"
          style={{ aspectRatio: '2/3' }}
          draggable={false}
        />
      ) : (
        <div
          className="w-full rounded-xl bg-[#2a2a2a] flex items-center justify-center p-4"
          style={{ aspectRatio: '2/3' }}
        >
          <span className="text-gray-400 text-xs text-center leading-snug">{movie.title}</span>
        </div>
      )}
      <span className="text-white text-sm font-semibold text-center leading-tight line-clamp-2 px-1">
        {movie.title}
      </span>
      {state === 'winner' && (
        <span className="text-[#E50914] text-xs font-bold tracking-wide">PREFERRED ✓</span>
      )}
    </button>
  )
}

export default function ComparisonModal({ newMovie, onClose }) {
  const { ratedMovies, recordComparison } = useAuth()

  const [round, setRound] = useState(0)
  // Local Elo for the newMovie so we can pick smarter next opponents
  const [localElo, setLocalElo] = useState(ratedMovies[newMovie.id]?.elo ?? BASE_ELO)
  const [usedIds, setUsedIds] = useState(new Set())
  const [opponent, setOpponent] = useState(() =>
    pickOpponent(ratedMovies, newMovie.id, BASE_ELO, new Set())
  )
  const [chosenId, setChosenId] = useState(null) // null = idle, id = animating

  const handlePick = useCallback(async (pickedId) => {
    if (chosenId !== null) return // already animating
    setChosenId(pickedId)

    const aWins = pickedId === newMovie.id
    const { newEloA } = updateElos(localElo, opponent.elo, aWins)
    recordComparison(
      aWins ? newMovie.id : opponent.id,
      aWins ? opponent.id : newMovie.id,
    )
    const nextLocalElo = aWins ? newEloA : localElo + (newEloA - localElo) * -1 // loser elo

    // Let animation play
    await new Promise(r => setTimeout(r, 480))

    const nextRound = round + 1
    if (nextRound >= MAX_ROUNDS) { onClose(); return }

    const nextUsed = new Set([...usedIds, opponent.id])
    const nextOpponent = pickOpponent(ratedMovies, newMovie.id, nextLocalElo, nextUsed)
    if (!nextOpponent) { onClose(); return }

    setRound(nextRound)
    setLocalElo(nextLocalElo)
    setUsedIds(nextUsed)
    setOpponent(nextOpponent)
    setChosenId(null)
  }, [chosenId, localElo, newMovie, opponent, round, usedIds, ratedMovies, recordComparison, onClose])

  if (!opponent) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]/97 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-10 pb-2 flex-shrink-0">
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          Skip
        </button>
        <div className="text-center">
          <p className="text-white font-bold text-base">Which did you prefer?</p>
          <p className="text-gray-500 text-xs mt-0.5">Tap to choose</p>
        </div>
        <span className="text-gray-600 text-sm w-10 text-right">{round + 1}/{MAX_ROUNDS}</span>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5 px-5 py-3 flex-shrink-0">
        {Array.from({ length: MAX_ROUNDS }, (_, i) => (
          <div
            key={i}
            className={`flex-1 h-0.5 rounded-full transition-colors duration-300 ${
              i < round ? 'bg-[#E50914]' : i === round ? 'bg-white' : 'bg-white/15'
            }`}
          />
        ))}
      </div>

      {/* Choices */}
      <div className="flex-1 flex items-center gap-3 px-4 py-2 min-h-0">
        <MovieChoice
          movie={newMovie}
          state={chosenId === null ? 'idle' : chosenId === newMovie.id ? 'winner' : 'loser'}
          onClick={() => handlePick(newMovie.id)}
        />

        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <span className="text-gray-600 text-xs font-medium">VS</span>
        </div>

        <MovieChoice
          movie={opponent}
          state={chosenId === null ? 'idle' : chosenId === opponent.id ? 'winner' : 'loser'}
          onClick={() => handlePick(opponent.id)}
        />
      </div>

      <p className="text-center text-gray-700 text-[10px] pb-6 flex-shrink-0">
        Your answer shapes your personal rankings
      </p>
    </div>
  )
}
