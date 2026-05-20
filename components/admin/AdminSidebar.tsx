'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home01Icon,
  UserGroup02Icon,
  BookOpen01Icon,
  PresentationBarChart01Icon,
  File01Icon,
  Invoice01Icon,
  DiscountTag01Icon,
  UserSearch01Icon,
  Building01Icon,
  Award01Icon,
  BarChartIcon,
  Logout01Icon,
} from 'hugeicons-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAvatar } from '@/lib/use-avatar'
import { useAuth } from '@/lib/auth-context'

const LOGO_URL = '/images/Logo red.png'

const NAV_GROUPS = [
  {
    label: 'MAIN',
    items: [
      { label: 'Dashboard',    href: '/admin/dashboard',   icon: Home01Icon                 },
      { label: 'Users',        href: '/admin/users',        icon: UserGroup02Icon            },
      { label: 'Programmes',   href: '/admin/programs',     icon: BookOpen01Icon             },
      { label: 'Cohorts',      href: '/admin/cohorts',      icon: PresentationBarChart01Icon },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { label: 'Enrollments',  href: '/admin/enrollments',  icon: File01Icon                 },
      { label: 'Payments',     href: '/admin/payments',     icon: Invoice01Icon              },
      { label: 'Coupons',      href: '/admin/coupons',      icon: DiscountTag01Icon          },
    ],
  },
  {
    label: 'PIPELINE',
    items: [
      { label: 'Expert Applications',    href: '/admin/expert-applications',   icon: UserSearch01Icon  },
      { label: 'Organisation Requests',  href: '/admin/organization-requests', icon: Building01Icon    },
    ],
  },
  {
    label: 'CONTENT',
    items: [
      { label: 'Certificates', href: '/admin/certificates', icon: Award01Icon                },
      { label: 'Polls',        href: '/admin/polls',        icon: BarChartIcon               },
    ],
  },
]

function NavItem({
  href, icon: Icon, label, isActive,
}: { href: string; icon: React.ElementType; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        'flex items-center gap-[10px] px-3 py-[11px] rounded-[8px] w-full transition-colors duration-100',
        isActive ? 'bg-[#fef2f2]' : 'hover:bg-[#f7f8fa]'
      )}
    >
      <Icon size={18} color={isActive ? '#d51520' : '#374151'} strokeWidth={isActive ? 2 : 1.5} />
      <span className={cn(
        'text-[13px] leading-[18px] font-display whitespace-nowrap',
        isActive ? 'font-semibold text-[#d51520]' : 'font-medium text-[#374151]'
      )}>
        {label}
      </span>
    </Link>
  )
}

export default function AdminSidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const { avatar } = useAvatar()
  const { user, logout } = useAuth()

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : ''
  const initials    = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()
    : 'AD'

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  return (
    <aside className="bg-white flex flex-col h-screen sticky top-0 flex-shrink-0 w-[260px] border-r border-[#f3f4f6]">
      {/* Logo */}
      <div className="h-[64px] flex items-center px-5 border-b border-[#f3f4f6] flex-shrink-0">
        <div className="flex items-center gap-3">
          <Image
            src={LOGO_URL} alt="Brixgate" width={22} height={26}
            onError={(e) => {
              const t = e.currentTarget; t.style.display = 'none'
              const fb = t.nextElementSibling as HTMLElement | null
              fb?.classList.remove('hidden')
            }}
          />
          <div className="hidden w-[22px] h-[26px] rounded-[6px] bg-[#d51520] items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-[13px] font-display">B</span>
          </div>
          <div>
            <span className="text-[#111827] font-semibold text-[17px] font-display leading-[22px]">
              Brixgate
            </span>
            <span className="ml-2 text-[9px] font-bold uppercase tracking-widest text-[#d51520] font-display bg-[#fef2f2] px-1.5 py-0.5 rounded-[4px]">
              Admin
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9ca3af] font-display px-3 mb-1">
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="border-t border-[#e5e7eb] px-4 py-4 flex items-center gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={avatar ?? user?.profileImageUrl} alt={displayName} />
          <AvatarFallback className="bg-[#d51520] text-white text-[11px] font-bold font-display">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#111827] font-display truncate">{displayName}</p>
          <p className="text-[11px] text-[#9ca3af] font-body">Administrator</p>
        </div>
        <button
          aria-label="Logout" onClick={handleLogout}
          className="text-[#9ca3af] hover:text-[#d51520] transition-colors flex-shrink-0"
        >
          <Logout01Icon size={16} color="currentColor" strokeWidth={1.5} />
        </button>
      </div>
    </aside>
  )
}
