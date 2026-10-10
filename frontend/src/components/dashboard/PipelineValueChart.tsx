import type { DashboardData, PipelineStageValue } from '@/lib/dashboardApi'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

const currency = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const STAGE_COLORS: Record<string, { bar: string; badge: string }> = {
  Lead: { bar: 'bg-[#514bff]', badge: 'bg-[#efeeff] text-[#514bff]' },
  Qualified: { bar: 'bg-[#0284c7]', badge: 'bg-[#e0f2fe] text-[#0369a1]' },
  Proposal: { bar: 'bg-[#d97706]', badge: 'bg-[#fef3c7] text-[#b45309]' },
  Won: { bar: 'bg-[#147b66]', badge: 'bg-[#eaf8f4] text-[#147b66]' },
  Lost: { bar: 'bg-[#8297a9]', badge: 'bg-[#edf2f6] text-[#4e6577]' },
}

export default function PipelineValueChart({ data }: { data: DashboardData }) {
  const stages: PipelineStageValue[] = data.pipelineByStage ?? []
  const totalPipelineValue = stages.reduce((sum, stage) => sum + stage.value, 0)
  const maxStageValue = Math.max(...stages.map((stage) => stage.value), 1)

  return (
    <section aria-label="Pipeline Value by Stage" className="crm-panel p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf2f6] pb-4">
        <div>
          <h2 className="text-base font-bold text-[#123553]">Pipeline Value by Stage</h2>
          <p className="mt-0.5 text-xs text-[#8297a9]">Deal values across all pipeline stages</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium text-[#8297a9]">Total Pipeline Value</p>
          <p className="text-lg font-extrabold text-[#123553]">{currency.format(totalPipelineValue)}</p>
        </div>
      </div>

      {stages.length > 0 ? (
        <div className="mt-6 space-y-5">
          {stages.map((stage) => {
            const colors = STAGE_COLORS[stage.stage] ?? {
              bar: 'bg-[#514bff]',
              badge: 'bg-[#efeeff] text-[#514bff]',
            }
            const percentage = totalPipelineValue > 0
              ? Math.round((stage.value / totalPipelineValue) * 100)
              : 0
            const width = stage.value > 0
              ? Math.min(100, Math.max(4, Math.round((stage.value / maxStageValue) * 100)))
              : 0

            return (
              <div key={stage.stage} className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block rounded px-2 py-0.5 font-bold ${colors.badge}`}>{stage.stage}</span>
                    <span className="font-medium text-[#71869a]">{stage.count} {stage.count === 1 ? 'deal' : 'deals'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-[#8297a9]">{percentage}% of total</span>
                    <span className="font-bold text-[#123553]">{currency.format(stage.value)}</span>
                  </div>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-[#f0f4f8]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 motion-reduce:transition-none ${colors.bar}`}
                    style={{ width: `${width}%` }}
                    role="progressbar"
                    aria-valuenow={stage.value}
                    aria-valuemin={0}
                    aria-valuemax={maxStageValue}
                    aria-label={`${stage.stage} pipeline value`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-10 text-center">
          <p className="text-sm text-[#8297a9]">No open pipeline stages found.</p>
        </div>
      )}

      {totalPipelineValue === 0 && (
        <div className="mt-6 rounded-md border border-dashed border-[#dfe9f1] bg-[#f8fbfe] p-4 text-center">
          <p className="text-xs text-[#71869a]">No deal values yet. Add deals to see your pipeline breakdown here.</p>
          <Link
            to="/deals"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#514bff] hover:underline"
          >
            <Plus size={14} /> Add or manage deals
          </Link>
        </div>
      )}
    </section>
  )
}
