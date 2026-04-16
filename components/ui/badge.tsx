import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium border',
  {
    variants: {
      variant: {
        default:   'bg-[#FEF2F2] text-[#D51520] border-[#FECACA]',
        active:    'bg-green-50 text-green-700 border-green-200',
        upcoming:  'bg-blue-50 text-blue-700 border-blue-200',
        completed: 'bg-gray-100 text-gray-600 border-gray-200',
        pending:   'bg-amber-50 text-amber-700 border-amber-200',
        locked:    'bg-gray-100 text-gray-500 border-gray-200',
        new:       'bg-[#FEF2F2] text-[#D51520] border-[#FECACA]',
        outline:   'bg-transparent text-[#6B7280] border-[#E5E7EB]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
