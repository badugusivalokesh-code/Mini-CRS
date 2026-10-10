import { AlertCircle, BriefcaseBusiness, Clock, Trophy, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DashboardData } from '@/lib/dashboardApi'

const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

interface MetricCardProps {
  label: string
  value: string | number
  description: string
  href: string
  linkLabel: string
  icon: typeof UsersRound
  iconClass: string
  linkClass?: string
  alert?: boolean
}

function MetricCard({
  label,
  value,
  description,
  href,
  linkLabel,
  icon: Icon,
  iconClass,
  linkClass = 'text-[#514bff]',
  alert = false,
}: MetricCardProps) {
  return (
    <article className={`crm-card flex flex-col justify-between rounded-xl border p-5 shadow-[0_2px_8px_rgba(18,53,83,0.035)] ${alert ? 'border-[#f2cbd0] bg-[#fff5f6]' : 'border-[#e1eaf2] bg-white'}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold uppercase tracking-wider ${alert ? 'text-[#d65363]' : 'text-[#8297a9]'}`}>{label}</span>
        <span className={`grid size-8 place-items-center rounded-md ${iconClass}`}><Icon size={18} /></span>
      </div>
      <div className="mt-4">
        <p className={`text-2xl font-extrabold ${alert ? 'text-[#d65363]' : 'text-[#123553]'}`}>{value}</p>
        <p className={`mt-1 text-xs ${alert ? 'font-medium text-[#c0394b]' : 'text-[#8297a9]'}`}>{description}</p>
      </div>
      <Link to={href} className={`mt-4 inline-flex items-center text-xs font-semibold hover:underline ${linkClass}`}>
        {linkLabel} &rarr;
      </Link>
    </article>
  )
}

export default function DashboardMetrics({ data }: { data: DashboardData }) {
  return (
    <section aria-label="Key Performance Metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <MetricCard
        label="Customers" value={data.totalCustomers} description="Total contacts in CRM"
        href="/customers" linkLabel="View customers" icon={UsersRound}
        iconClass="bg-[#f0effe] text-[#514bff]"
      />
      <MetricCard
        label="Open Pipeline" value={currency.format(data.openPipelineValue)}
        description="Active open deals" href="/deals" linkLabel="View deals"
        icon={BriefcaseBusiness} iconClass="bg-[#e0f2fe] text-[#0284c7]"
      />
      <MetricCard
        label="Deals Won" value={data.dealsWonThisMonth} description="Closed won this month"
        href="/deals" linkLabel="View pipeline" icon={Trophy}
        iconClass="bg-[#eaf8f4] text-[#147b66]" linkClass="text-[#147b66]"
      />
      <MetricCard
        label="Due Today" value={data.tasksDueToday} description="Pending tasks today"
        href="/tasks" linkLabel="View tasks" icon={Clock}
        iconClass="bg-[#fff8eb] text-[#d97706]"
      />
      <MetricCard
        label="Overdue Tasks" value={data.overdueTasks}
        description={data.overdueTasks > 0 ? 'Requires attention' : 'All tasks on schedule'}
        href="/tasks" linkLabel={data.overdueTasks > 0 ? 'Review tasks' : 'View tasks'}
        icon={AlertCircle}
        iconClass={data.overdueTasks > 0 ? 'bg-[#ffe1e5] text-[#d65363]' : 'bg-[#edf2f6] text-[#8297a9]'}
        linkClass={data.overdueTasks > 0 ? 'text-[#d65363]' : undefined}
        alert={data.overdueTasks > 0}
      />
    </section>
  )
}
