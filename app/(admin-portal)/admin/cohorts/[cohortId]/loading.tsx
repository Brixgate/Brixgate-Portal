export default function CohortDetailLoading() {
  return (
    <div className="p-8 pb-12">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 rounded-[6px] bg-[#f3f4f6] animate-pulse flex-shrink-0" />
        <div>
          <div className="h-6 w-52 bg-[#f3f4f6] rounded-[6px] animate-pulse mb-2" />
          <div className="h-4 w-36 bg-[#f3f4f6] rounded animate-pulse" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#f3f4f6] pb-0">
        {[80, 100, 120, 100].map((w, i) => (
          <div key={i} className="h-9 bg-[#f3f4f6] rounded-t-[6px] animate-pulse" style={{ width: w }} />
        ))}
      </div>

      {/* Content panel */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-6">
        <div className="grid grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="h-3 w-24 bg-[#f3f4f6] rounded animate-pulse mb-2" />
              <div className="h-5 w-48 bg-[#f3f4f6] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
