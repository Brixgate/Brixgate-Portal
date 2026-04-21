export default function CourseLoading() {
  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Syllabus sidebar skeleton */}
      <aside className="w-[280px] flex-shrink-0 bg-white border-r border-[#f3f4f6] flex flex-col h-full p-5 gap-4">
        <div className="h-5 w-3/4 bg-[#f3f4f6] rounded-full animate-pulse" />
        <div className="h-3 w-1/2 bg-[#f3f4f6] rounded-full animate-pulse" />
        <div className="mt-2 flex flex-col gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#f3f4f6] animate-pulse flex-shrink-0" />
              <div className="h-3 rounded-full bg-[#f3f4f6] animate-pulse" style={{ width: `${55 + (i % 3) * 15}%` }} />
            </div>
          ))}
        </div>
      </aside>

      {/* Content skeleton */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 py-6 flex flex-col gap-5">
          <div className="h-6 w-64 bg-[#f3f4f6] rounded-full animate-pulse" />
          <div className="flex gap-3">
            <div className="h-8 w-24 bg-[#f3f4f6] rounded-full animate-pulse" />
            <div className="h-8 w-24 bg-[#f3f4f6] rounded-full animate-pulse" />
          </div>
          <div className="flex flex-col gap-3 mt-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-[#f3f4f6] rounded-full animate-pulse" style={{ width: `${70 + (i % 4) * 8}%` }} />
            ))}
          </div>
          <div className="bg-[#f3f4f6] rounded-[10px] h-[200px] animate-pulse mt-2" />
        </div>
      </div>
    </div>
  )
}
