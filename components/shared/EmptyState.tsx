import Link from 'next/link'

interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="w-14 h-14 rounded-[12px] bg-[#f7f8fa] flex items-center justify-center mb-4">
        <Icon size={26} color="#9ca3af" strokeWidth={1.5} />
      </div>
      <p className="text-[15px] font-semibold text-[#111827] font-display mb-1.5">{title}</p>
      <p className="text-[13px] text-[#9ca3af] font-body max-w-[280px] leading-relaxed">
        {description}
      </p>
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex items-center justify-center bg-[#d51520] text-white text-[13px] font-medium font-display px-4 py-2 rounded-[8px] hover:bg-[#b81119] transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
