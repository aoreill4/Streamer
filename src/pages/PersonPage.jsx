import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPersonDetails, getPersonMovieCredits, IMG_BASE } from '../lib/tmdb.js'
import MovieCard from '../components/MovieCard.jsx'

function age(birthday, deathday) {
  if (!birthday) return null
  const end = deathday ? new Date(deathday) : new Date()
  const born = new Date(birthday)
  const years = end.getFullYear() - born.getFullYear()
  const hadBirthday =
    end.getMonth() > born.getMonth() ||
    (end.getMonth() === born.getMonth() && end.getDate() >= born.getDate())
  return hadBirthday ? years : years - 1
}

export default function PersonPage() {
  const { id } = useParams()
  const [person, setPerson] = useState(null)
  const [actingMovies, setActingMovies] = useState([])
  const [directedMovies, setDirectedMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState(null) // 'acting' | 'directing'
  const [sort, setSort] = useState('newest') // 'newest' | 'oldest' | 'popular' | 'rated'
  const [bioExpanded, setBioExpanded] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([getPersonDetails(id), getPersonMovieCredits(id)])
      .then(([personData, creditsData]) => {
        setPerson(personData)

        const acting = (creditsData.cast || [])
          .filter(m => m.poster_path && m.release_date)
          .sort((a, b) => new Date(b.release_date) - new Date(a.release_date))
        setActingMovies(acting)

        const directing = (creditsData.crew || [])
          .filter(m => m.job === 'Director' && m.poster_path && m.release_date)
          .sort((a, b) => new Date(b.release_date) - new Date(a.release_date))
        setDirectedMovies(directing)

        setTab(directing.length > 0 && personData.known_for_department === 'Directing'
          ? 'directing'
          : 'acting')
      })
      .catch(err => setError(err.message || 'Failed to load person.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-700 border-t-[#E50914] rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !person) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error || 'Person not found.'}</p>
        <Link to="/" className="text-sm text-gray-400 hover:text-white transition-colors">← Home</Link>
      </div>
    )
  }

  const personAge = age(person.birthday, person.deathday)
  const BIO_LIMIT = 300

  const base = tab === 'directing' ? directedMovies : actingMovies
  const movies = [...base].sort((a, b) => {
    if (sort === 'newest') return new Date(b.release_date) - new Date(a.release_date)
    if (sort === 'oldest') return new Date(a.release_date) - new Date(b.release_date)
    if (sort === 'popular') return (b.popularity || 0) - (a.popularity || 0)
    if (sort === 'rated') return (b.vote_average || 0) - (a.vote_average || 0)
    return 0
  })

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <div className="px-4 sm:px-8 pt-6 pb-2">
        <Link to="/" className="text-sm text-gray-400 hover:text-white transition-colors">← Back</Link>
      </div>

      {/* Person header */}
      <div className="px-4 sm:px-8 py-6 max-w-7xl mx-auto">
        <div className="flex gap-6 items-start">
          {person.profile_path ? (
            <img
              src={`${IMG_BASE}/w342${person.profile_path}`}
              alt={person.name}
              className="w-28 sm:w-40 rounded-xl object-cover flex-shrink-0 shadow-2xl"
            />
          ) : (
            <div className="w-28 sm:w-40 aspect-[2/3] rounded-xl bg-[#1f1f1f] flex items-center justify-center text-gray-600 text-5xl flex-shrink-0">
              ?
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{person.name}</h1>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-400">
              {person.known_for_department && (
                <span className="bg-[#1f1f1f] px-2 py-0.5 rounded text-xs text-gray-300">
                  {person.known_for_department}
                </span>
              )}
              {person.birthday && (
                <span>
                  Born {new Date(person.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  {personAge && !person.deathday ? ` (age ${personAge})` : ''}
                </span>
              )}
              {person.deathday && (
                <span>
                  Died {new Date(person.deathday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  {personAge ? ` (age ${personAge})` : ''}
                </span>
              )}
              {person.place_of_birth && <span>{person.place_of_birth}</span>}
            </div>

            {person.biography && (
              <div className="mt-3">
                <p className="text-gray-400 text-sm leading-relaxed">
                  {bioExpanded || person.biography.length <= BIO_LIMIT
                    ? person.biography
                    : person.biography.slice(0, BIO_LIMIT) + '…'}
                </p>
                {person.biography.length > BIO_LIMIT && (
                  <button
                    onClick={() => setBioExpanded(e => !e)}
                    className="text-xs text-[#E50914] hover:text-[#f6121d] mt-1 transition-colors"
                  >
                    {bioExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filmography */}
      <div className="px-4 sm:px-8 pb-16 max-w-7xl mx-auto">
        {/* Tabs + sort row */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {actingMovies.length > 0 && directedMovies.length > 0 && (
            <div className="flex gap-2 mr-auto">
              {['acting', 'directing'].map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setSort('newest') }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
                    tab === t
                      ? 'bg-[#E50914] text-white'
                      : 'bg-[#1f1f1f] text-gray-400 hover:text-white'
                  }`}
                >
                  {t === 'acting' ? `Acting (${actingMovies.length})` : `Directing (${directedMovies.length})`}
                </button>
              ))}
            </div>
          )}

          {/* Sort controls */}
          <div className="flex gap-1 bg-[#1a1a1a] p-1 rounded-lg ml-auto">
            {[
              { key: 'newest', label: 'Newest' },
              { key: 'oldest', label: 'Oldest' },
              { key: 'popular', label: 'Popular' },
              { key: 'rated', label: 'Top Rated' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  sort === key ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {movies.length === 0 ? (
          <p className="text-gray-500 text-sm py-12 text-center">No movies found.</p>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-4">
              {movies.length} movie{movies.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
              {movies.map(movie => (
                <MovieCard key={`${movie.id}-${movie.credit_id}`} movie={movie} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
