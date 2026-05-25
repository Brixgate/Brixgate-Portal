export default function PaymentsLoading() {
  return (
    <div className="p-8 pb-12">
      <div className="mb-8">
        <div className="h-7 w-32 bg-[#f3f4f6] rounded-[6px] animate-pulse mb-2" />
        <div className="h-4 w-52 bg-[#f3f4f6] rounded-[6px] animate-pulse" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="h-3 w-24 bg-[#f3f4f6] rounded animate-pulse" />
              <div className="w-9 h-9 rounded-[8px] bg-[#f3f4f6] animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-[#f3f4f6] rounded animate-pulse mb-2" />
            <div className="h-3 w-20 bg-[#f3f4f6] rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        <div className="bg-[#f9fafb] border-b border-[#f3f4f6] px-5 py-3 flex gap-8">
          {[120, 180, 100, 100, 80, 90].map((w, i) => (
            <div key={i} className="h-3 bg-[#f3f4f6] rounded animate-pulse" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="border-b border-[#f3f4f6] last:border-0 px-5 py-4 flex gap-8 items-center">
            {[140, 200, 100, 100, 80, 90].map((w, j) => (
              <div key={j} className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: w }} />
            ))}
          </div>
        ))}
        <div className="border-t border-[#f3f4f6] px-5 py-3 flex items-center justify-between">
          <div className="h-3 w-36 bg-[#f3f4f6] rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-[#f3f4f6] rounded-[6px] animate-pulse" />
            <div className="h-8 w-20 bg-[#f3f4f6] rounded-[6px] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
