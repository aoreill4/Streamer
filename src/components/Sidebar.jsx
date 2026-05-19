import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// ── SVG icons ──────────────────────────────────────────────────────────────
function HomeIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function ReelsIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
    </svg>
  )
}

function PersonIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

const NAV_ITEMS = [
  { to: '/', label: 'Home', Icon: HomeIcon },
  { to: '/reels', label: 'Reels', Icon: ReelsIcon },
  { to: '/profile', label: 'Profile', Icon: PersonIcon },
]

function NavLink({ to, label, Icon, active }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
        active
          ? 'text-[#E50914] bg-[#E50914]/10'
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span>{label}</span>
    </Link>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()

  function isActive(to) {
    if (to === '/') return location.pathname === '/'
    return location.pathname.startsWith(to)
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[220px] bg-[#0a0a0a] border-r border-white/5 flex-col z-30">
        {/* Logo */}
        <div className="px-5 py-6">
          <span className="text-[#E50914] text-xl font-black tracking-tight">Streamer</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} label={label} Icon={Icon} active={isActive(to)} />
          ))}
        </nav>

        {/* User info + logout */}
        {user && (
          <div className="px-4 py-5 border-t border-white/5">
            <p className="text-white text-xs font-semibold truncate">{user.name}</p>
            <p className="text-gray-500 text-xs truncate mt-0.5">{user.email}</p>
            <button
              onClick={logout}
              className="mt-3 text-gray-500 hover:text-[#E50914] text-xs transition-colors"
            >
              Log out
            </button>
          </div>
        )}
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0a0a0a]/95 backdrop-blur border-t border-white/5 flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ to, label, Icon }) => {
          const active = isActive(to)
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-colors duration-150 ${
                active ? 'text-[#E50914]' : 'text-gray-500 hover:text-white'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
