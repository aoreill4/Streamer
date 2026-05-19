import Sidebar from './Sidebar.jsx'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#141414]">
      <Sidebar />
      <div className="md:ml-[220px] pb-16 md:pb-0">
        {children}
      </div>
    </div>
  )
}
