export default function StudentLoading() {
  return (
    <div className="px-4 md:px-8 pb-12">
      {/* Page header */}
      <div className="pt-7 pb-6">
        <div className="h-7 w-52 bg-[#f3f4f6] rounded-full animate-pulse mb-2" />
        <div className="h-4 w-72 bg-[#f3f4f6] rounded-full animate-pulse" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-[10px] border border-[#f3f4f6] p-6 animate-pulse">
            <div className="flex justify-between mb-4">
              <div className="h-3 w-24 bg-[#f3f4f6] rounded-full" />
              <div className="w-9 h-9 bg-[#f3f4f6] rounded-[8px]" />
            </div>
            <div className="h-8 w-16 bg-[#f3f4f6] rounded-full mb-1" />
            <div className="h-3 w-20 bg-[#f3f4f6] rounded-full" />
          </div>
        ))}
      </div>

      {/* Banner skeleton */}
      <div className="bg-[#f9fafb] rounded-[10px] border border-[#f3f4f6] p-6 mb-6 animate-pulse">
        <div className="h-3 w-24 bg-[#f3f4f6] rounded-full mb-3" />
        <div className="h-6 w-64 bg-[#f3f4f6] rounded-full mb-2" />
        <div className="h-4 w-48 bg-[#f3f4f6] rounded-full" />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-[10px] h-[220px] animate-pulse border border-[#f3f4f6]" />
          <div className="bg-white rounded-[10px] h-[260px] animate-pulse border border-[#f3f4f6]" />
        </div>
        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-[10px] h-[200px] animate-pulse border border-[#f3f4f6]" />
          <div className="bg-white rounded-[10px] h-[180px] animate-pulse border border-[#f3f4f6]" />
        </div>
      </div>
    </div>
  )
}
