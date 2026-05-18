import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMovieDetails, getWatchProviders, IMG_BASE } from '../lib/tmdb.js'
import ProviderCard from '../components/ProviderCard.jsx'
import Toggle from '../components/Toggle.jsx'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeType, setActiveType] = useState('flatrate')

  useEffect(() => {
    setLoading(true)
    setError(null)

    Promise.all([getMovieDetails(id), getWatchProviders(id)])
      .then(([movieData, providerData]) => {
        setMovie(movieData)
        const results = providerData.results || {}
        setProviders(transformProviders(results))
      })
      .catch((err) => setError(err.message || 'Failed to load movie data.'))
      .finally(() => setLoading(false))
  }, [id])

  const visibleProviders = providers.filter(
    (p) => p.countries[activeType].length > 0
  )

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
            </div>
          </div>
        </div>
      </div>

      {/* Providers section */}
      <div className="px-4 sm:px-8 pb-16 max-w-7xl mx-auto">
        <div className="mt-6 flex items-center gap-4 flex-wrap">
          <Toggle options={TOGGLE_OPTIONS} value={activeType} onChange={setActiveType} />
          {providers.length > 0 && (
            <span className="text-gray-500 text-sm">
              {visibleProviders.length} service{visibleProviders.length !== 1 ? 's' : ''} available
            </span>
          )}
        </div>

        {providers.length === 0 ? (
          <div className="mt-12 text-center py-16 text-gray-500">
            <p className="text-lg">No streaming data available for this title.</p>
            <p className="text-sm mt-2">TMDB may not have provider information for this movie yet.</p>
          </div>
        ) : visibleProviders.length === 0 ? (
          <div className="mt-12 text-center py-16 text-gray-500">
            <p className="text-lg">
              No {activeType === 'flatrate' ? 'subscription streaming' : activeType} options found.
            </p>
            <p className="text-sm mt-2">Try switching to Rent or Buy above.</p>
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
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
