import { createContext, useContext, useState, useCallback } from 'react'
import { getMovieKeywords } from '../lib/tmdb.js'
import { BASE_ELO, updateElos } from '../lib/elo.js'

const AuthContext = createContext(null)

const USERS_KEY = 'streamer_users'
const SESSION_KEY = 'streamer_session'

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
  } catch {
    return []
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function persistUser(updated) {
  const users = getUsers()
  const idx = users.findIndex(u => u.id === updated.id)
  if (idx !== -1) {
    users[idx] = updated
  } else {
    users.push(updated)
  }
  saveUsers(users)
}

function getUserById(id) {
  const u = getUsers().find(u => u.id === id) || null
  if (!u) return null
  // Migrate legacy field name
  if (u.likedMovies && !u.watchedMovies) {
    u.watchedMovies = u.likedMovies
    delete u.likedMovies
  }
  return {
    watchlist: [],
    watchedMovies: [],
    streamingServices: [],
    hasVPN: false,
    country: '',
    ratedMovies: {},
    ...u,
  }
}

function getCurrentUserId() {
  return localStorage.getItem(SESSION_KEY) || null
}

// Fetch keywords for a movie and patch the user's movie entry with keyword_ids.
// Runs async in the background after an optimistic UI update.
async function enrichWithKeywords(movieId, setUser) {
  try {
    const data = await getMovieKeywords(movieId)
    const keyword_ids = (data.keywords || []).map(k => k.id)
    if (!keyword_ids.length) return
    setUser(prev => {
      if (!prev) return prev
      const patchList = (list) =>
        list.map(m => m.id === movieId ? { ...m, keyword_ids } : m)
      const updated = {
        ...prev,
        watchedMovies: patchList(prev.watchedMovies || []),
        watchlist: patchList(prev.watchlist || []),
      }
      persistUser(updated)
      return updated
    })
  } catch {
    // keywords unavailable — clustering falls back to genre-only
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const id = getCurrentUserId()
    if (!id) return null
    return getUserById(id)
  })

  const login = useCallback((email, password) => {
    const users = getUsers()
    const found = users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    )
    if (!found) {
      return { ok: false, error: 'Invalid email or password.' }
    }
    localStorage.setItem(SESSION_KEY, found.id)
    setUser(getUserById(found.id))
    return { ok: true }
  }, [])

  const signup = useCallback((name, email, password) => {
    const users = getUsers()
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: 'An account with that email already exists.' }
    }
    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      password,
      streamingServices: [],
      hasVPN: false,
      country: '',
      watchlist: [],
      watchedMovies: [],
      ratedMovies: {},
    }
    saveUsers([...users, newUser])
    localStorage.setItem(SESSION_KEY, newUser.id)
    setUser(newUser)
    return { ok: true }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      if (!prev) return prev
      const merged = { ...prev, ...updates }
      persistUser(merged)
      return merged
    })
  }, [])

  const addToWatchlist = useCallback((movie) => {
    setUser(prev => {
      if (!prev) return prev
      const watchlist = prev.watchlist || []
      if (watchlist.find(m => m.id === movie.id)) return prev
      const entry = {
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        genre_ids: movie.genre_ids || [],
        keyword_ids: movie.keyword_ids || [],
      }
      const updated = { ...prev, watchlist: [...watchlist, entry] }
      persistUser(updated)
      return updated
    })
    // Fetch keywords in background if not already present
    if (!movie.keyword_ids?.length) {
      enrichWithKeywords(movie.id, setUser)
    }
  }, [])

  const removeFromWatchlist = useCallback((movieId) => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, watchlist: (prev.watchlist || []).filter(m => m.id !== movieId) }
      persistUser(updated)
      return updated
    })
  }, [])

  const isInWatchlist = useCallback((movieId) => {
    return !!(user?.watchlist || []).find(m => m.id === movieId)
  }, [user])

  const watchMovie = useCallback((movie) => {
    setUser(prev => {
      if (!prev) return prev
      const watchedMovies = prev.watchedMovies || []
      if (watchedMovies.find(m => m.id === movie.id)) return prev
      const entry = {
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        genre_ids: movie.genre_ids || [],
        keyword_ids: movie.keyword_ids || [],
      }
      // Add to ratedMovies if not already there
      const ratedMovies = prev.ratedMovies || {}
      const ratedEntry = ratedMovies[movie.id] ?? {
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        elo: BASE_ELO,
        comparisons: 0,
      }
      const updated = {
        ...prev,
        watchedMovies: [...watchedMovies, entry],
        ratedMovies: { ...ratedMovies, [movie.id]: ratedEntry },
      }
      persistUser(updated)
      return updated
    })
    if (!movie.keyword_ids?.length) enrichWithKeywords(movie.id, setUser)
  }, [])

  const recordComparison = useCallback((winnerId, loserId) => {
    setUser(prev => {
      if (!prev) return prev
      const rated = { ...(prev.ratedMovies || {}) }
      const winnerElo = rated[winnerId]?.elo ?? BASE_ELO
      const loserElo = rated[loserId]?.elo ?? BASE_ELO
      const { newEloA, newEloB } = updateElos(winnerElo, loserElo, true)
      if (rated[winnerId]) rated[winnerId] = { ...rated[winnerId], elo: newEloA, comparisons: (rated[winnerId].comparisons || 0) + 1 }
      if (rated[loserId]) rated[loserId] = { ...rated[loserId], elo: newEloB, comparisons: (rated[loserId].comparisons || 0) + 1 }
      const updated = { ...prev, ratedMovies: rated }
      persistUser(updated)
      return updated
    })
  }, [])

  const unwatchMovie = useCallback((movieId) => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, watchedMovies: (prev.watchedMovies || []).filter(m => m.id !== movieId) }
      persistUser(updated)
      return updated
    })
  }, [])

  const isWatched = useCallback((movieId) => {
    return !!(user?.watchedMovies || []).find(m => m.id === movieId)
  }, [user])

  return (
    <AuthContext.Provider value={{
      user,
      login,
      signup,
      logout,
      updateUser,
      addToWatchlist,
      removeFromWatchlist,
      isInWatchlist,
      watchMovie,
      unwatchMovie,
      isWatched,
      recordComparison,
      ratedMovies: user?.ratedMovies ?? {},
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
