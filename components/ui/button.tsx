import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[8px] text-[14px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D51520]/20',
  {
    variants: {
      variant: {
        default:
          'bg-[#D51520] text-white hover:bg-[#B81119]',
        secondary:
          'bg-white border border-[#D1D5DB] text-[#111827] hover:bg-[#F3F4F6]',
        ghost:
          'bg-transparent text-[#6B7280] hover:bg-[#F3F4F6]',
        destructive:
          'bg-white border border-[#FECACA] text-[#D51520] hover:bg-[#FEF2F2]',
        link:
          'text-[#D51520] underline-offset-4 hover:underline bg-transparent',
        outline:
          'border border-[#E5E7EB] bg-white text-[#111827] hover:bg-[#F9FAFB]',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        default: 'h-10 px-4',
        lg: 'h-11 px-5 text-[15px]',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
