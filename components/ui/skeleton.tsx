import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-shimmer rounded-[8px] bg-[#F3F4F6]', className)}
      {...props}
    />
  )
}

export { Skeleton }
