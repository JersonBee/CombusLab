import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Activity, BookOpen, ChevronLeft, Database, GitCompareArrows, ListOrdered, Menu, Pause, Play, Search, ShieldCheck } from 'lucide-react'
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
  { to: '/', label: 'Dashboard', Icon: Activity },
  { to: '/discover', label: 'Discover', Icon: Search },
  { to: '/ranking', label: 'Ranking', Icon: ListOrdered },
  { to: '/compare', label: 'Compare', Icon: GitCompareArrows },
  { to: '/data-lab', label: 'Data Lab', Icon: Database },
  { to: '/safety-insights', label: 'Safety Insights', Icon: ShieldCheck },
  { to: '/resources', label: 'Resources', Icon: BookOpen },
]
const desktopNavigation = '(min-width: 1024px)'

function LegacyRoute({ to }: { to: string }) {
  const { search, hash } = useLocation()
  return <Navigate to={{ pathname: to, search, hash }} replace />
}

function Shell() {
  const [menuOpen, setMenuOpen] = useState(() => window.matchMedia(desktopNavigation).matches)
  const [motionPaused, setMotionPaused] = useState(false)
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
    <div className="dashboard-shell" data-menu-open={menuOpen} data-motion-paused={motionPaused}>
      <div className="dashboard-backdrop" aria-hidden="true">
        <div className="orbital-sky-photo" />
        <div className="orbital-sky-stars" />
      </div>
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
          <span className="dashboard-wordmark">CombusLab</span>
          {menuOpen ? <ChevronLeft className="dashboard-menu-indicator" size={19} aria-hidden="true" /> :
            <Menu className="dashboard-menu-indicator" size={19} aria-hidden="true" />}
        </button>

        <nav id="main-navigation" className="dashboard-navigation" aria-label="Main navigation" hidden={!menuOpen}>
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => {
                if (!window.matchMedia(desktopNavigation).matches) setMenuOpen(false)
              }}
              className="svg-nav-link"
            >
              <span className="nav-flame" aria-hidden="true"><Icon size={16} strokeWidth={1.8} /><span /></span>
              <span>{label}</span>
            </NavLink>
          ))}
          <button type="button" className="ambient-control" aria-pressed={motionPaused}
            onClick={() => setMotionPaused(paused => !paused)}>
            {motionPaused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
            {motionPaused ? 'Resume motion' : 'Pause motion'}
          </button>
        </nav>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-content">
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
          <footer className="dashboard-footer">
            Sky image: <a className="resource-link" href="https://science.nasa.gov/missions/hubble/hubble-revisits-the-veil-nebula/">
              ESA/Hubble &amp; NASA, Z. Levay
            </a> · Color-tinted for CombusLab
          </footer>
        </div>
      </main>

      <button type="button" className="assistant-launcher" aria-label="Open chart assistant" onClick={openAssistant}>
        <span className="assistant-orbit" aria-hidden="true" />
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
