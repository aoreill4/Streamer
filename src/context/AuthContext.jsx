import { createContext, useContext, useState, useCallback } from 'react'

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
  // Ensure arrays exist for users created before these fields were added
  return {
    watchlist: [],
    likedMovies: [],
    streamingServices: [],
    hasVPN: false,
    country: '',
    ...u,
  }
}

function getCurrentUserId() {
  return localStorage.getItem(SESSION_KEY) || null
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
      likedMovies: [],
    }
    const updated = [...users, newUser]
    saveUsers(updated)
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
      const updated = {
        ...prev,
        watchlist: [
          ...watchlist,
          {
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            release_date: movie.release_date,
            vote_average: movie.vote_average,
            genre_ids: movie.genre_ids,
          },
        ],
      }
      persistUser(updated)
      return updated
    })
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

  const likeMovie = useCallback((movie) => {
    setUser(prev => {
      if (!prev) return prev
      const likedMovies = prev.likedMovies || []
      if (likedMovies.find(m => m.id === movie.id)) return prev
      const updated = {
        ...prev,
        likedMovies: [
          ...likedMovies,
          {
            id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            release_date: movie.release_date,
            vote_average: movie.vote_average,
            genre_ids: movie.genre_ids,
          },
        ],
      }
      persistUser(updated)
      return updated
    })
  }, [])

  const unlikeMovie = useCallback((movieId) => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, likedMovies: (prev.likedMovies || []).filter(m => m.id !== movieId) }
      persistUser(updated)
      return updated
    })
  }, [])

  const isLiked = useCallback((movieId) => {
    return !!(user?.likedMovies || []).find(m => m.id === movieId)
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
      likeMovie,
      unlikeMovie,
      isLiked,
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
