import { useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import logoSvg from './assets/logo.svg'
import { Ranking } from './pages/Ranking'
import { Research } from './pages/Research'
import { Comparations } from './pages/Comparations'
import { Data } from './pages/Data'
import { Resources } from './pages/Resources'

const NAV_ITEMS = [
  { to: '/ranking', label: 'Ranking' },
  { to: '/research', label: 'Research' },
  { to: '/comparations', label: 'Comparations' },
  { to: '/data', label: 'Data' },
  { to: '/resources', label: 'Resources' },
]

function Shell() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen w-full bg-[#2B1511] flex flex-col lg:flex-row">
      {/* Persistent Left Sidebar matching 1.svg–5.svg (#FEB352, rounded right edges) */}
      <aside className="svg-sidebar rounded-b-[28px] lg:rounded-bl-none lg:rounded-r-[36px] w-full lg:w-[260px] lg:min-h-screen lg:sticky lg:top-0 lg:self-start shrink-0 px-6 py-4 lg:py-10 flex flex-col justify-between z-30 shadow-xl lg:shadow-none">
        <div className="flex flex-wrap lg:flex-col items-center justify-between lg:justify-start gap-4 lg:gap-12">
          <NavLink
            to="/ranking"
            onClick={() => setMobileMenuOpen(false)}
            className="flex flex-row lg:flex-col items-center gap-2.5 lg:gap-2 focus:outline-none"
            aria-label="CombusLab Home"
          >
            <img
              src={logoSvg}
              alt="CombusLab emblem"
              className="w-11 h-11 lg:w-[70px] lg:h-[70px] object-contain"
            />
            <span className="font-[var(--font-display)] text-xl lg:text-[1.45rem] font-bold tracking-tight text-black leading-none">
              CombusLab
            </span>
          </NavLink>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden p-2 rounded-xl text-black hover:bg-black/10 cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <nav
            aria-label="Main navigation"
            className={`${mobileMenuOpen ? 'flex' : 'hidden'
              } lg:flex flex-col items-center gap-4 lg:gap-5 w-full pt-2 lg:pt-4 pb-2`}
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `svg-nav-link text-center py-1 px-3 ${isActive ? 'svg-nav-link-active' : 'svg-nav-link-inactive'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden lg:block pt-4" />
      </aside>

      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
        <div className="max-w-[1060px] mx-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/ranking" replace />} />
            <Route path="/ranking" element={<Ranking />} />
            <Route path="/research" element={<Research />} />
            <Route path="/comparations" element={<Comparations />} />
            <Route path="/data" element={<Data />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="*" element={<Navigate to="/ranking" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  )
}
