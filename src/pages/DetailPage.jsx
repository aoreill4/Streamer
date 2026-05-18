import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMovieDetails, getWatchProviders, getMovieVideos, getMovieCredits, IMG_BASE } from '../lib/tmdb.js'
import ProviderCard from '../components/ProviderCard.jsx'
import Toggle from '../components/Toggle.jsx'
import TrailerModal from '../components/TrailerModal.jsx'
import { Link } from 'react-router-dom'

const COUNTRY_NAMES = {
  AD: 'Andorra', AE: 'UAE', AG: 'Antigua', AL: 'Albania', AO: 'Angola',
  AR: 'Argentina', AT: 'Austria', AU: 'Australia', AZ: 'Azerbaijan',
  BA: 'Bosnia', BB: 'Barbados', BE: 'Belgium', BF: 'Burkina Faso',
  BG: 'Bulgaria', BH: 'Bahrain', BM: 'Bermuda', BO: 'Bolivia',
  BR: 'Brazil', BS: 'Bahamas', BZ: 'Belize', CA: 'Canada',
  CH: 'Switzerland', CI: "Côte d'Ivoire", CL: 'Chile', CM: 'Cameroon',
  CO: 'Colombia', CR: 'Costa Rica', CU: 'Cuba', CV: 'Cape Verde',
  CZ: 'Czechia', DE: 'Germany', DK: 'Denmark', DO: 'Dominican Rep.',
  DZ: 'Algeria', EC: 'Ecuador', EE: 'Estonia', EG: 'Egypt',
  ES: 'Spain', FI: 'Finland', FJ: 'Fiji', FR: 'France',
  GB: 'United Kingdom', GF: 'French Guiana', GH: 'Ghana', GI: 'Gibraltar',
  GP: 'Guadeloupe', GQ: 'Eq. Guinea', GR: 'Greece', GT: 'Guatemala',
  GY: 'Guyana', HK: 'Hong Kong', HN: 'Honduras', HR: 'Croatia',
  HU: 'Hungary', ID: 'Indonesia', IE: 'Ireland', IL: 'Israel',
  IN: 'India', IQ: 'Iraq', IS: 'Iceland', IT: 'Italy',
  JM: 'Jamaica', JO: 'Jordan', JP: 'Japan', KE: 'Kenya',
  KR: 'South Korea', KW: 'Kuwait', LB: 'Lebanon', LC: 'St. Lucia',
  LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg', LV: 'Latvia',
  LY: 'Libya', MA: 'Morocco', MC: 'Monaco', MD: 'Moldova',
  ME: 'Montenegro', MK: 'North Macedonia', ML: 'Mali', MT: 'Malta',
  MU: 'Mauritius', MX: 'Mexico', MY: 'Malaysia', MZ: 'Mozambique',
  NE: 'Niger', NG: 'Nigeria', NI: 'Nicaragua', NL: 'Netherlands',
  NO: 'Norway', NZ: 'New Zealand', OM: 'Oman', PA: 'Panama',
  PE: 'Peru', PH: 'Philippines', PK: 'Pakistan', PL: 'Poland',
  PS: 'Palestine', PT: 'Portugal', PY: 'Paraguay', QA: 'Qatar',
  RO: 'Romania', RS: 'Serbia', RU: 'Russia', SA: 'Saudi Arabia',
  SC: 'Seychelles', SE: 'Sweden', SG: 'Singapore', SI: 'Slovenia',
  SK: 'Slovakia', SN: 'Senegal', SV: 'El Salvador', TC: 'Turks & Caicos',
  TH: 'Thailand', TN: 'Tunisia', TR: 'Turkey', TT: 'Trinidad & Tobago',
  TW: 'Taiwan', TZ: 'Tanzania', UA: 'Ukraine', UG: 'Uganda',
  US: 'United States', UY: 'Uruguay', VE: 'Venezuela', YE: 'Yemen',
  ZA: 'South Africa', ZM: 'Zambia', ZW: 'Zimbabwe',
}

const TOGGLE_OPTIONS = [
  { value: 'flatrate', label: 'Stream' },
  { value: 'rent', label: 'Rent' },
  { value: 'buy', label: 'Buy' },
]

function transformProviders(results) {
  // results: { "US": { flatrate: [...], rent: [...], buy: [...] }, ... }
  const map = {} // keyed by provider_id

  for (const [countryCode, types] of Object.entries(results)) {
    const countryName = COUNTRY_NAMES[countryCode] || countryCode

    for (const type of ['flatrate', 'rent', 'buy']) {
      const providers = types[type] || []
      for (const p of providers) {
        if (!map[p.provider_id]) {
          map[p.provider_id] = {
            provider_id: p.provider_id,
            name: p.provider_name,
            logo_path: p.logo_path,
            countries: { flatrate: [], rent: [], buy: [] },
          }
        }
        map[p.provider_id].countries[type].push({ code: countryCode, name: countryName })
      }
    }
  }

  // Sort each country list alphabetically by name
  for (const entry of Object.values(map)) {
    for (const type of ['flatrate', 'rent', 'buy']) {
      entry.countries[type].sort((a, b) => a.name.localeCompare(b.name))
    }
  }

  return Object.values(map).sort((a, b) => a.name.localeCompare(b.name))
}

function runtime(minutes) {
  if (!minutes) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function DetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [movie, setMovie] = useState(null)
  const [providers, setProviders] = useState([])
  const [trailer, setTrailer] = useState(null)
  const [showTrailer, setShowTrailer] = useState(false)
  const [credits, setCredits] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeType, setActiveType] = useState('flatrate')
  const [myServices, setMyServices] = useState(() => {
    try { return JSON.parse(localStorage.getItem('myServices') || '[]') } catch { return [] }
  })
  const [filterMine, setFilterMine] = useState(false)

  function toggleMyService(providerId) {
    setMyServices(prev => {
      const next = prev.includes(providerId)
        ? prev.filter(id => id !== providerId)
        : [...prev, providerId]
      localStorage.setItem('myServices', JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    setLoading(true)
    setError(null)
    setTrailer(null)
    setShowTrailer(false)
    setCredits(null)

    Promise.all([getMovieDetails(id), getWatchProviders(id), getMovieVideos(id), getMovieCredits(id)])
      .then(([movieData, providerData, videoData, creditsData]) => {
        setMovie(movieData)
        const results = providerData.results || {}
        setProviders(transformProviders(results))
        const videos = videoData.results || []
        const pick =
          videos.find(v => v.type === 'Trailer' && v.site === 'YouTube' && v.official) ||
          videos.find(v => v.type === 'Trailer' && v.site === 'YouTube') ||
          videos.find(v => v.site === 'YouTube')
        setTrailer(pick || null)
        setCredits(creditsData)
      })
      .catch((err) => setError(err.message || 'Failed to load movie data.'))
      .finally(() => setLoading(false))
  }, [id])

  const activeProviders = providers.filter(p => p.countries[activeType].length > 0)
  const visibleProviders = filterMine && myServices.length > 0
    ? activeProviders.filter(p => myServices.includes(p.provider_id))
    : activeProviders

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-700 border-t-[#E50914] rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-red-400 text-center">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Go back
        </button>
      </div>
    )
  }

  const year = movie?.release_date?.slice(0, 4)
  const backdropUrl = movie?.backdrop_path
    ? `${IMG_BASE}/w1280${movie.backdrop_path}`
    : null

  return (
    <div className="min-h-screen">
      {/* Back button */}
      <div className="px-4 sm:px-8 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-1"
        >
          ← Back to search
        </button>
      </div>

      {/* Backdrop banner */}
      <div className="relative mt-4 w-full" style={{ minHeight: '320px' }}>
        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt={movie.title}
            className="w-full object-cover"
            style={{ maxHeight: '420px', objectPosition: 'center 20%' }}
          />
        ) : (
          <div className="w-full bg-[#1a1a1a]" style={{ height: '320px' }} />
        )}
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgba(20,20,20,0.1) 0%, rgba(20,20,20,0.6) 50%, rgba(20,20,20,1) 100%)',
          }}
        />
        {/* Movie info overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-6">
          <div className="max-w-7xl mx-auto flex gap-5 items-end">
            {movie?.poster_path && (
              <img
                src={`${IMG_BASE}/w185${movie.poster_path}`}
                alt={movie.title}
                className="hidden sm:block w-24 rounded-lg shadow-2xl flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-4xl font-bold text-white leading-tight truncate">
                {movie?.title}
              </h1>
              <div className="flex items-center gap-3 mt-1 text-gray-400 text-sm">
                {year && <span>{year}</span>}
                {runtime(movie?.runtime) && (
                  <>
                    <span className="text-gray-600">·</span>
                    <span>{runtime(movie.runtime)}</span>
                  </>
                )}
                {movie?.vote_average > 0 && (
                  <>
                    <span className="text-gray-600">·</span>
                    <span>★ {movie.vote_average.toFixed(1)}</span>
                  </>
                )}
              </div>
              {movie?.overview && (
                <p className="mt-2 text-gray-300 text-sm leading-relaxed line-clamp-3 max-w-2xl">
                  {movie.overview}
                </p>
              )}
              {trailer && (
                <button
                  onClick={() => setShowTrailer(true)}
                  className="mt-3 inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur text-white text-sm font-medium px-4 py-2 rounded-full transition-colors duration-200"
                >
                  <span className="text-[#E50914]">▶</span> Watch Trailer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showTrailer && trailer && (
        <TrailerModal trailerKey={trailer.key} onClose={() => setShowTrailer(false)} />
      )}

      {/* Credits section */}
      {credits && (() => {
        const director = credits.crew?.find(c => c.job === 'Director')
        const writers = credits.crew?.filter(c => c.job === 'Screenplay' || c.job === 'Writer').slice(0, 2)
        const cast = credits.cast?.slice(0, 12) || []
        return (
          <div className="px-4 sm:px-8 pt-5 pb-2 max-w-7xl mx-auto border-b border-white/5">
            <div className="flex flex-wrap gap-x-6 gap-y-1 mb-4 text-sm">
              {director && (
                <span className="text-gray-500">
                  Directed by{' '}
                  <Link to={`/person/${director.id}`} className="text-white hover:text-[#E50914] transition-colors font-medium">
                    {director.name}
                  </Link>
                </span>
              )}
              {writers?.length > 0 && (
                <span className="text-gray-500">
                  Written by{' '}
                  {writers.map((w, i) => (
                    <span key={w.id}>
                      <Link to={`/person/${w.id}`} className="text-white hover:text-[#E50914] transition-colors font-medium">
                        {w.name}
                      </Link>
                      {i < writers.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              )}
            </div>
            {cast.length > 0 && (
              <div
                className="flex gap-4 overflow-x-auto pb-4"
                style={{ scrollbarWidth: 'thin' }}
              >
                {cast.map(person => (
                  <Link
                    key={`${person.id}-${person.cast_id}`}
                    to={`/person/${person.id}`}
                    className="flex-shrink-0 w-16 text-center group"
                  >
                    {person.profile_path ? (
                      <img
                        src={`${IMG_BASE}/w185${person.profile_path}`}
                        alt={person.name}
                        className="w-16 h-16 rounded-full object-cover object-top mx-auto group-hover:ring-2 ring-[#E50914] transition-all duration-200"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[#2a2a2a] mx-auto flex items-center justify-center text-gray-600 text-2xl group-hover:ring-2 ring-[#E50914] transition-all duration-200">
                        ?
                      </div>
                    )}
                    <p className="text-white text-xs mt-2 leading-tight line-clamp-2 group-hover:text-[#E50914] transition-colors">{person.name}</p>
                    <p className="text-gray-600 text-xs mt-0.5 line-clamp-1">{person.character}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Providers section */}
      <div className="px-4 sm:px-8 pb-16 max-w-7xl mx-auto">
        <div className="mt-6 flex items-center gap-3 flex-wrap">
          <Toggle options={TOGGLE_OPTIONS} value={activeType} onChange={setActiveType} />
          {activeProviders.length > 0 && (
            <button
              onClick={() => setFilterMine(f => !f)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors duration-200 ${
                filterMine
                  ? 'bg-[#E50914] border-[#E50914] text-white'
                  : 'border-white/20 text-gray-400 hover:text-white hover:border-white/40'
              }`}
            >
              {filterMine ? '★ My Services' : '☆ My Services'}
            </button>
          )}
          {providers.length > 0 && (
            <span className="text-gray-500 text-sm ml-auto">
              {visibleProviders.length} service{visibleProviders.length !== 1 ? 's' : ''}
              {filterMine && myServices.length > 0 ? ' (filtered)' : ' available'}
            </span>
          )}
        </div>
        {filterMine && myServices.length === 0 && (
          <p className="mt-2 text-xs text-gray-600">
            Pin services by clicking the ★ on any card below, then enable the filter.
          </p>
        )}

        {providers.length === 0 ? (
          <div className="mt-12 text-center py-16 text-gray-500">
            <p className="text-lg">No streaming data available for this title.</p>
            <p className="text-sm mt-2">TMDB may not have provider information for this movie yet.</p>
          </div>
        ) : visibleProviders.length === 0 ? (
          <div className="mt-12 text-center py-16 text-gray-500">
            <p className="text-lg">
              {filterMine
                ? 'None of your pinned services have this movie.'
                : `No ${activeType === 'flatrate' ? 'subscription streaming' : activeType} options found.`}
            </p>
            <p className="text-sm mt-2">
              {filterMine ? 'Turn off the filter to see all available services.' : 'Try switching to Rent or Buy above.'}
            </p>
          </div>
        ) : (
          <div
            className="mt-6 grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
          >
            {visibleProviders.map((p) => (
              <ProviderCard
                key={p.provider_id}
                name={p.name}
                logoPath={p.logo_path}
                countries={p.countries[activeType]}
                pinned={myServices.includes(p.provider_id)}
                onTogglePin={() => toggleMyService(p.provider_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
