import { useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { BASE_ELO, updateElos, pickOpponent } from '../lib/elo.js'
import { IMG_BASE } from '../lib/tmdb.js'

const MAX_ROUNDS = 3

function MovieChoice({ movie, state, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={state !== 'idle'}
      className={`flex-1 flex flex-col gap-2 border-2 rounded-2xl p-2.5 transition-all duration-250 cursor-pointer select-none ${
        state === 'winner'
          ? 'border-[#E50914] shadow-[0_0_0_3px_rgba(229,9,20,.25)] -translate-y-1'
          : state === 'loser'
            ? 'border-transparent opacity-20 scale-95'
            : 'border-white/8 hover:-translate-y-0.5 hover:border-white/25 active:scale-[0.97] bg-black/20'
      }`}
    >
      {movie.poster_path ? (
        <img
          src={`${IMG_BASE}/w342${movie.poster_path}`}
          alt={movie.title}
          className="w-full rounded-xl object-cover"
          style={{ aspectRatio: '2/3' }}
          draggable={false}
        />
      ) : (
        <div
          className="w-full rounded-xl bg-[#2a2a2a] flex items-center justify-center p-3"
          style={{ aspectRatio: '2/3' }}
        >
          <span className="text-gray-400 text-[10px] text-center leading-snug">{movie.title}</span>
        </div>
      )}
      <span className="text-white text-xs font-semibold text-center leading-tight line-clamp-2 px-1">
        {movie.title}
      </span>
    </button>
  )
}

export default function ComparisonModal({ newMovie, onClose }) {
  const { ratedMovies, recordComparison } = useAuth()

  const [round, setRound] = useState(0)
  const [localElo, setLocalElo] = useState(ratedMovies[newMovie.id]?.elo ?? BASE_ELO)
  const [usedIds, setUsedIds] = useState(new Set())
  const [opponent, setOpponent] = useState(() =>
    pickOpponent(ratedMovies, newMovie.id, BASE_ELO, new Set())
  )
  const [chosenId, setChosenId] = useState(null)

  const handlePick = useCallback(async (pickedId) => {
    if (chosenId !== null) return
    setChosenId(pickedId)

    const aWins = pickedId === newMovie.id
    const { newEloA } = updateElos(localElo, opponent.elo, aWins)
    recordComparison(
      aWins ? newMovie.id : opponent.id,
      aWins ? opponent.id : newMovie.id,
    )
    const nextLocalElo = aWins ? newEloA : localElo - (newEloA - localElo)

    await new Promise(r => setTimeout(r, 420))

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Card */}
      <div
        className="bg-[#1c1c1e] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/8"
        style={{ animation: 'compPop .28s cubic-bezier(.175,.885,.32,1.275) both' }}
      >
        <style>{`@keyframes compPop { from { transform: scale(.88) translateY(16px); opacity:0 } to { transform: scale(1) translateY(0); opacity:1 } }`}</style>

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex gap-1">
            {Array.from({ length: MAX_ROUNDS }, (_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i < round ? 'bg-[#E50914] w-6' : i === round ? 'bg-white w-6' : 'bg-white/15 w-6'
                }`}
              />
            ))}
          </div>
          <span className="text-white font-bold text-sm">Which did you prefer?</span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Movie choices */}
        <div className="flex gap-3 px-4 pb-2">
          <MovieChoice
            movie={newMovie}
            state={chosenId === null ? 'idle' : chosenId === newMovie.id ? 'winner' : 'loser'}
            onClick={() => handlePick(newMovie.id)}
          />

          <div className="flex items-center flex-shrink-0">
            <span className="text-gray-700 text-[10px] font-black tracking-widest">VS</span>
          </div>

          <MovieChoice
            movie={opponent}
            state={chosenId === null ? 'idle' : chosenId === opponent.id ? 'winner' : 'loser'}
            onClick={() => handlePick(opponent.id)}
          />
        </div>

        <p className="text-center text-gray-600 text-[10px] py-3">
          Tap a movie to choose · shapes your personal rankings
        </p>
      </div>
    </div>
  )
}
