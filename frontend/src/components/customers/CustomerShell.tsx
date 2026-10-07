import { BriefcaseBusiness, LayoutDashboard, UsersRound } from 'lucide-react'
import { NavLink, Link } from 'react-router-dom'
import type { PropsWithChildren } from 'react'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `grid size-12 place-items-center rounded-full border transition ${isActive
    ? 'border-[#514bff] bg-[#514bff] text-white'
    : 'border-[#e1eaf2] bg-white text-[#8297a9] hover:border-[#514bff] hover:text-[#514bff]'}`

export default function CustomerShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-[#f3f8fc]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[76px] flex-col items-center border-r border-[#e5edf4] bg-white py-5 lg:flex">
        <Link to="/" aria-label="Mini CRM dashboard" className="grid size-10 place-items-center rounded-md bg-[#0d2d4b] text-xs font-bold text-white">
          MC
        </Link>
        <nav aria-label="Main navigation" className="mt-8 flex flex-col gap-3">
          <NavLink to="/" end aria-label="Dashboard" title="Dashboard" className={navClass}>
            <LayoutDashboard size={20} strokeWidth={1.8} />
          </NavLink>
          <NavLink to="/customers" aria-label="Customers" title="Customers" className={navClass}>
            <UsersRound size={20} strokeWidth={1.8} />
          </NavLink>
          <NavLink to="/deals" aria-label="Deals" title="Deals" className={navClass}>
            <BriefcaseBusiness size={20} strokeWidth={1.8} />
          </NavLink>
        </nav>
      </aside>

      <nav aria-label="Main navigation" className="flex h-14 items-center justify-between border-b border-[#e5edf4] bg-white px-4 lg:hidden">
        <Link to="/" className="grid size-9 place-items-center rounded-md bg-[#0d2d4b] text-[10px] font-bold text-white">MC</Link>
        <div className="flex items-center gap-2">
          <NavLink to="/" end className={({ isActive }) => `flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold ${isActive ? 'bg-[#efeeff] text-[#514bff]' : 'text-[#71869a]'}`}>
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
          <NavLink to="/customers" className={({ isActive }) => `flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold ${isActive ? 'bg-[#efeeff] text-[#514bff]' : 'text-[#71869a]'}`}>
            <UsersRound size={16} /> Customers
          </NavLink>
          <NavLink to="/deals" className={({ isActive }) => `flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold ${isActive ? 'bg-[#efeeff] text-[#514bff]' : 'text-[#71869a]'}`}>
            <BriefcaseBusiness size={16} /> Deals
          </NavLink>
        </div>
      </nav>

      <div className="lg:pl-[76px]">{children}</div>
    </div>
  )
}