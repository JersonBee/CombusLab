import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import logoSvg from './assets/logo.svg'
import assistantIcon from './assets/chart-assistant.svg'
import { Dashboard } from './pages/Dashboard'

const Ranking = lazy(() => import('./pages/Ranking').then(module => ({ default: module.Ranking })))
const Discover = lazy(() => import('./pages/Research').then(module => ({ default: module.Discover })))
const Comparations = lazy(() => import('./pages/Comparations').then(module => ({ default: module.Comparations })))
const DataLab = lazy(() => import('./pages/Data').then(module => ({ default: module.DataLab })))
const SafetyInsights = lazy(() => import('./pages/SafetyInsights').then(module => ({ default: module.SafetyInsights })))
const Resources = lazy(() => import('./pages/Resources').then(module => ({ default: module.Resources })))
const ResourceDetail = lazy(() => import('./pages/Resources').then(module => ({ default: module.ResourceDetail })))

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/discover', label: 'Discover' },
  { to: '/ranking', label: 'Ranking' },
  { to: '/compare', label: 'Compare' },
  { to: '/data-lab', label: 'Data Lab' },
  { to: '/safety-insights', label: 'Safety Insights' },
  { to: '/resources', label: 'Resources' },
]
const desktopNavigation = '(min-width: 1024px)'

function LegacyRoute({ to }: { to: string }) {
  const { search, hash } = useLocation()
  return <Navigate to={{ pathname: to, search, hash }} replace />
}

function Shell() {
  const [menuOpen, setMenuOpen] = useState(() => window.matchMedia(desktopNavigation).matches)
  const navigate = useNavigate()

  useEffect(() => {
    const viewport = window.matchMedia(desktopNavigation)
    const resizeMenu = (event: MediaQueryListEvent) => setMenuOpen(event.matches)
    viewport.addEventListener('change', resizeMenu)
    return () => viewport.removeEventListener('change', resizeMenu)
  }, [])

  function openAssistant() {
    const panel = document.getElementById('chart-assistant')
    if (panel) {
      panel.focus()
      return
    }
    navigate('/discover?coverage=series')
  }

  return (
    <div className="dashboard-shell" data-menu-open={menuOpen}>
      <div className="dashboard-backdrop" aria-hidden="true"><span /><span /></div>
      <aside className="svg-sidebar">
        <button
          type="button"
          className="dashboard-menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Collapse navigation' : 'Expand navigation'}
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
        >
          <img src={logoSvg} alt="" width={42} height={42} />
          {menuOpen && <><span>CombusLab</span><ChevronLeft size={18} aria-hidden="true" /></>}
        </button>

        <nav id="main-navigation" className="dashboard-navigation" aria-label="Main navigation" hidden={!menuOpen}>
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => {
                if (!window.matchMedia(desktopNavigation).matches) setMenuOpen(false)
              }}
              className={({ isActive }) => 'svg-nav-link ' + (isActive ? 'svg-nav-link-active' : 'svg-nav-link-inactive')}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="dashboard-main">
        <div className="max-w-[1060px] mx-auto">
          <Suspense fallback={<p role="status">Loading view…</p>}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/research" element={<LegacyRoute to="/discover" />} />
              <Route path="/compare" element={<Comparations />} />
              <Route path="/comparations" element={<LegacyRoute to="/compare" />} />
              <Route path="/data-lab" element={<DataLab />} />
              <Route path="/safety-insights" element={<SafetyInsights />} />
              <Route path="/data" element={<LegacyRoute to="/data-lab" />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/resources/:investigationId" element={<ResourceDetail />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </main>

      <button type="button" className="assistant-launcher" aria-label="Open chart assistant" onClick={openAssistant}>
        <img src={assistantIcon} alt="" width={60} height={60} />
      </button>
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
