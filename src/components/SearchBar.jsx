import { useState, useEffect, useRef, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchMulti, IMG_BASE } from '../lib/tmdb.js'

export default function SearchBar({ value, onChange, onSearch, loading }) {
  const [suggestions, setSuggestions] = useState([]) // flat list: { _type, ...item }
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim() || value.trim().length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchMulti(value.trim(), 1)
        const all = data.results || []

        const movies = all
          .filter(r => r.media_type === 'movie' && r.poster_path)
          .slice(0, 5)
          .map(r => ({ ...r, _type: 'movie' }))

        // Directors first, then actors — max 4 people total
        const people = all.filter(r => r.media_type === 'person')
        const directors = people
          .filter(p => p.known_for_department === 'Directing')
          .slice(0, 2)
          .map(p => ({ ...p, _type: 'person' }))
        const actors = people
          .filter(p => p.known_for_department !== 'Directing')
          .slice(0, 4 - directors.length)
          .map(p => ({ ...p, _type: 'person' }))

        setSuggestions([...movies, ...directors, ...actors])
        setOpen(true)
        setActive(-1)
      } catch {
        setSuggestions([])
      }
    }, 280)
    return () => clearTimeout(debounceRef.current)
  }, [value])

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(prev => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter') {
      if (active >= 0 && suggestions[active]) {
        pick(suggestions[active])
      } else {
        setOpen(false)
        onSearch()
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function pick(item) {
    setOpen(false)
    setSuggestions([])
    if (item._type === 'person') {
      navigate(`/person/${item.id}`)
    } else {
      navigate(`/movie/${item.id}`)
    }
  }

  // Find where people section starts for rendering a divider
  const firstPersonIdx = suggestions.findIndex(s => s._type === 'person')

  return (
    <div ref={wrapperRef} className="relative flex items-center w-full max-w-2xl gap-2">
      <div className="relative flex-1">
        <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Search movies, directors, actors…"
          className="w-full bg-[#1f1f1f] text-white placeholder-gray-500 rounded-lg pl-10 pr-4 py-3 text-sm outline-none border border-transparent focus:border-[#E50914] transition-colors duration-200"
          disabled={loading}
          aria-label="Search movies, directors, actors"
          autoComplete="off"
        />

        {open && suggestions.length > 0 && (
          <ul className="absolute top-full left-0 right-0 mt-1 bg-[#1f1f1f] border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl">
            {firstPersonIdx !== 0 && (
              <li className="px-3 pt-2 pb-1">
                <span className="text-gray-600 text-[10px] font-semibold uppercase tracking-wider">Movies</span>
              </li>
            )}
            {suggestions.map((item, i) => (
              <Fragment key={item.id + item._type}>
                {i === firstPersonIdx && firstPersonIdx > 0 && (
                  <li className="px-3 pt-2 pb-1 border-t border-white/6">
                    <span className="text-gray-600 text-[10px] font-semibold uppercase tracking-wider">People</span>
                  </li>
                )}
                <li
                  onMouseDown={() => pick(item)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors duration-100 ${
                    active === i ? 'bg-[#2a2a2a]' : 'hover:bg-[#2a2a2a]'
                  }`}
                >
                  {item._type === 'movie' ? (
                    <>
                      {item.poster_path ? (
                        <img src={`${IMG_BASE}/w92${item.poster_path}`} alt="" className="w-8 h-12 object-cover rounded flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-12 bg-[#333] rounded flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{item.title}</p>
                        {item.release_date && <p className="text-gray-500 text-xs">{item.release_date.slice(0, 4)}</p>}
                      </div>
                    </>
                  ) : (
                    <>
                      {item.profile_path ? (
                        <img src={`${IMG_BASE}/w92${item.profile_path}`} alt="" className="w-8 h-8 rounded-full object-cover object-top flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center flex-shrink-0 text-gray-500 text-xs">?</div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{item.name}</p>
                        <p className="text-gray-500 text-xs">{item.known_for_department || 'Actor'}</p>
                      </div>
                    </>
                  )}
                </li>
              </Fragment>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={() => { setOpen(false); onSearch() }}
        disabled={loading || !value.trim()}
        className="bg-[#E50914] hover:bg-[#f6121d] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 rounded-lg text-sm transition-colors duration-200 whitespace-nowrap"
      >
        {loading ? 'Searching…' : 'Search'}
      </button>
    </div>
  )
}
