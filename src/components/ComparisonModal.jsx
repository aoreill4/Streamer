import { useState, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { IMG_BASE } from '../lib/tmdb.js'

// Binary search insertion: ceil(log2(N+1)) comparisons to place a movie
// among N already-ranked movies. Freezes sorted list at mount so mid-session
// Elo updates don't shift the search space.

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

  // Freeze sorted ranked list at mount — binary search must not shift mid-session
  const rankedRef = useRef(
    Object.values(ratedMovies)
      .filter(m => m.id !== newMovie.id && (m.comparisons || 0) > 0)
      .sort((a, b) => b.elo - a.elo)
  )
  const ranked = rankedRef.current
  const total = ranked.length

  // Binary search bounds: new movie belongs at index in [lo, hi)
  const [lo, setLo] = useState(0)
  const [hi, setHi] = useState(total)
  const [chosenId, setChosenId] = useState(null)

  if (total === 0) { onClose(); return null }

  const midIdx = Math.floor((lo + hi) / 2)
  const opponent = ranked[midIdx]

  // How many comparisons remain: ceil(log2(range))
  const rangeSize = hi - lo
  const stepsLeft = rangeSize > 1 ? Math.ceil(Math.log2(rangeSize)) : 1
  const totalSteps = Math.ceil(Math.log2(total + 1))
  const stepsDone = totalSteps - stepsLeft
  const progress = Math.max(0, Math.min(1, stepsDone / totalSteps))

  const handlePick = useCallback(async (pickedId) => {
    if (chosenId !== null) return
    setChosenId(pickedId)

    const newMovieWon = pickedId === newMovie.id
    recordComparison(
      newMovieWon ? newMovie.id : opponent.id,
      newMovieWon ? opponent.id : newMovie.id,
    )

    await new Promise(r => setTimeout(r, 420))

    // Binary search: win → search upper half (better than mid), lose → lower half
    const newLo = newMovieWon ? lo : midIdx + 1
    const newHi = newMovieWon ? midIdx : hi

    if (newLo >= newHi) {
      onClose()
      return
    }

    setLo(newLo)
    setHi(newHi)
    setChosenId(null)
  }, [chosenId, lo, hi, midIdx, newMovie, opponent, recordComparison, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-[#1c1c1e] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/8"
        style={{ animation: 'compPop .28s cubic-bezier(.175,.885,.32,1.275) both' }}
      >
        <style>{`@keyframes compPop { from { transform: scale(.88) translateY(16px); opacity:0 } to { transform: scale(1) translateY(0); opacity:1 } }`}</style>

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="text-left">
            <p className="text-white font-bold text-sm">Which did you prefer?</p>
            <p className="text-gray-600 text-[10px] mt-0.5">
              {rangeSize <= 2
                ? 'Almost there — one more to place it'
                : `Narrowing from ${total} movie${total !== 1 ? 's' : ''} · ~${stepsLeft} left`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xs transition-colors ml-4 flex-shrink-0"
          >
            Skip
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-5 pb-3">
          <div className="h-1 bg-white/8 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E50914] rounded-full transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-gray-700 text-[9px]">#{lo + 1}</span>
            <span className="text-gray-500 text-[9px]">
              {lo + 1 === hi ? `Placing at #${lo + 1}` : `Could be #${lo + 1}–#${hi} of ${total}`}
            </span>
            <span className="text-gray-700 text-[9px]">#{hi}</span>
          </div>
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
          Tap to choose · answers shape your personal rankings
        </p>
      </div>
    </div>
  )
}
