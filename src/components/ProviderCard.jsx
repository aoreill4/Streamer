import { useState } from 'react'
import { IMG_BASE } from '../lib/tmdb.js'

function flagEmoji(code) {
  return code
    .toUpperCase()
    .replace(/./g, (c) =>
      String.fromCodePoint(0x1f1e0 - 65 + c.charCodeAt(0))
    )
}

const VISIBLE_LIMIT = 15

export default function ProviderCard({ name, logoPath, countries }) {
  const [showAll, setShowAll] = useState(false)

  const visible = showAll ? countries : countries.slice(0, VISIBLE_LIMIT)
  const remaining = countries.length - VISIBLE_LIMIT

  return (
    <div className="bg-[#1f1f1f] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {logoPath ? (
          <img
            src={`${IMG_BASE}/w92${logoPath}`}
            alt={name}
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-[#2a2a2a] flex-shrink-0" />
        )}
        <span className="text-white font-semibold text-sm leading-tight">
          {name}
        </span>
      </div>

      {countries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visible.map(({ code, name: countryName }) => (
            <span
              key={code}
              className="text-gray-400 text-xs bg-[#2a2a2a] px-2 py-0.5 rounded-full whitespace-nowrap"
            >
              {flagEmoji(code)} {countryName}
            </span>
          ))}
          {!showAll && remaining > 0 && (
            <button
              onClick={() => setShowAll(true)}
              className="text-xs text-[#E50914] hover:text-[#f6121d] bg-[#2a2a2a] px-2 py-0.5 rounded-full transition-colors duration-150"
            >
              +{remaining} more
            </button>
          )}
          {showAll && countries.length > VISIBLE_LIMIT && (
            <button
              onClick={() => setShowAll(false)}
              className="text-xs text-gray-500 hover:text-gray-300 bg-[#2a2a2a] px-2 py-0.5 rounded-full transition-colors duration-150"
            >
              Show less
            </button>
          )}
        </div>
      )}
    </div>
  )
}
