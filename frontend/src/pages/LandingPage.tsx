import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  UsersRound,
  BriefcaseBusiness,
  ClipboardCheck,
  TrendingUp,
  Zap,
  Shield,
} from 'lucide-react'

const features = [
  {
    icon: UsersRound,
    title: 'Customer Management',
    description: 'Organise every contact in one place. Track details, linked deals, and open tasks at a glance.',
    color: '#514bff',
    bg: '#efeeff',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Deal Pipeline',
    description: 'Move deals through Lead, Qualified, Proposal, Won, and Lost stages with full value tracking.',
    color: '#0ea472',
    bg: '#e5f9f2',
  },
  {
    icon: ClipboardCheck,
    title: 'Task Tracking',
    description: "Never miss a follow-up. Assign tasks, set due dates, and see what's overdue instantly.",
    color: '#e07b00',
    bg: '#fff4e0',
  },
  {
    icon: LayoutDashboard,
    title: 'Live Dashboard',
    description: 'Real-time metrics: open pipeline value, deals won this month, tasks due today, and more.',
    color: '#c94fd8',
    bg: '#faeffe',
  },
  {
    icon: TrendingUp,
    title: 'Pipeline Analytics',
    description: 'Visual pipeline chart broken down by stage — understand where revenue is sitting right now.',
    color: '#1a91da',
    bg: '#e4f3fc',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    description: 'JWT auth, bcrypt-hashed passwords, rate limiting, and strict per-user data isolation.',
    color: '#d65363',
    bg: '#fff0f2',
  },
]

export default function LandingPage() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-white text-[#123553]">
      {/* ─── Nav ─── */}
      <header className="sticky top-0 z-30 border-b border-[#edf2f7] bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-[#514bff] text-xs font-black text-white tracking-tight">
              CL
            </span>
            <span className="text-[17px] font-black tracking-tight text-[#0d1f2d]">Clientra</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              state={location.state}
              className="hidden rounded-md px-4 py-2 text-sm font-semibold text-[#514bff] transition hover:bg-[#efeeff] sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              to="/login"
              state={location.state}
              className="rounded-md bg-[#514bff] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#403be8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#514bff]"
            >
              Demo sign-in
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-16 text-center sm:pt-24">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#dde8ff] bg-[#f0f4ff] px-3.5 py-1.5 text-xs font-semibold text-[#514bff]">
          <Zap size={12} />
          Built for growing sales teams
        </div>
        <h1 className="mx-auto max-w-2xl text-[2.6rem] font-black leading-[1.1] tracking-tight text-[#0d1f2d] sm:text-[3.5rem]">
          The CRM that actually{' '}
          <span className="bg-gradient-to-r from-[#514bff] to-[#7b75ff] bg-clip-text text-transparent">
            gets out of your way
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#5a7a96] sm:text-lg">
          Clientra helps you manage customers, track deals, and close more — without the complexity of enterprise CRMs.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/login"
            state={location.state}
            className="w-full rounded-xl bg-[#514bff] px-8 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#403be8] hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#514bff] sm:w-auto"
          >
            View demo sign-in
          </Link>
          <Link
            to="/register"
            state={location.state}
            className="w-full rounded-xl border border-[#dde8ff] bg-white px-8 py-3.5 text-sm font-bold text-[#514bff] transition hover:bg-[#f0f4ff] sm:w-auto"
          >
            Create free account
          </Link>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="bg-[#f7f9fc] py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="mb-2 text-center text-2xl font-black tracking-tight text-[#0d1f2d] sm:text-3xl">
            Everything your team needs
          </h2>
          <p className="mb-10 text-center text-sm text-[#5a7a96]">
            No bloat. No unused modules. Just the features that move deals forward.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-[#e8eff6] bg-white p-6 shadow-[0_2px_12px_rgba(22,54,82,0.04)] transition hover:shadow-[0_4px_20px_rgba(22,54,82,0.09)]"
              >
                <span
                  className="mb-4 grid size-10 place-items-center rounded-xl"
                  style={{ background: f.bg, color: f.color }}
                >
                  <f.icon size={20} strokeWidth={1.8} />
                </span>
                <h3 className="mb-1.5 text-sm font-bold text-[#0d1f2d]">{f.title}</h3>
                <p className="text-sm leading-relaxed text-[#5a7a96]">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-16 text-center">
        <div className="mx-auto max-w-xl px-5">
          <h2 className="mb-3 text-2xl font-black tracking-tight text-[#0d1f2d] sm:text-3xl">
            Ready to close more deals?
          </h2>
          <p className="mb-7 text-sm text-[#5a7a96]">
            Create an account or sign in with a demo account provided by your administrator.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/register"
              state={location.state}
              className="w-full rounded-xl bg-[#514bff] px-8 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#403be8] sm:w-auto"
            >
              Create free account
            </Link>
            <Link
              to="/login"
              state={location.state}
              className="w-full rounded-xl border border-[#dde8ff] bg-white px-8 py-3.5 text-sm font-bold text-[#514bff] transition hover:bg-[#f0f4ff] sm:w-auto"
            >
              Sign in to demo
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[#edf2f7] py-8 text-center text-xs text-[#8297a9]">
        <div className="flex items-center justify-center gap-2">
          <span className="grid size-5 place-items-center rounded bg-[#514bff] text-[9px] font-black text-white">
            CL
          </span>
          <span className="font-semibold text-[#5a7a96]">Clientra</span>
        </div>
        <p className="mt-2">© {new Date().getFullYear()} Clientra. All rights reserved.</p>
      </footer>
    </div>
  )
}
