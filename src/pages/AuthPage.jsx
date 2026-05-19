import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getWatchProvidersList } from '../lib/tmdb.js'
import { IMG_BASE } from '../lib/tmdb.js'

// ── VPN Toggle pill ────────────────────────────────────────────────────────
function VpnToggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        value ? 'bg-[#E50914]' : 'bg-[#3a3a3a]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ── Login step ─────────────────────────────────────────────────────────────
function LoginStep({ onSwitchToSignup }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    const result = login(email.trim(), password)
    setLoading(false)
    if (result.ok) {
      navigate('/', { replace: true })
    } else {
      setError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-gray-400 text-xs font-medium">Email</label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="bg-[#2a2a2a] border border-white/10 text-white rounded-lg px-4 py-3 text-sm focus:border-[#E50914] outline-none transition-colors"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-gray-400 text-xs font-medium">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          className="bg-[#2a2a2a] border border-white/10 text-white rounded-lg px-4 py-3 text-sm focus:border-[#E50914] outline-none transition-colors"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 bg-[#E50914] hover:bg-[#f6121d] disabled:opacity-60 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="text-center text-gray-500 text-sm">
        New here?{' '}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="text-[#E50914] hover:underline"
        >
          Create an account
        </button>
      </p>
    </form>
  )
}

// ── Signup step 1 ─────────────────────────────────────────────────────────
function SignupStep1({ onNext }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  function handleNext(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Name is required.'); return }
    if (!email.trim()) { setError('Email is required.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    onNext({ name: name.trim(), email: email.trim(), password })
  }

  return (
    <form onSubmit={handleNext} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-gray-400 text-xs font-medium">Name</label>
        <input
          type="text"
          autoComplete="name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          className="bg-[#2a2a2a] border border-white/10 text-white rounded-lg px-4 py-3 text-sm focus:border-[#E50914] outline-none transition-colors"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-gray-400 text-xs font-medium">Email</label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="bg-[#2a2a2a] border border-white/10 text-white rounded-lg px-4 py-3 text-sm focus:border-[#E50914] outline-none transition-colors"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-gray-400 text-xs font-medium">Password</label>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Min. 6 characters"
          className="bg-[#2a2a2a] border border-white/10 text-white rounded-lg px-4 py-3 text-sm focus:border-[#E50914] outline-none transition-colors"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-gray-400 text-xs font-medium">Confirm password</label>
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Repeat password"
          className="bg-[#2a2a2a] border border-white/10 text-white rounded-lg px-4 py-3 text-sm focus:border-[#E50914] outline-none transition-colors"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        className="mt-2 bg-[#E50914] hover:bg-[#f6121d] text-white font-semibold py-3 rounded-lg text-sm transition-colors"
      >
        Next →
      </button>
    </form>
  )
}

// ── Signup step 2 ─────────────────────────────────────────────────────────
function SignupStep2({ credentials, onSwitchToLogin }) {
  const { signup, updateUser } = useAuth()
  const navigate = useNavigate()
  const [providers, setProviders] = useState([])
  const [selected, setSelected] = useState([])
  const [hasVPN, setHasVPN] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getWatchProvidersList()
      .then(data => {
        const sorted = (data.results || [])
          .sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999))
        setProviders(sorted)
      })
      .catch(() => {})
  }, [])

  function toggleProvider(id) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleFinish(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = signup(credentials.name, credentials.email, credentials.password)
    if (!result.ok) {
      setLoading(false)
      setError(result.error)
      return
    }
    updateUser({ streamingServices: selected, hasVPN })
    setLoading(false)
    navigate('/', { replace: true })
  }

  return (
    <form onSubmit={handleFinish} className="flex flex-col gap-5">
      <div>
        <p className="text-white text-sm font-semibold mb-3">Which services do you subscribe to?</p>
        {providers.length === 0 ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-gray-600 border-t-[#E50914] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto pr-1" style={{scrollbarWidth:'thin'}}>
            {providers.map(p => (
              <button
                key={p.provider_id}
                type="button"
                onClick={() => toggleProvider(p.provider_id)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all duration-150 ${
                  selected.includes(p.provider_id)
                    ? 'border-[#E50914] bg-[#E50914]/10'
                    : 'border-white/5 bg-[#2a2a2a] hover:border-white/20'
                }`}
              >
                {p.logo_path ? (
                  <img
                    src={`${IMG_BASE}/w92${p.logo_path}`}
                    alt={p.provider_name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#3a3a3a] flex items-center justify-center">
                    <span className="text-gray-400 text-xs">?</span>
                  </div>
                )}
                <span className="text-gray-300 text-[10px] text-center leading-tight line-clamp-2">
                  {p.provider_name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between bg-[#2a2a2a] rounded-xl px-4 py-3">
        <div>
          <p className="text-white text-sm font-medium">I use a VPN</p>
          <p className="text-gray-500 text-xs mt-0.5">Access more content from other regions</p>
        </div>
        <VpnToggle value={hasVPN} onChange={setHasVPN} />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-[#E50914] hover:bg-[#f6121d] disabled:opacity-60 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
      >
        {loading ? 'Creating account…' : 'Finish'}
      </button>

      <p className="text-center text-gray-500 text-sm">
        Already have an account?{' '}
        <button type="button" onClick={onSwitchToLogin} className="text-[#E50914] hover:underline">
          Sign in
        </button>
      </p>
    </form>
  )
}

// ── Main AuthPage ──────────────────────────────────────────────────────────
export default function AuthPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState('login') // 'login' | 'signup1' | 'signup2'
  const [signupCreds, setSignupCreds] = useState(null)

  // Already logged in — redirect away
  useEffect(() => {
    if (user) navigate('/', { replace: true })
  }, [user, navigate])

  function handleSignupStep1Done(creds) {
    setSignupCreds(creds)
    setStep('signup2')
  }

  const titles = {
    login: 'Welcome back',
    signup1: 'Create your account',
    signup2: 'Set up your profile',
  }

  const subtitles = {
    login: 'Sign in to continue',
    signup1: 'Step 1 of 2',
    signup2: 'Step 2 of 2 — choose your services',
  }

  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#1f1f1f] rounded-2xl shadow-2xl p-8">
        {/* Logo */}
        <div className="text-center mb-7">
          <span className="text-[#E50914] text-3xl font-black tracking-tight">Streamer</span>
          <p className="text-white text-lg font-semibold mt-4">{titles[step]}</p>
          <p className="text-gray-500 text-sm mt-1">{subtitles[step]}</p>
        </div>

        {step === 'login' && (
          <LoginStep onSwitchToSignup={() => setStep('signup1')} />
        )}
        {step === 'signup1' && (
          <>
            <SignupStep1 onNext={handleSignupStep1Done} />
            <p className="text-center text-gray-500 text-sm mt-4">
              Already have an account?{' '}
              <button onClick={() => setStep('login')} className="text-[#E50914] hover:underline">
                Sign in
              </button>
            </p>
          </>
        )}
        {step === 'signup2' && signupCreds && (
          <SignupStep2
            credentials={signupCreds}
            onSwitchToLogin={() => setStep('login')}
          />
        )}
      </div>
    </div>
  )
}
