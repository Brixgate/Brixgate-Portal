export default function StudentLoading() {
  return (
    <div className="px-4 md:px-8 pb-10">
      {/* Topnav skeleton */}
      <div className="h-[64px] border-b border-[#f3f4f6] bg-white -mx-8 px-8 flex items-center gap-4 mb-0">
        <div className="h-4 w-32 bg-[#f3f4f6] rounded-full animate-pulse" />
        <div className="flex-1" />
        <div className="h-9 w-[280px] bg-[#f3f4f6] rounded-[8px] animate-pulse hidden min-[400px]:block" />
        <div className="h-9 w-9 bg-[#f3f4f6] rounded-full animate-pulse" />
        <div className="h-9 w-9 bg-[#f3f4f6] rounded-full animate-pulse" />
      </div>

      {/* Page header skeleton */}
      <div className="pt-7 pb-6">
        <div className="h-7 w-48 bg-[#f3f4f6] rounded-full animate-pulse mb-2" />
        <div className="h-4 w-72 bg-[#f3f4f6] rounded-full animate-pulse" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-[10px] border border-[#f3f4f6] p-6 h-[108px] animate-pulse">
            <div className="flex justify-between mb-4">
              <div className="h-3 w-24 bg-[#f3f4f6] rounded-full" />
              <div className="w-9 h-9 bg-[#f3f4f6] rounded-[8px]" />
            </div>
            <div className="h-8 w-16 bg-[#f3f4f6] rounded-full" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-[10px] h-[180px] animate-pulse border border-[#f3f4f6]" />
          <div className="bg-white rounded-[10px] h-[280px] animate-pulse border border-[#f3f4f6]" />
        </div>
        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-[10px] h-[200px] animate-pulse border border-[#f3f4f6]" />
          <div className="bg-white rounded-[10px] h-[160px] animate-pulse border border-[#f3f4f6]" />
        </div>
      </div>
    </div>
  )
}
