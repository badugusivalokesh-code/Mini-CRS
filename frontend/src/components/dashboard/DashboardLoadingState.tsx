export default function DashboardLoadingState() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="animate-pulse rounded-lg border border-[#e1eaf2] bg-white p-5 motion-reduce:animate-none">
            <div className="size-8 rounded-md bg-[#edf2f6]" />
            <div className="mt-4 h-6 w-16 rounded bg-[#edf2f6]" />
            <div className="mt-2 h-4 w-24 rounded bg-[#edf2f6]" />
          </div>
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg border border-[#e1eaf2] bg-white p-6 motion-reduce:animate-none" />
    </div>
  )
}
