'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  UserGroup02Icon, Add01Icon, Loading01Icon, Cancel01Icon,
  AlertCircleIcon, Search01Icon, RefreshIcon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ApiUser {
  id: number
  name?: string
  first_name?: string; last_name?: string
  firstName?: string; lastName?: string
  email: string
  role?: string
  status?: string
  created_at?: string; createdAt?: string
}

interface Pagination { page: number; size: number; totalElements: number; totalPages: number; hasNext?: boolean }

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

function userName(u: ApiUser): string {
  if (u.name) return u.name
  const f = u.firstName ?? u.first_name ?? ''
  const l = u.lastName  ?? u.last_name  ?? ''
  return `${f} ${l}`.trim() || u.email
}

function RoleBadge({ role }: { role: string }) {
  const cls = ROLE_STYLE[role?.toUpperCase()] ?? 'bg-[#f3f4f6] text-[#374151]'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${cls}`}>
      {ROLE_LABELS[role?.toUpperCase()] ?? role}
    </span>
  )
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
            <Cancel01Icon size={15} color="#6b7280" strokeWidth={1.5} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Full Name</label>
            <input
              value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Adunola Okafor"
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Email Address</label>
            <input
              type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="adunola@example.com"
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Role</label>
            <select
              value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 bg-white"
            >
              {ROLES.filter(Boolean).map(r => <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>)}
            </select>
          </div>
          <p className="text-[11px] text-[#9ca3af] font-body -mt-2">
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
  const [users, setUsers]         = useState<ApiUser[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage]           = useState(1)
  const [roleFilter, setRoleFilter] = useState('')
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [showCreate, setShowCreate] = useState(false)

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

  const filtered = search.trim()
    ? users.filter(u => userName(u).toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    : users

  function formatDate(d?: string) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[24px] font-bold text-[#111827] font-display">Users</h1>
          <p className="text-[14px] text-[#6b7280] font-body mt-0.5">
            {pagination ? `${pagination.totalElements.toLocaleString()} total users` : 'Manage all users'}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 h-10 px-4 bg-[#d51520] text-white rounded-[8px] text-[13px] font-semibold font-display hover:bg-[#b81119] transition-colors">
          <Add01Icon size={15} strokeWidth={2} /> Create User
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-[320px]">
          <Search01Icon size={14} color="#9ca3af" strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full h-9 pl-8 pr-3 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10"
          />
        </div>
        <select
          value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1) }}
          className="h-9 px-3 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body text-[#374151] outline-none focus:border-[#d51520] bg-white"
        >
          {ROLES.map(r => <option key={r} value={r}>{r ? ROLE_LABELS[r] : 'All Roles'}</option>)}
        </select>
        <button onClick={fetchUsers}
          className="h-9 w-9 flex items-center justify-center border border-[#e5e7eb] rounded-[8px] hover:bg-[#f9fafb] transition-colors">
          <RefreshIcon size={14} color="#6b7280" strokeWidth={1.5} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                {['Name', 'Email', 'Role', 'Status', 'Joined'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7280] font-display">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#f3f4f6]">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: j === 0 ? 140 : j === 1 ? 180 : 80 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <UserGroup02Icon size={32} color="#d1d5db" strokeWidth={1.5} className="mx-auto mb-3" />
                    <p className="text-[14px] font-semibold text-[#111827] font-display">No users found</p>
                    <p className="text-[13px] text-[#9ca3af] font-body mt-1">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="text-[13px] font-medium text-[#111827] font-body">{userName(u)}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-[13px] text-[#6b7280] font-body">{u.email}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      {u.role ? <RoleBadge role={u.role} /> : <span className="text-[#d1d5db]">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${
                        u.status === 'ACTIVE' ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#f3f4f6] text-[#6b7280]'
                      }`}>
                        {u.status ?? 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-[12px] text-[#9ca3af] font-body">
                        {formatDate(u.createdAt ?? u.created_at)}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-[#f3f4f6]">
            <p className="text-[12px] text-[#6b7280] font-body">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, pagination.totalElements)} of {pagination.totalElements.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body text-[#374151] disabled:opacity-40 hover:bg-[#f9fafb] transition-colors">
                Prev
              </button>
              <span className="h-7 px-3 flex items-center text-[12px] font-body text-[#374151]">
                {page} / {pagination.totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={!pagination.hasNext}
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
    </div>
  )
}
