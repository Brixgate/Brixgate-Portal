export default function DashboardLoading() {
  return (
    <div className="p-8 pb-12">
      {/* Header */}
      <div className="mb-8">
        <div className="h-7 w-36 bg-[#f3f4f6] rounded-[6px] animate-pulse mb-2" />
        <div className="h-4 w-56 bg-[#f3f4f6] rounded-[6px] animate-pulse" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="h-3 w-24 bg-[#f3f4f6] rounded animate-pulse" />
              <div className="w-9 h-9 rounded-[8px] bg-[#f3f4f6] animate-pulse" />
            </div>
            <div className="h-8 w-16 bg-[#f3f4f6] rounded animate-pulse mb-2" />
            <div className="h-3 w-20 bg-[#f3f4f6] rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-[3fr_2fr] gap-6 mb-8">
        <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-6">
          <div className="h-5 w-40 bg-[#f3f4f6] rounded animate-pulse mb-2" />
          <div className="h-3 w-52 bg-[#f3f4f6] rounded animate-pulse mb-6" />
          <div className="h-[200px] bg-[#f9fafb] rounded-[8px] animate-pulse" />
        </div>
        <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-6">
          <div className="h-5 w-28 bg-[#f3f4f6] rounded animate-pulse mb-2" />
          <div className="h-3 w-40 bg-[#f3f4f6] rounded animate-pulse mb-6" />
          <div className="h-[200px] bg-[#f9fafb] rounded-[8px] animate-pulse" />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-6">
            <div className="h-5 w-44 bg-[#f3f4f6] rounded animate-pulse mb-2" />
            <div className="h-3 w-32 bg-[#f3f4f6] rounded animate-pulse mb-6" />
            {Array.from({ length: 3 }).map((__, j) => (
              <div key={j} className="flex items-center justify-between py-3 border-b border-[#f3f4f6] last:border-0">
                <div className="h-4 w-40 bg-[#f3f4f6] rounded animate-pulse" />
                <div className="h-6 w-10 bg-[#f3f4f6] rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
