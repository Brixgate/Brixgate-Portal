import Link from 'next/link'
import { Video, FolderOpen, Award, Settings, ChevronRight } from 'lucide-react'

interface QuickLinkItem {
  label: string
  description: string
  href: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
}

const QUICK_LINKS: QuickLinkItem[] = [
  {
    label: 'Join Next Session',
    description: 'Session 05 — Thu 17 Apr',
    href: '/student/sessions',
    icon: Video,
    iconBg: '#CCFBF1',
    iconColor: '#0D9488',
  },
  {
    label: 'Browse Resources',
    description: '6 files available',
    href: '/student/resources',
    icon: FolderOpen,
    iconBg: '#DBEAFE',
    iconColor: '#2563EB',
  },
  {
    label: 'My Certificate',
    description: 'Progress: 33%',
    href: '/student/certificate',
    icon: Award,
    iconBg: '#ECD9FF',
    iconColor: '#7C3AED',
  },
  {
    label: 'Profile Settings',
    description: 'Update your details',
    href: '/student/settings',
    icon: Settings,
    iconBg: '#F3F4F6',
    iconColor: '#6B7280',
  },
]

export default function QuickLinks() {
  return (
    <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
      {/* Header */}
      <div className="px-6 pt-5 pb-4">
        <h3 className="text-[15px] font-semibold text-[#111827] font-[var(--font-dm-sans)]">
          Quick Links
        </h3>
      </div>
      <div className="h-px bg-[#F3F4F6]" />

      {/* Links */}
      <div className="p-4 space-y-1">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 px-3 py-3 rounded-[8px] hover:bg-[#F9FAFB] transition-colors group"
          >
            <div
              className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: link.iconBg }}
            >
              <link.icon
                className="w-[17px] h-[17px]"
                style={{ color: link.iconColor }}
                strokeWidth={2}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#111827]">{link.label}</p>
              <p className="text-[12px] text-[#9CA3AF]">{link.description}</p>
            </div>
            <ChevronRight
              className="w-4 h-4 text-[#D1D5DB] group-hover:text-[#9CA3AF] transition-colors flex-shrink-0"
              strokeWidth={2}
            />
          </Link>
        ))}
      </div>
    </div>
  )
}
