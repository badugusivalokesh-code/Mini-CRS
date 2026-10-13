import {
  BriefcaseBusiness,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  UsersRound,
  X,
} from 'lucide-react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback, type PropsWithChildren } from 'react'
import { useAuth } from '@/useAuth'
import { signOutAndNavigate } from '@/lib/signOut'

// ─── Sidebar width ────────────────────────────────────────────────────────────
// Desktop: 220px expanded sidebar with logo + label
const SIDEBAR_W = 220

interface NavItem {
  to: string
  end?: boolean
  icon: React.ElementType
  label: string
}

const navItems: NavItem[] = [
  { to: '/dashboard', end: true, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/customers', icon: UsersRound, label: 'Customers' },
  { to: '/deals', icon: BriefcaseBusiness, label: 'Deals' },
  { to: '/tasks', icon: ClipboardCheck, label: 'Tasks' },
]

function DesktopNavLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      aria-label={item.label}
      title={item.label}
      className={({ isActive }) =>
        `flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
          isActive
            ? 'border-l-2 border-[#514bff] bg-[#efeeff] pl-[10px] text-[#514bff]'
            : 'text-[#6b8198] hover:bg-[#f4f7fa] hover:text-[#123553]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            size={18}
            strokeWidth={isActive ? 2.2 : 1.8}
            className="shrink-0"
          />
          <span>{item.label}</span>
          {isActive && (
            <span aria-hidden="true" className="ml-auto size-1.5 rounded-full bg-[#514bff]" />
          )}
        </>
      )}
    </NavLink>
  )
}

export default function CustomerShell({ children }: PropsWithChildren) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [signingOut, setSigningOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    menuButtonRef.current?.focus()
  }, [])

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (drawerRef.current) {
      drawerRef.current.inert = !drawerOpen
    }
  }, [drawerOpen])

  // Keep keyboard focus inside the mobile navigation while it is open.
  useEffect(() => {
    if (!drawerOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    drawerRef.current?.querySelector<HTMLElement>('a, button')?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDrawer()
        return
      }

      if (event.key !== 'Tab' || !drawerRef.current) return
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled)',
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [drawerOpen, closeDrawer])

  async function handleLogout() {
    setSigningOut(true)
    setLogoutError('')
    try {
      await signOutAndNavigate(logout, navigate)
    } catch {
      setLogoutError('Unable to sign out. Please try again.')
    } finally {
      setSigningOut(false)
    }
  }

  const accountInitial = user?.email?.charAt(0).toUpperCase() ?? '?'

  return (
    <div className="min-h-screen bg-[#f3f8fc]">
      {/* ─── Desktop Sidebar ─────────────────────────────────────── */}
      <aside
        className="fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-[#e5edf4] bg-white lg:flex"
        style={{ width: SIDEBAR_W }}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-[#e5edf4] px-5">
          <Link
            to="/dashboard"
            aria-label="Clientra — go to dashboard"
            className="flex items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#514bff]"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-[#514bff] text-[11px] font-black text-white tracking-tight select-none">
              CL
            </span>
            <span className="text-[17px] font-black tracking-tight text-[#0d1f2d] select-none">
              Clientra
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#a0b3c2]">
            Menu
          </p>
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <DesktopNavLink key={item.to} item={item} />
            ))}
          </div>
        </nav>

        {/* Account */}
        <div className="border-t border-[#e5edf4] px-3 py-4 space-y-0.5">
          <div className="mt-2 rounded-lg bg-[#f7fafd] px-3 py-3">
            <div className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#514bff]/10 text-xs font-bold text-[#514bff]">
                {accountInitial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[#123553]">
                  {user?.email ?? '—'}
                </p>
                <p className="text-[11px] text-[#8297a9]">Owner</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="mt-3 flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs font-semibold text-[#8297a9] transition hover:bg-[#fff0f0] hover:text-[#d65363] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut size={14} strokeWidth={1.8} />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Mobile Top Bar ──────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-[#e5edf4] bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          aria-controls="clientra-mobile-navigation"
          aria-label="Open navigation menu"
          ref={menuButtonRef}
          className="grid size-9 place-items-center rounded-md text-[#6b8198] transition hover:bg-[#f4f7fa]"
        >
          <Menu size={22} />
        </button>
        <Link
          to="/dashboard"
          aria-label="Clientra — go to dashboard"
          className="flex items-center gap-2"
        >
          <span className="grid size-7 place-items-center rounded-md bg-[#514bff] text-[10px] font-black text-white">
            CL
          </span>
          <span className="text-base font-black tracking-tight text-[#0d1f2d]">Clientra</span>
        </Link>
        {/* Right placeholder for centering */}
        <div className="size-9" />
      </header>

      {/* ─── Mobile Drawer ───────────────────────────────────────── */}
      {/* Backdrop */}
      {drawerOpen && (
        <div
          role="presentation"
          className="crm-modal-backdrop fixed inset-0 z-40 bg-[#123553]/35 backdrop-blur-[1px] motion-reduce:animate-none lg:hidden"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        id="clientra-mobile-navigation"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!drawerOpen}
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(260px,calc(100vw-2rem))] flex-col bg-white shadow-xl transition-transform duration-200 ease-out motion-reduce:transition-none lg:hidden ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#e5edf4] px-4">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-[#514bff] text-[10px] font-black text-white">
              CL
            </span>
            <span className="text-base font-black tracking-tight text-[#0d1f2d]">Clientra</span>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close navigation menu"
            className="grid size-9 place-items-center rounded-md text-[#6b8198] transition hover:bg-[#f4f7fa]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer nav */}
        <nav
          aria-label="Mobile main navigation"
          className="flex-1 overflow-y-auto px-3 py-4"
        >
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[#a0b3c2]">
            Menu
          </p>
          <div className="space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={closeDrawer}
                className={({ isActive }) =>
                  `flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                    isActive
                      ? 'border-l-2 border-[#514bff] bg-[#efeeff] pl-[10px] text-[#514bff]'
                      : 'text-[#6b8198] hover:bg-[#f4f7fa] hover:text-[#123553]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={18}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      className="shrink-0"
                    />
                    {item.label}
                    {isActive && (
                      <span aria-hidden="true" className="ml-auto size-1.5 rounded-full bg-[#514bff]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Drawer account */}
        <div className="border-t border-[#e5edf4] px-3 py-4 space-y-0.5">
          <div className="mt-2 rounded-lg bg-[#f7fafd] px-3 py-3">
            <div className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#514bff]/10 text-xs font-bold text-[#514bff]">
                {accountInitial}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[#123553]">{user?.email ?? '—'}</p>
                <p className="text-[11px] text-[#8297a9]">Owner</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="mt-3 flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs font-semibold text-[#8297a9] transition hover:bg-[#fff0f0] hover:text-[#d65363] disabled:opacity-50"
            >
              <LogOut size={14} strokeWidth={1.8} />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Page content ────────────────────────────────────────── */}
      {/* pt-14 offsets mobile top bar; lg:pl-[220px] offsets desktop sidebar */}
      <div className="pt-14 lg:pt-0 lg:pl-[220px]">
        {logoutError && (
          <p role="alert" className="border-b border-[#f2cbd0] bg-[#fff5f6] px-4 py-3 text-sm text-[#d65363] sm:px-8 lg:px-10">
            {logoutError}
          </p>
        )}
        {children}
      </div>
    </div>
  )
}
