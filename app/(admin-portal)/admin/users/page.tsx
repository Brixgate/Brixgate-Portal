'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  UserGroup02Icon, Add01Icon, Loading01Icon, Cancel01Icon,
  AlertCircleIcon, Search01Icon, RefreshIcon, Download01Icon,
  UserBlock01Icon, CheckmarkCircle01Icon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'
import AdminPageLoader from '@/components/admin/AdminPageLoader'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ApiUser {
  id: number
  name?: string
  full_name?: string
  first_name?: string; last_name?: string
  firstName?: string; lastName?: string
  email: string
  phone?: string; phone_number?: string; phoneNumber?: string; full_phone_number?: string; fullPhoneNumber?: string
  role?: string
  status?: number | string   // API returns 1 (active) or 0 (suspended)
  created_at?: string; createdAt?: string
  last_login_at?: string; lastLoginAt?: string
}

interface Pagination { page?: number; size?: number; totalElements?: number; total_elements?: number; total?: number; totalPages?: number; total_pages?: number; hasNext?: boolean; has_next?: boolean }

const ROLES = ['', 'STUDENT', 'INSTRUCTOR', 'ADMIN', 'PROSPECT', 'APPLICANT', 'EMPLOYER']
const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Student', INSTRUCTOR: 'Instructor', ADMIN: 'Admin',
  PROSPECT: 'Prospect', APPLICANT: 'Applicant', EMPLOYER: 'Employer',
}
const ROLE_STYLE: Record<string, string> = {
  ADMIN:      'bg-[#fef2f2] text-[#d51520]',
  INSTRUCTOR: 'bg-[#eff6ff] text-[#1d4ed8]',
  STUDENT:    'bg-[#ecfdf3] text-[#027a48]',
  PROSPECT:   'bg-[#fffbeb] text-[#b45309]',
  APPLICANT:  'bg-[#f5f3ff] text-[#7c3aed]',
  EMPLOYER:   'bg-[#f0f9ff] text-[#0369a1]',
}

function isActive(u: ApiUser): boolean {
  // API returns numeric 1/0; older records may return string 'ACTIVE'/'INACTIVE'
  if (u.status === 1 || u.status === '1' || u.status === 'ACTIVE') return true
  if (u.status === 0 || u.status === '0' || u.status === 'SUSPENDED' || u.status === 'INACTIVE') return false
  return true // default to active if unknown
}

function userName(u: ApiUser): string {
  if (u.name || u.full_name) return (u.name ?? u.full_name)!
  const f = u.firstName ?? u.first_name ?? ''
  const l = u.lastName  ?? u.last_name  ?? ''
  return `${f} ${l}`.trim() || u.email
}

function userPhone(u: ApiUser): string | null {
  return u.full_phone_number ?? u.fullPhoneNumber ?? u.phone ?? u.phone_number ?? u.phoneNumber ?? null
}

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase()
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_STYLE[role?.toUpperCase()] ?? 'bg-[#f3f4f6] text-[#374151]'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${cls}`}>
      {ROLE_LABELS[role?.toUpperCase()] ?? role}
    </span>
  )
}

// ── User detail sidebar ────────────────────────────────────────────────────────
function UserSidebar({
  userId, onClose, onStatusChanged,
}: { userId: number; onClose: () => void; onStatusChanged: (id: number, active: boolean) => void }) {
  const [user, setUser]           = useState<ApiUser | null>(null)
  const [loading, setLoading]     = useState(true)
  const [toggling, setToggling]   = useState(false)
  const [error, setError]         = useState('')
  const [confirm, setConfirm]     = useState(false)

  useEffect(() => {
    setLoading(true); setError('')
    apiClient.get(`/admin/users/${userId}`)
      .then(res => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = unwrap<any>(res.data)
        const u   = raw?.user ?? raw
        setUser(u)
      })
      .catch(() => setError('Could not load user details.'))
      .finally(() => setLoading(false))
  }, [userId])

  async function toggleStatus() {
    if (!user) return
    const newStatus = isActive(user) ? 0 : 1
    setToggling(true); setError(''); setConfirm(false)
    try {
      await apiClient.patch(`/admin/users/${user.id}`, { status: newStatus })
      const updated = { ...user, status: newStatus }
      setUser(updated)
      onStatusChanged(user.id, newStatus === 1)
    } catch (err) { setError(getApiError(err)) } finally { setToggling(false) }
  }

  const active = user ? isActive(user) : true
  const name   = user ? userName(user) : '—'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[400px] z-50 bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">User Details</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={15} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="flex flex-col gap-3">
              {[140, 200, 160, 120, 180, 100].map((w, i) => (
                <div key={i} className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: w }} />
              ))}
            </div>
          ) : error && !user ? (
            <div className="flex items-center gap-2 text-[13px] text-[#d51520] font-body">
              <AlertCircleIcon size={14} color="#d51520" strokeWidth={1.5} /> {error}
            </div>
          ) : user ? (
            <div className="flex flex-col gap-5">
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#f3f4f6] flex items-center justify-center flex-shrink-0">
                  <span className="text-[16px] font-bold text-[#374151] font-display">{initials(name)}</span>
                </div>
                <div>
                  <p className="text-[15px] font-bold text-[#111827] font-display">{name}</p>
                  <p className="text-[12px] text-[#4b5563] font-body">{user.email}</p>
                </div>
                <div className="ml-auto">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold font-display ${
                    active ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#fef2f2] text-[#d51520]'
                  }`}>
                    {active ? 'Active' : 'Suspended'}
                  </span>
                </div>
              </div>

              {/* Info rows */}
              <div className="rounded-[10px] border border-[#f3f4f6] overflow-hidden">
                {[
                  { label: 'Role',         value: user.role ? <RoleBadge role={user.role} /> : '—' },
                  { label: 'Phone',        value: userPhone(user) ?? '—' },
                  { label: 'Date Joined',  value: formatDate(user.createdAt ?? user.created_at) },
                  { label: 'Last Login',   value: formatDate(user.lastLoginAt ?? user.last_login_at) },
                  { label: 'User ID',      value: <span className="text-[12px] font-mono text-[#4b5563]">#{user.id}</span> },
                ].map(({ label, value }, i, arr) => (
                  <div key={label} className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? 'border-b border-[#f3f4f6]' : ''}`}>
                    <span className="text-[12px] text-[#6b7280] font-body">{label}</span>
                    <span className="text-[13px] font-medium text-[#111827] font-body text-right">{value}</span>
                  </div>
                ))}
              </div>

              {error && (
                <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
                  <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {error}
                </p>
              )}

              {/* Confirm step */}
              {confirm && (
                <div className={`rounded-[10px] border p-4 flex flex-col gap-3 ${active ? 'border-[#fecdca] bg-[#fef2f2]' : 'border-[#bbf7d0] bg-[#ecfdf3]'}`}>
                  <p className="text-[13px] font-semibold text-[#111827] font-display">
                    {active ? `Suspend ${name}?` : `Reactivate ${name}?`}
                  </p>
                  <p className="text-[12px] text-[#4b5563] font-body leading-relaxed">
                    {active
                      ? 'They will lose access to the portal immediately. You can reactivate them at any time.'
                      : 'Their account will be restored and they can log in again.'}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirm(false)}
                      className="flex-1 h-9 rounded-[8px] border border-[#e5e7eb] text-[12px] font-medium font-body hover:bg-white transition-colors">
                      Cancel
                    </button>
                    <button onClick={toggleStatus} disabled={toggling}
                      className={`flex-1 h-9 rounded-[8px] text-[12px] font-semibold text-white font-display disabled:opacity-60 flex items-center justify-center gap-1.5 transition-colors ${
                        active ? 'bg-[#d51520] hover:bg-[#b81119]' : 'bg-[#027a48] hover:bg-[#065f46]'
                      }`}>
                      {toggling && <Loading01Icon size={12} className="animate-spin" strokeWidth={2} />}
                      {active ? 'Yes, Suspend' : 'Yes, Reactivate'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer action */}
        {user && !confirm && (
          <div className="px-5 py-4 border-t border-[#f3f4f6]">
            <button
              onClick={() => setConfirm(true)}
              className={`w-full h-10 rounded-[8px] text-[13px] font-semibold font-display flex items-center justify-center gap-2 transition-colors ${
                active
                  ? 'border border-[#fecdca] bg-[#fef2f2] text-[#d51520] hover:bg-[#fee2e2]'
                  : 'border border-[#bbf7d0] bg-[#ecfdf3] text-[#027a48] hover:bg-[#d1fae5]'
              }`}
            >
              {active
                ? <><UserBlock01Icon size={15} strokeWidth={1.5} /> Suspend Account</>
                : <><CheckmarkCircle01Icon size={15} strokeWidth={1.5} /> Reactivate Account</>
              }
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── CSV export helpers ────────────────────────────────────────────────────────
function downloadCSV(rows: ApiUser[], filename: string) {
  const esc = (s: string) => `"${(String(s ?? '')).replace(/"/g, '""')}"`
  const lines = [
    ['Name', 'Email', 'Phone', 'Role', 'Status', 'Date Joined'].join(','),
    ...rows.map(u => [
      esc(userName(u)),
      esc(u.email ?? ''),
      esc(userPhone(u) ?? ''),
      esc(u.role ?? ''),
      esc(isActive(u) ? 'Active' : 'Suspended'),
      esc(formatDate(u.createdAt ?? u.created_at)),
    ].join(',')),
  ]
  const csv = '﻿' + lines.join('\n')
  const a   = document.createElement('a')
  a.href    = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => document.body.removeChild(a), 150)
}

// ── Create user modal ─────────────────────────────────────────────────────────
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'STUDENT' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (!form.email.trim()) { setError('Email is required.'); return }
    setSaving(true)
    try {
      await apiClient.post('/admin/users', { name: form.name.trim(), email: form.email.trim(), role: form.role })
      onCreated()
    } catch (err) {
      setError(getApiError(err))
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[440px] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">Create User</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={15} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Full Name</label>
            <input
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Adunola Okafor"
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#4b5563] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Email Address</label>
            <input
              type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="adunola@example.com"
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#4b5563] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Role</label>
            <select
              value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              className="w-full h-10 pl-3 pr-8 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 bg-white"
            >
              {ROLES.filter(Boolean).map(r => <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>)}
            </select>
          </div>
          <p className="text-[11px] text-[#4b5563] font-body -mt-2">
            The user will receive an email to set up their password.
          </p>
          {error && (
            <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
              <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users, setUsers]           = useState<ApiUser[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage]             = useState(1)
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [exporting, setExporting]   = useState(false)
  const [exportError, setExportError] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const exportRef                   = useRef<HTMLDivElement>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), size: '20' })
      if (roleFilter) params.set('role', roleFilter)
      const res  = await apiClient.get(`/admin/users?${params}`)
      const data = unwrap<{ users?: ApiUser[]; pagination?: Pagination }>(res.data)
      setUsers(Array.isArray(data?.users) ? data.users : [])
      if (data?.pagination) setPagination(data.pagination)
    } catch { setUsers([]) } finally { setLoading(false) }
  }, [page, roleFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // Close export dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false)
      }
    }
    if (showExport) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showExport])

  async function handleExport(exportAll: boolean) {
    setShowExport(false); setExporting(true); setExportError('')
    try {
      const role = exportAll ? '' : roleFilter
      // Fetch a large page in one shot — avoids the pagination loop that can fail mid-way
      const params = new URLSearchParams({ page: '1', size: '1000' })
      if (role) params.set('role', role)
      const res  = await apiClient.get(`/admin/users?${params}`)
      const data = unwrap<{ users?: ApiUser[]; content?: ApiUser[] }>(res.data)
      const rows: ApiUser[] = Array.isArray(data)
        ? data
        : (data?.users ?? (data as { content?: ApiUser[] })?.content ?? [])
      if (rows.length === 0) { setExportError('No users found to export.'); return }
      const label = role ? (ROLE_LABELS[role] ?? role).toLowerCase() : 'all'
      downloadCSV(rows, `brixgate-users-${label}-${new Date().toISOString().slice(0, 10)}.csv`)
    } catch (err) {
      setExportError(getApiError(err))
    } finally { setExporting(false) }
  }

  function handleStatusChanged(id: number, active: boolean) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: active ? 1 : 0 } : u))
  }

  const filtered = search.trim()
    ? users.filter(u => userName(u).toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    : users

  return (
    <div className="p-8">
      {loading && users.length === 0 && <AdminPageLoader />}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] font-display">Users</h1>
          <p className="text-[13px] text-[#4b5563] font-body mt-0.5">Manage all users, roles and access</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export button */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setShowExport(v => !v)}
              disabled={exporting}
              className="flex items-center gap-2 h-10 px-4 border border-[#e5e7eb] rounded-[8px] text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors disabled:opacity-60"
            >
              {exporting
                ? <Loading01Icon size={14} className="animate-spin" strokeWidth={2} />
                : <Download01Icon size={14} strokeWidth={1.5} />
              }
              Export
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-1.5 w-[230px] bg-white rounded-[10px] border border-[#e5e7eb] shadow-lg z-20 overflow-hidden py-1">
                <button
                  onClick={() => handleExport(false)}
                  className="w-full px-4 py-3 text-left hover:bg-[#f9fafb] transition-colors"
                >
                  <p className="text-[13px] font-semibold text-[#111827] font-display">
                    {roleFilter ? `Export ${ROLE_LABELS[roleFilter] ?? roleFilter}s` : 'Export current view'}
                  </p>
                  <p className="text-[11px] text-[#4b5563] font-body mt-0.5">
                    {roleFilter ? `Only ${ROLE_LABELS[roleFilter] ?? roleFilter} users` : 'All users, no role filter'}
                  </p>
                </button>
                <div className="h-px bg-[#f3f4f6] mx-2" />
                <button
                  onClick={() => handleExport(true)}
                  className="w-full px-4 py-3 text-left hover:bg-[#f9fafb] transition-colors"
                >
                  <p className="text-[13px] font-semibold text-[#111827] font-display">Export all users</p>
                  <p className="text-[11px] text-[#4b5563] font-body mt-0.5">Every role, no filters applied</p>
                </button>
              </div>
            )}
          </div>

          {/* Create User */}
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 h-10 px-4 bg-[#d51520] text-white rounded-[8px] text-[13px] font-semibold font-display hover:bg-[#b81119] transition-colors">
            <Add01Icon size={15} strokeWidth={2} /> Create User
          </button>
        </div>
      </div>

      {/* Export error */}
      {exportError && (
        <div className="mb-6 flex items-center gap-2 text-[13px] text-[#d51520] font-body bg-[#fef2f2] border border-[#fecdca] rounded-[8px] px-4 py-3">
          <AlertCircleIcon size={14} color="#d51520" strokeWidth={1.5} />
          {exportError}
          <button onClick={() => setExportError('')} className="ml-auto text-[#d51520] hover:text-[#b81119]">
            <Cancel01Icon size={13} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-[320px]">
          <Search01Icon size={14} color="#4b5563" strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full h-9 pl-8 pr-3 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body text-[#111827] placeholder:text-[#4b5563] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10"
          />
        </div>
        <select
          value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1) }}
          className="h-9 pl-3 pr-8 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body text-[#374151] outline-none focus:border-[#d51520] bg-white"
        >
          {ROLES.map(r => <option key={r} value={r}>{r ? ROLE_LABELS[r] : 'All Roles'}</option>)}
        </select>
        <button onClick={fetchUsers}
          className="h-9 w-9 flex items-center justify-center border border-[#e5e7eb] rounded-[8px] hover:bg-[#f9fafb] transition-colors">
          <RefreshIcon size={14} color="#4b5563" strokeWidth={1.5} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                {['Name', 'Email', 'Phone', 'Role', 'Status', 'Joined'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#4b5563] font-display">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#f3f4f6]">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: j === 0 ? 140 : j === 1 ? 180 : j === 2 ? 120 : 80 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <UserGroup02Icon size={32} color="#d1d5db" strokeWidth={1.5} className="mx-auto mb-3" />
                    <p className="text-[14px] font-semibold text-[#111827] font-display">No users found</p>
                    <p className="text-[13px] text-[#4b5563] font-body mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                filtered.map(u => {
                  const active = isActive(u)
                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3.5">
                        <p className="text-[13px] font-medium text-[#111827] font-body">{userName(u)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-[13px] text-[#4b5563] font-body">{u.email}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-[13px] text-[#4b5563] font-body">
                          {userPhone(u) ?? <span className="text-[#d1d5db]">—</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        {u.role ? <RoleBadge role={u.role} /> : <span className="text-[#d1d5db]">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${
                          active ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#fef2f2] text-[#d51520]'
                        }`}>
                          {active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-[12px] text-[#4b5563] font-body">
                          {formatDate(u.createdAt ?? u.created_at)}
                        </p>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (pagination.totalPages ?? pagination.total_pages ?? 1) > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-[#f3f4f6]">
            <p className="text-[12px] text-[#4b5563] font-body">
              {(() => {
                const total = pagination.totalElements ?? pagination.total_elements ?? pagination.total ?? 0
                return `Showing ${((page - 1) * 20) + 1}–${Math.min(page * 20, total)} of ${total.toLocaleString()}`
              })()}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body text-[#374151] disabled:opacity-40 hover:bg-[#f9fafb] transition-colors">
                Prev
              </button>
              <span className="h-7 px-3 flex items-center text-[12px] font-body text-[#374151]">
                {page} / {pagination.totalPages ?? pagination.total_pages ?? 1}
              </span>
              <button onClick={() => setPage(p => p + 1)} disabled={!(pagination.hasNext ?? pagination.has_next ?? false)}
                className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body text-[#374151] disabled:opacity-40 hover:bg-[#f9fafb] transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchUsers() }}
        />
      )}

      {selectedUserId != null && (
        <UserSidebar
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onStatusChanged={(id, active) => {
            handleStatusChanged(id, active)
            setSelectedUserId(null)
          }}
        />
      )}
    </div>
  )
}
