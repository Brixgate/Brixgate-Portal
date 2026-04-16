'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home01Icon,
  BookOpen01Icon,
  Notification01Icon,
  Folder01Icon,
  Settings01Icon,
  Logout01Icon,
} from 'hugeicons-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MOCK_STUDENT } from '@/lib/mock-data'
import { useSidebar } from '@/lib/sidebar-context'
import { useAvatar } from '@/lib/use-avatar'

const LOGO_URL = 'https://www.figma.com/api/mcp/asset/de505de2-9589-4fc7-95d6-b063a224101f'

const NAV_ITEMS = [
  { label: 'Dashboard',        href: '/student/dashboard',    icon: Home01Icon         },
  { label: 'My Programs',      href: '/student/programs',     icon: BookOpen01Icon     },
  { label: 'Notifications',    href: '/student/notifications', icon: Notification01Icon },
  { label: 'Resources',        href: '/student/resources',    icon: Folder01Icon       },
  { label: 'Profile Settings', href: '/student/settings',     icon: Settings01Icon     },
]

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
  onNavigate,
  forceCollapsed,
}: {
  href: string
  icon: React.ElementType
  label: string
  isActive: boolean
  onNavigate?: () => void
  forceCollapsed?: boolean
}) {
  return (
    <Link
      href={href}
      title={label}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-[10px] px-3 py-[14px] rounded-[8px] w-full transition-colors duration-100',
        // Centre when icon-only, left-align when full
        forceCollapsed
          ? 'justify-center'
          : 'justify-center lg:justify-start max-[400px]:justify-start',
        isActive ? 'bg-[#fef2f2]' : 'hover:bg-[#f7f8fa]'
      )}
    >
      <Icon
        size={20}
        color={isActive ? '#d51520' : '#374151'}
        strokeWidth={isActive ? 2 : 1.5}
      />
      <span
        className={cn(
          'text-[14px] leading-[20px] font-display whitespace-nowrap',
          // Hide label when force-collapsed, otherwise normal responsive rules
          forceCollapsed ? 'hidden' : 'hidden lg:inline max-[400px]:inline',
          isActive ? 'font-semibold text-[#d51520]' : 'font-medium text-[#374151]'
        )}
      >
        {label}
      </span>
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const { mobileOpen, closeMobile } = useSidebar()
  const { avatar } = useAvatar()
  const initials = `${MOCK_STUDENT.firstName[0]}${MOCK_STUDENT.lastName[0]}`

  // Collapse to icon-only on course detail pages — they have their own sidebar
  const forceCollapsed = pathname.startsWith('/student/courses/')

  return (
    <>
      {/* Mobile backdrop — only active below 400px */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 transition-opacity duration-300',
          'min-[400px]:hidden',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={closeMobile}
      />

      {/*
        Three responsive modes:
        < 400px  : fixed overlay drawer (260px), slides in/out
        400–1024 : sticky in-flow icon-only (64px)
        1024px+  : sticky in-flow full sidebar (270px)
      */}
      <aside
        className={cn(
          'bg-white flex flex-col h-screen transition-all duration-300',
          // Mobile drawer
          'max-[400px]:fixed max-[400px]:inset-y-0 max-[400px]:left-0 max-[400px]:z-50 max-[400px]:w-[260px]',
          mobileOpen ? 'max-[400px]:translate-x-0' : 'max-[400px]:-translate-x-full',
          // Tablet: sticky in flow, icon-only
          'min-[400px]:sticky min-[400px]:top-0 min-[400px]:flex-shrink-0',
          'min-[400px]:max-lg:w-16 min-[400px]:max-lg:translate-x-0',
          // Desktop: full sidebar — collapse to icon-only on course detail pages
          forceCollapsed ? 'lg:w-16' : 'lg:w-[270px]',
        )}
      >
        {/* Logo */}
        <div className="h-[84px] flex items-center justify-center lg:justify-start lg:px-6 max-[400px]:justify-start max-[400px]:px-5 border-b border-[#f3f4f6]">
          <div className="flex items-center gap-3">
            <img
              src={LOGO_URL}
              alt="Brixgate"
              width={22}
              height={26}
              className="flex-shrink-0"
              onError={(e) => {
                const target = e.currentTarget
                target.style.display = 'none'
                const fallback = target.nextElementSibling as HTMLElement | null
                fallback?.classList.remove('hidden')
              }}
            />
            <div className="hidden w-[22px] h-[26px] rounded-[6px] bg-[#d51520] items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-[13px] font-display">B</span>
            </div>
            {/* Wordmark: desktop + mobile drawer, hidden on tablet or when force-collapsed */}
            <span className={cn(
              'text-[#111827] font-semibold text-[18px] font-display leading-[24px]',
              forceCollapsed ? 'hidden' : 'hidden lg:block max-[400px]:block'
            )}>
              Brixgate
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-2 lg:px-2 max-[400px]:px-3">
          {NAV_ITEMS.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
              onNavigate={closeMobile}
              forceCollapsed={forceCollapsed}
            />
          ))}
        </nav>

        {/* User card */}
        <div className="border-t border-[#e5e7eb]">
          {/* Desktop: full — icon-only when force-collapsed */}
          <div className={cn(
            'items-center gap-3 py-5',
            forceCollapsed
              ? 'hidden lg:flex justify-center px-0'
              : 'hidden lg:flex px-7 py-7'
          )}>
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarImage src={avatar ?? MOCK_STUDENT.avatar} alt={MOCK_STUDENT.firstName} />
              <AvatarFallback className="bg-[#d51520] text-white text-[12px] font-bold font-display">{initials}</AvatarFallback>
            </Avatar>
            {!forceCollapsed && (
              <>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-[13px] font-semibold text-[#111827] font-display leading-[18px] truncate">
                    {MOCK_STUDENT.firstName} {MOCK_STUDENT.lastName}
                  </p>
                  <p className="text-[11px] text-[#6b7280] font-body leading-[14px] capitalize">
                    {MOCK_STUDENT.role}
                  </p>
                </div>
                <button aria-label="Logout" className="text-[#9ca3af] hover:text-[#6b7280] transition-colors flex-shrink-0">
                  <Logout01Icon size={18} color="currentColor" strokeWidth={1.5} />
                </button>
              </>
            )}
          </div>

          {/* Mobile drawer: full */}
          <div className="max-[400px]:flex hidden items-center gap-3 px-5 py-5">
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarImage src={avatar ?? MOCK_STUDENT.avatar} alt={MOCK_STUDENT.firstName} />
              <AvatarFallback className="bg-[#d51520] text-white text-[12px] font-bold font-display">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#111827] font-display">
                {MOCK_STUDENT.firstName} {MOCK_STUDENT.lastName}
              </p>
              <p className="text-[11px] text-[#6b7280] font-body capitalize">{MOCK_STUDENT.role}</p>
            </div>
          </div>

          {/* Tablet: avatar only */}
          <div className="min-[400px]:flex lg:hidden max-[400px]:hidden items-center justify-center py-5">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatar ?? MOCK_STUDENT.avatar} alt={MOCK_STUDENT.firstName} />
              <AvatarFallback className="bg-[#d51520] text-white text-[11px] font-bold font-display">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </aside>
    </>
  )
}
