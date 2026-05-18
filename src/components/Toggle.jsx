export default function Toggle({ options, value, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-[#1f1f1f] p-1 rounded-xl w-fit">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
            value === opt.value
              ? 'bg-[#E50914] text-white'
              : 'bg-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
