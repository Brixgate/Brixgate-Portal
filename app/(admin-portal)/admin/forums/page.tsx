'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  UserGroup02Icon, Add01Icon, PencilEdit01Icon, Delete01Icon,
  Search01Icon, Cancel01Icon, CheckmarkCircle01Icon, AlertCircleIcon,
  Loading01Icon, UserAdd01Icon, ArrowRight01Icon, BubbleChatAddIcon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ForumGroup {
  id: number
  name: string
  slug?: string
  description?: string
  status?: string
  visibility?: string
  member_count?: number
  memberCount?: number
}

interface ForumMember {
  id?: number
  user_id?: number; userId?: number
  user?: { id?: number; name?: string; first_name?: string; firstName?: string; last_name?: string; lastName?: string; email: string }
  role?: string
  status?: string
  source_cohort_id?: number
}

interface UserSearchResult {
  id: number
  name?: string
  first_name?: string; firstName?: string
  last_name?: string; lastName?: string
  email: string
}

function memberName(m: ForumMember): string {
  const u = m.user
  if (!u) return '—'
  if (u.name) return u.name
  const f = u.firstName ?? u.first_name ?? ''
  const l = u.lastName  ?? u.last_name  ?? ''
  return `${f} ${l}`.trim() || u.email
}

function userName(u: UserSearchResult): string {
  if (u.name) return u.name
  const f = u.firstName ?? u.first_name ?? ''
  const l = u.lastName  ?? u.last_name  ?? ''
  return `${f} ${l}`.trim() || u.email
}

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:   'bg-[#ecfdf3] text-[#027a48]',
  ARCHIVED: 'bg-[#f3f4f6] text-[#4b5563]',
}
const VISIBILITY_STYLE: Record<string, string> = {
  PRIVATE: 'bg-[#eff6ff] text-[#1d4ed8]',
  PUBLIC:  'bg-[#f0fdfa] text-[#0f766e]',
}

// ── Create/Edit modal ─────────────────────────────────────────────────────────
function GroupModal({
  group, onClose, onSaved,
}: {
  group: ForumGroup | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!group
  const [name,        setName]       = useState(group?.name        ?? '')
  const [description, setDesc]       = useState(group?.description ?? '')
  const [visibility,  setVisibility] = useState(group?.visibility  ?? 'PRIVATE')
  const [saving,      setSaving]     = useState(false)
  const [error,       setError]      = useState('')

  async function handleSave() {
    if (!name.trim()) { setError('Group name is required.'); return }
    setSaving(true); setError('')
    try {
      const body = { name: name.trim(), description: description.trim() || undefined, visibility }
      if (isEdit) {
        await apiClient.patch(`/admin/forum-groups/${group!.id}`, body)
      } else {
        await apiClient.post('/admin/forum-groups', body)
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(getApiError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-[12px] shadow-lg w-[480px] max-w-[95vw]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6]">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">
            {isEdit ? 'Edit Forum Group' : 'Create Forum Group'}
          </h2>
          <button onClick={onClose} className="text-[#4b5563] hover:text-[#111827] transition-colors">
            <Cancel01Icon size={18} strokeWidth={1.5} />
          </button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[#fef2f2] text-[#d51520] text-[13px]">
              <AlertCircleIcon size={14} strokeWidth={1.5} />
              {error}
            </div>
          )}
          <div>
            <label className="block text-[13px] font-semibold text-[#374151] mb-1.5 font-display">Group Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Software Engineering Alumni"
              className="w-full h-10 px-3 rounded-[6px] border border-[#e5e7eb] text-[14px] text-[#111827] font-body focus:outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520]"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#374151] mb-1.5 font-display">Description</label>
            <textarea
              value={description}
              onChange={e => setDesc(e.target.value)}
              rows={3}
              placeholder="Describe the forum group…"
              className="w-full px-3 py-2 rounded-[6px] border border-[#e5e7eb] text-[14px] text-[#111827] font-body focus:outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520] resize-none"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#374151] mb-1.5 font-display">Visibility</label>
            <select
              value={visibility}
              onChange={e => setVisibility(e.target.value)}
              className="w-full h-10 px-3 rounded-[6px] border border-[#e5e7eb] text-[14px] text-[#111827] font-body focus:outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520] bg-white"
            >
              <option value="PRIVATE">Private</option>
              <option value="PUBLIC">Public</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#f3f4f6]">
          <button onClick={onClose} className="h-9 px-4 rounded-[8px] border border-[#e5e7eb] text-[13px] font-semibold text-[#374151] font-display hover:bg-[#f9fafb] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 rounded-[8px] bg-[#d51520] text-white text-[13px] font-semibold font-display hover:bg-[#b91219] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loading01Icon size={14} className="animate-spin" />}
            {isEdit ? 'Save Changes' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Members panel ─────────────────────────────────────────────────────────────
function MembersPanel({
  group, onClose,
}: {
  group: ForumGroup
  onClose: () => void
}) {
  const [members,     setMembers]     = useState<ForumMember[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [searchRes,   setSearchRes]   = useState<UserSearchResult[]>([])
  const [searching,   setSearching]   = useState(false)
  const [addingId,    setAddingId]    = useState<number | null>(null)
  const [removingId,  setRemovingId]  = useState<number | null>(null)
  const [error,       setError]       = useState('')
  const [roleMap,     setRoleMap]     = useState<Record<number, string>>({})

  const loadMembers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.get(`/admin/forum-groups/${group.id}/members?size=100`)
      const raw = unwrap<{ members?: ForumMember[]; content?: ForumMember[] } | ForumMember[]>(res.data)
      const list: ForumMember[] = Array.isArray(raw) ? raw : raw?.members ?? (raw as { content?: ForumMember[] })?.content ?? []
      setMembers(list)
      const rm: Record<number, string> = {}
      for (const m of list) {
        const uid = m.user_id ?? m.userId ?? m.user?.id
        if (uid) rm[uid] = m.role ?? 'MEMBER'
      }
      setRoleMap(rm)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [group.id])

  useEffect(() => { loadMembers() }, [loadMembers])

  useEffect(() => {
    if (!search.trim()) { setSearchRes([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await apiClient.get(`/admin/users?search=${encodeURIComponent(search)}&size=10`)
        const raw = unwrap<{ users?: UserSearchResult[]; content?: UserSearchResult[] } | UserSearchResult[]>(res.data)
        const list: UserSearchResult[] = Array.isArray(raw) ? raw : raw?.users ?? (raw as { content?: UserSearchResult[] })?.content ?? []
        setSearchRes(list)
      } catch { setSearchRes([]) } finally { setSearching(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  async function addMember(user: UserSearchResult) {
    setAddingId(user.id); setError('')
    try {
      await apiClient.post(`/admin/forum-groups/${group.id}/members`, { user_id: user.id, role: 'MEMBER', status: 'ACTIVE' })
      setSearch(''); setSearchRes([])
      await loadMembers()
    } catch (e) { setError(getApiError(e)) } finally { setAddingId(null) }
  }

  async function removeMember(m: ForumMember) {
    const uid = m.user_id ?? m.userId ?? m.user?.id
    if (!uid) return
    setRemovingId(uid); setError('')
    try {
      await apiClient.delete(`/admin/forum-groups/${group.id}/members/${uid}`)
      await loadMembers()
    } catch (e) { setError(getApiError(e)) } finally { setRemovingId(null) }
  }

  async function updateRole(m: ForumMember, role: string) {
    const uid = m.user_id ?? m.userId ?? m.user?.id
    if (!uid) return
    setRoleMap(prev => ({ ...prev, [uid]: role }))
    try {
      await apiClient.patch(`/admin/forum-groups/${group.id}/members/${uid}`, { role })
    } catch { setRoleMap(prev => ({ ...prev, [uid]: m.role ?? 'MEMBER' })) }
  }

  const activeMembers = members.filter(m => (m.status ?? 'ACTIVE') !== 'REMOVED')

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[480px] bg-white h-full flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6] flex-shrink-0">
          <div>
            <h2 className="text-[15px] font-bold text-[#111827] font-display">{group.name}</h2>
            <p className="text-[12px] text-[#6b7280] font-body mt-0.5">{activeMembers.length} members</p>
          </div>
          <button onClick={onClose} className="text-[#4b5563] hover:text-[#111827] transition-colors">
            <Cancel01Icon size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Add member search */}
        <div className="px-5 py-4 border-b border-[#f3f4f6] flex-shrink-0">
          <p className="text-[12px] font-semibold text-[#374151] font-display mb-2">Add Member</p>
          <div className="relative">
            <Search01Icon size={14} color="#9ca3af" strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full h-9 pl-8 pr-3 rounded-[6px] border border-[#e5e7eb] text-[13px] text-[#111827] font-body focus:outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520]"
            />
          </div>
          {(searchRes.length > 0 || searching) && (
            <div className="mt-1 border border-[#e5e7eb] rounded-[8px] bg-white shadow-sm overflow-hidden">
              {searching && (
                <div className="flex items-center justify-center py-3">
                  <Loading01Icon size={16} className="animate-spin text-[#d51520]" />
                </div>
              )}
              {searchRes.map(u => {
                const alreadyMember = activeMembers.some(m => (m.user_id ?? m.userId ?? m.user?.id) === u.id)
                return (
                  <div key={u.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-[#f9fafb] border-b border-[#f3f4f6] last:border-b-0">
                    <div>
                      <p className="text-[13px] font-semibold text-[#111827] font-display">{userName(u)}</p>
                      <p className="text-[11px] text-[#6b7280] font-body">{u.email}</p>
                    </div>
                    {alreadyMember ? (
                      <span className="text-[11px] text-[#6b7280] font-body">Already member</span>
                    ) : (
                      <button
                        onClick={() => addMember(u)}
                        disabled={addingId === u.id}
                        className="flex items-center gap-1 h-7 px-3 rounded-[6px] bg-[#d51520] text-white text-[12px] font-semibold font-display hover:bg-[#b91219] transition-colors disabled:opacity-50"
                      >
                        {addingId === u.id ? <Loading01Icon size={12} className="animate-spin" /> : <UserAdd01Icon size={12} strokeWidth={2} />}
                        Add
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {error && (
            <p className="mt-2 text-[12px] text-[#d51520] font-body flex items-center gap-1">
              <AlertCircleIcon size={12} strokeWidth={1.5} /> {error}
            </p>
          )}
        </div>

        {/* Members list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loading01Icon size={20} className="animate-spin text-[#d51520]" />
            </div>
          ) : activeMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-[10px] bg-[#f3f4f6] flex items-center justify-center mb-3">
                <UserGroup02Icon size={20} color="#9ca3af" strokeWidth={1.5} />
              </div>
              <p className="text-[14px] font-semibold text-[#111827] font-display mb-1">No members yet</p>
              <p className="text-[13px] text-[#6b7280] font-body">Add members using the search above.</p>
            </div>
          ) : (
            <div>
              {activeMembers.map((m, i) => {
                const uid  = m.user_id ?? m.userId ?? m.user?.id ?? i
                const name = memberName(m)
                const email = m.user?.email ?? '—'
                const role  = roleMap[uid] ?? m.role ?? 'MEMBER'
                return (
                  <div key={uid} className="flex items-center gap-3 px-5 py-3 border-b border-[#f3f4f6] last:border-b-0 hover:bg-[#f9fafb]">
                    <div className="w-8 h-8 rounded-full bg-[#d51520] flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold text-white font-display">
                        {name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#111827] font-display truncate">{name}</p>
                      <p className="text-[11px] text-[#6b7280] font-body truncate">{email}</p>
                    </div>
                    <select
                      value={role}
                      onChange={e => updateRole(m, e.target.value)}
                      className="h-7 px-2 rounded-[6px] border border-[#e5e7eb] text-[12px] text-[#374151] font-body bg-white"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="MODERATOR">Moderator</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button
                      onClick={() => removeMember(m)}
                      disabled={removingId === uid}
                      className="text-[#9ca3af] hover:text-[#d51520] transition-colors flex-shrink-0"
                    >
                      {removingId === uid
                        ? <Loading01Icon size={15} className="animate-spin" />
                        : <Delete01Icon size={15} strokeWidth={1.5} />}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ForumGroupsPage() {
  const [groups,       setGroups]      = useState<ForumGroup[]>([])
  const [loading,      setLoading]     = useState(true)
  const [search,       setSearch]      = useState('')
  const [showModal,    setShowModal]   = useState(false)
  const [editTarget,   setEditTarget]  = useState<ForumGroup | null>(null)
  const [panelGroup,   setPanelGroup]  = useState<ForumGroup | null>(null)
  const [archivingId,  setArchivingId] = useState<number | null>(null)
  const [error,        setError]       = useState('')

  const loadGroups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/admin/forum-groups?size=100')
      const raw = unwrap<{ forum_groups?: ForumGroup[]; groups?: ForumGroup[]; content?: ForumGroup[] } | ForumGroup[]>(res.data)
      const list: ForumGroup[] = Array.isArray(raw)
        ? raw
        : raw?.forum_groups ?? raw?.groups ?? (raw as { content?: ForumGroup[] })?.content ?? []
      setGroups(list)
    } catch { setGroups([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadGroups() }, [loadGroups])

  async function archiveGroup(g: ForumGroup) {
    if (!confirm(`Archive "${g.name}"? Members will retain their records.`)) return
    setArchivingId(g.id); setError('')
    try {
      await apiClient.delete(`/admin/forum-groups/${g.id}`)
      await loadGroups()
    } catch (e) { setError(getApiError(e)) } finally { setArchivingId(null) }
  }

  const filtered = groups.filter(g =>
    !search || g.name.toLowerCase().includes(search.toLowerCase()) || (g.slug ?? '').includes(search.toLowerCase())
  )

  return (
    <div className="p-8 max-w-[1100px]">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] font-display">Forum Groups</h1>
          <p className="text-[13px] text-[#6b7280] font-body mt-0.5">
            Manage alumni communities. Graduates are added to groups at cohort closure.
          </p>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowModal(true) }}
          className="flex items-center gap-2 h-9 px-4 rounded-[8px] bg-[#d51520] text-white text-[13px] font-semibold font-display hover:bg-[#b91219] transition-colors"
        >
          <Add01Icon size={15} strokeWidth={2} />
          Create Group
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[8px] bg-[#fef2f2] text-[#d51520] text-[13px] mb-4">
          <AlertCircleIcon size={14} strokeWidth={1.5} />
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-5 max-w-[340px]">
        <Search01Icon size={14} color="#9ca3af" strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search groups…"
          className="w-full h-9 pl-8 pr-3 rounded-[8px] border border-[#e5e7eb] text-[13px] text-[#111827] font-body focus:outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520]"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_160px_120px_100px_100px_80px] items-center px-4 py-2.5 bg-[#f9fafb] border-b border-[#eaecf0]">
          {['Name', 'Slug', 'Visibility', 'Status', 'Members', ''].map(h => (
            <span key={h} className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280] font-display">{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loading01Icon size={24} className="animate-spin text-[#d51520]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-[10px] bg-[#f3f4f6] flex items-center justify-center mb-3">
              <BubbleChatAddIcon size={22} color="#9ca3af" strokeWidth={1.5} />
            </div>
            <p className="text-[14px] font-semibold text-[#111827] font-display mb-1">
              {search ? 'No groups match your search' : 'No forum groups yet'}
            </p>
            <p className="text-[13px] text-[#6b7280] font-body max-w-[280px]">
              {search ? 'Try a different keyword.' : 'Create your first alumni community group to get started.'}
            </p>
          </div>
        ) : (
          filtered.map(g => (
            <div
              key={g.id}
              className="grid grid-cols-[1fr_160px_120px_100px_100px_80px] items-center px-4 py-3.5 border-b border-[#f3f4f6] last:border-b-0 hover:bg-[#f9fafb] group"
            >
              {/* Name */}
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#111827] font-display truncate">{g.name}</p>
                {g.description && (
                  <p className="text-[11px] text-[#6b7280] font-body truncate mt-0.5">{g.description}</p>
                )}
              </div>
              {/* Slug */}
              <p className="text-[12px] text-[#6b7280] font-body truncate">{g.slug ?? '—'}</p>
              {/* Visibility */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-display w-fit ${VISIBILITY_STYLE[g.visibility ?? ''] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                {g.visibility ?? '—'}
              </span>
              {/* Status */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-display w-fit ${STATUS_STYLE[g.status ?? ''] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                {g.status ?? '—'}
              </span>
              {/* Members */}
              <p className="text-[13px] text-[#374151] font-body">{g.member_count ?? g.memberCount ?? '—'}</p>
              {/* Actions */}
              <div className="flex items-center gap-1 justify-end">
                <button
                  onClick={() => setPanelGroup(g)}
                  title="Manage members"
                  className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6] transition-colors"
                >
                  <ArrowRight01Icon size={14} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => { setEditTarget(g); setShowModal(true) }}
                  title="Edit group"
                  className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#6b7280] hover:text-[#111827] hover:bg-[#f3f4f6] transition-colors"
                >
                  <PencilEdit01Icon size={14} strokeWidth={1.5} />
                </button>
                {g.status !== 'ARCHIVED' && (
                  <button
                    onClick={() => archiveGroup(g)}
                    disabled={archivingId === g.id}
                    title="Archive group"
                    className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#6b7280] hover:text-[#d51520] hover:bg-[#fef2f2] transition-colors"
                  >
                    {archivingId === g.id ? <Loading01Icon size={14} className="animate-spin" /> : <Delete01Icon size={14} strokeWidth={1.5} />}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals / panels */}
      {showModal && (
        <GroupModal
          group={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
          onSaved={loadGroups}
        />
      )}
      {panelGroup && (
        <MembersPanel
          group={panelGroup}
          onClose={() => setPanelGroup(null)}
        />
      )}
    </div>
  )
}

