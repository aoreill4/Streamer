import { Routes, Route } from 'react-router-dom'
import SearchPage from './pages/SearchPage.jsx'
import DetailPage from './pages/DetailPage.jsx'
import ReelsPage from './pages/ReelsPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SearchPage />} />
      <Route path="/movie/:id" element={<DetailPage />} />
      <Route path="/reels" element={<ReelsPage />} />
    </Routes>
  )
}
