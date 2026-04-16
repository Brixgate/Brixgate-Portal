// ─────────────────────────────────────────────────────────────────────────────
// Brixgate Portal — Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ── Tailwind class merging (shadcn/ui standard) ────────────────────────────────
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// ── Currency formatting (Nigerian Naira) ──────────────────────────────────────
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ── Date formatting (WAT context) ─────────────────────────────────────────────

/** Format: "Monday, April 17, 2026" */
export function formatDateLong(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Africa/Lagos',
  }).format(date)
}

/** Format: "April 17, 2026" */
export function formatDateMedium(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Africa/Lagos',
  }).format(date)
}

/** Format: "17 Apr 2026" */
export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  }).format(date)
}

/** Format: "Thu, 17 Apr" */
export function formatDateCompact(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Africa/Lagos',
  }).format(date)
}

/** Format: "Tuesday, April 2026" (for dashboard header) */
export function formatMonthYear(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    timeZone: 'Africa/Lagos',
  }).format(date)
}

/** Relative time: "2 hours ago", "Yesterday", "3 days ago" */
export function formatRelativeTime(dateStr: string): string {
  const date   = new Date(dateStr)
  const now    = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffS  = Math.floor(diffMs / 1000)
  const diffM  = Math.floor(diffS / 60)
  const diffH  = Math.floor(diffM / 60)
  const diffD  = Math.floor(diffH / 24)

  if (diffS < 60)  return 'Just now'
  if (diffM < 60)  return `${diffM} minute${diffM !== 1 ? 's' : ''} ago`
  if (diffH < 24)  return `${diffH} hour${diffH !== 1 ? 's' : ''} ago`
  if (diffD === 1) return 'Yesterday'
  if (diffD < 7)   return `${diffD} days ago`
  return formatDateShort(dateStr)
}

/** Today's date formatted for display: "Tuesday, April 13, 2026" */
export function getTodayFormatted(): string {
  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Africa/Lagos',
  }).format(new Date())
}

// ── String utilities ──────────────────────────────────────────────────────────

/** "Adebayo Okafor" → "AO" */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

/** Truncate string with ellipsis */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

// ── Number utilities ──────────────────────────────────────────────────────────

/** Pad session number: 1 → "01", 12 → "12" */
export function padSessionNumber(n: number): string {
  return n.toString().padStart(2, '0')
}

// ── File type utilities ───────────────────────────────────────────────────────

export const FILE_TYPE_CONFIG = {
  pdf: {
    label: 'PDF',
    bg: 'bg-red-100',
    text: 'text-red-700',
    iconBg: 'bg-red-100',
    iconColor: '#DC2626',
  },
  pptx: {
    label: 'PPTX',
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    iconBg: 'bg-orange-100',
    iconColor: '#EA580C',
  },
  docx: {
    label: 'DOCX',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    iconBg: 'bg-blue-100',
    iconColor: '#2563EB',
  },
  zip: {
    label: 'ZIP',
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    iconBg: 'bg-purple-100',
    iconColor: '#7C3AED',
  },
  mp4: {
    label: 'MP4',
    bg: 'bg-teal-100',
    text: 'text-teal-700',
    iconBg: 'bg-teal-100',
    iconColor: '#0D9488',
  },
} as const

// ── Status badge utilities ────────────────────────────────────────────────────

export const SESSION_STATUS_CONFIG = {
  upcoming: {
    label: 'Upcoming',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
  },
  live: {
    label: 'Live Now',
    bg: 'bg-green-50',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    dot: 'bg-gray-400',
  },
} as const

export const ENROLLMENT_STATUS_CONFIG = {
  active: {
    label: 'Active',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  suspended: {
    label: 'Suspended',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
} as const

// ── Program category display ──────────────────────────────────────────────────
export function getProgramCategoryLabel(
  category: 'beginner' | 'professional'
): string {
  return category === 'beginner' ? 'AI for Beginners' : 'AI for Professionals'
}

// ── Route constants ───────────────────────────────────────────────────────────
export const ROUTES = {
  student: {
    dashboard:    '/student/dashboard',
    programs:     '/student/programs',
    program:      (id: string) => `/student/programs/${id}`,
    sessions:     (id: string) => `/student/programs/${id}/sessions`,
    resources:    (id: string) => `/student/programs/${id}/resources`,
    certificate:  (id: string) => `/student/programs/${id}/certificate`,
    notifications: '/student/notifications',
    settings:     '/student/settings',
  },
} as const

// ── Password strength ─────────────────────────────────────────────────────────
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong'

export function getPasswordStrength(password: string): {
  strength: PasswordStrength
  score: number
  label: string
  color: string
} {
  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password))  score++
  if (/[0-9]/.test(password))  score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { strength: 'weak',   score: 1, label: 'Weak',   color: '#EF4444' }
  if (score === 2) return { strength: 'fair',   score: 2, label: 'Fair',   color: '#F59E0B' }
  if (score === 3) return { strength: 'good',   score: 3, label: 'Good',   color: '#84CC16' }
  return           { strength: 'strong', score: 4, label: 'Strong', color: '#10B981' }
}
