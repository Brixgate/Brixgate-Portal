'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Home01Icon,
  BookOpen01Icon,
  Notification01Icon,
  Folder01Icon,
  Settings01Icon,
  Logout01Icon,
  Award01Icon,
} from 'hugeicons-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSidebar } from '@/lib/sidebar-context'
import { useAvatar } from '@/lib/use-avatar'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

const LOGO_URL = '/images/Logo red.png'

const NAV_ITEMS = [
  { label: 'Dashboard',        href: '/student/dashboard',    icon: Home01Icon         },
  { label: 'My Programs',      href: '/student/programs',     icon: BookOpen01Icon     },
  { label: 'My Certificate',   href: '/student/certificate',  icon: Award01Icon        },
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
          : 'justify-center lg:justify-start max-lg:justify-start',
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
          // Hide label when force-collapsed, otherwise show in drawer (max-lg) and desktop (lg+)
          forceCollapsed ? 'hidden' : 'hidden lg:inline max-lg:inline',
          isActive ? 'font-semibold text-[#d51520]' : 'font-medium text-[#374151]'
        )}
      >
        {label}
      </span>
    </Link>
  )
}

export default function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const { mobileOpen, closeMobile } = useSidebar()
  const { avatar } = useAvatar()
  const { user, logout } = useAuth()

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : ''
  const initials    = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : '??'

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  // Collapse to icon-only on course detail pages — they have their own sidebar
  const forceCollapsed = pathname.startsWith('/student/courses/')

  return (
    <>
      {/* Mobile backdrop — only active below lg (1024px) */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 transition-opacity duration-300',
          'lg:hidden',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={closeMobile}
      />

      {/*
        Two responsive modes:
        < 1024px : fixed overlay drawer (260px), slides in/out
        1024px+  : sticky in-flow full sidebar (270px)
      */}
      <aside
        className={cn(
          'bg-white flex flex-col h-screen transition-all duration-300',
          // Mobile/tablet: fixed overlay drawer
          'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-[260px]',
          mobileOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
          // Desktop: sticky in-flow, always visible
          'lg:sticky lg:top-0 lg:flex-shrink-0 lg:translate-x-0',
          // Desktop: collapse to icon-only on course detail pages
          forceCollapsed ? 'lg:w-16' : 'lg:w-[270px]',
        )}
      >
        {/* Logo */}
        <div className="h-[64px] flex items-center justify-center lg:justify-start lg:px-6 max-lg:justify-start max-lg:px-5 border-b border-[#f3f4f6]">
          <div className="flex items-center gap-3">
            <Image
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
            {/* Wordmark: desktop + mobile drawer, hidden when force-collapsed */}
            <span className={cn(
              'text-[#111827] font-semibold text-[18px] font-display leading-[24px]',
              forceCollapsed ? 'hidden' : 'block'
            )}>
              Brixgate
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-2 lg:px-2 max-lg:px-3">
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
          {/* Full user card — shown in drawer (max-lg) and desktop (lg) unless force-collapsed */}
          <div className={cn(
            'flex items-center gap-3 px-5 py-5',
            forceCollapsed ? 'lg:justify-center lg:px-0' : ''
          )}>
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarImage src={avatar ?? user?.profileImageUrl} alt={displayName} />
              <AvatarFallback className="bg-[#d51520] text-white text-[12px] font-bold font-display">{initials}</AvatarFallback>
            </Avatar>
            {!forceCollapsed && (
              <>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-[13px] font-semibold text-[#111827] font-display leading-[18px] truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-[#6b7280] font-body leading-[14px] capitalize">
                    {user?.role?.toLowerCase() ?? 'student'}
                  </p>
                </div>
                <button
                  aria-label="Logout"
                  onClick={handleLogout}
                  className="text-[#9ca3af] hover:text-[#d51520] transition-colors flex-shrink-0"
                >
                  <Logout01Icon size={18} color="currentColor" strokeWidth={1.5} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
