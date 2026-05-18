export default function SearchBar({ value, onChange, onSearch, loading }) {
  function handleKeyDown(e) {
    if (e.key === 'Enter') onSearch()
  }

  return (
    <div className="flex items-center w-full max-w-2xl gap-2">
      <div className="relative flex-1">
        <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search for a movie…"
          className="w-full bg-[#1f1f1f] text-white placeholder-gray-500 rounded-lg pl-10 pr-4 py-3 text-sm outline-none border border-transparent focus:border-[#E50914] transition-colors duration-200"
          disabled={loading}
          aria-label="Search movies"
        />
      </div>
      <button
        onClick={onSearch}
        disabled={loading || !value.trim()}
        className="bg-[#E50914] hover:bg-[#f6121d] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 rounded-lg text-sm transition-colors duration-200 whitespace-nowrap"
      >
        {loading ? 'Searching…' : 'Search'}
      </button>
    </div>
  )
}
