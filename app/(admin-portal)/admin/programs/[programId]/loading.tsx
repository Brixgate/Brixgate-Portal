export default function ProgramDetailLoading() {
  return (
    <div className="p-8 pb-12">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 rounded-[6px] bg-[#f3f4f6] animate-pulse flex-shrink-0" />
        <div>
          <div className="h-6 w-64 bg-[#f3f4f6] rounded-[6px] animate-pulse mb-2" />
          <div className="h-4 w-40 bg-[#f3f4f6] rounded animate-pulse" />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[320px_1fr] gap-6">
        {/* Left: module list */}
        <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#f3f4f6]">
            <div className="h-5 w-28 bg-[#f3f4f6] rounded animate-pulse mb-1" />
            <div className="h-3 w-20 bg-[#f3f4f6] rounded animate-pulse" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-5 py-4 border-b border-[#f3f4f6] last:border-0 flex items-center gap-3">
              <div className="w-7 h-7 rounded-[6px] bg-[#f3f4f6] animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-[#f3f4f6] rounded animate-pulse mb-1.5" style={{ width: `${60 + (i % 3) * 15}%` }} />
                <div className="h-3 w-20 bg-[#f3f4f6] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Right: detail panel */}
        <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-6">
          <div className="h-6 w-48 bg-[#f3f4f6] rounded animate-pulse mb-3" />
          <div className="h-4 w-full bg-[#f3f4f6] rounded animate-pulse mb-2" />
          <div className="h-4 w-3/4 bg-[#f3f4f6] rounded animate-pulse mb-6" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-[8px] bg-[#f9fafb] border border-[#f3f4f6] mb-2">
              <div className="w-8 h-8 rounded-[7px] bg-[#f3f4f6] animate-pulse flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-[#f3f4f6] rounded animate-pulse mb-1" style={{ width: `${50 + (i % 3) * 20}%` }} />
                <div className="h-3 w-16 bg-[#f3f4f6] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
