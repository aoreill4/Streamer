import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import SearchPage from './pages/SearchPage.jsx'
import DetailPage from './pages/DetailPage.jsx'
import ReelsPage from './pages/ReelsPage.jsx'
import PersonPage from './pages/PersonPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import RatingsPage from './pages/RatingsPage.jsx'

function RequireAuth({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/auth" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth page — no Layout */}
      <Route path="/auth" element={<AuthPage />} />

      {/* Protected routes — wrapped in Layout */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout>
              <SearchPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/movie/:id"
        element={
          <RequireAuth>
            <Layout>
              <DetailPage />
            </Layout>
          </RequireAuth>
        }
      />
      {/* Reels is full-screen — no Layout wrapper, Sidebar still renders via fixed position */}
      <Route path="/reels" element={<RequireAuth><ReelsPage /></RequireAuth>} />
      <Route
        path="/person/:id"
        element={
          <RequireAuth>
            <Layout>
              <PersonPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/ratings"
        element={
          <RequireAuth>
            <Layout>
              <RatingsPage />
            </Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <Layout>
              <ProfilePage />
            </Layout>
          </RequireAuth>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
