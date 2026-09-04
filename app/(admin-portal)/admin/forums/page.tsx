'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  UserGroup02Icon, Add01Icon, PencilEdit01Icon, Delete01Icon,
  Search01Icon, Cancel01Icon, AlertCircleIcon,
  Loading01Icon, UserAdd01Icon, ArrowRight01Icon, BubbleChatAddIcon,
  ArrowDown01Icon, ArrowUp01Icon, BubbleChatIcon,
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
  user_name?: string; userName?: string
  user_email?: string; userEmail?: string
  user?: { id?: number; name?: string; first_name?: string; firstName?: string; last_name?: string; lastName?: string; email?: string }
  role?: string
  status?: string
  joined_at?: string; joinedAt?: string
  source_cohort_id?: number
}

interface UserSearchResult {
  id: number
  name?: string
  first_name?: string; firstName?: string
  last_name?: string; lastName?: string
  email: string
}

interface ForumPost {
  id: number
  content: string
  scope?: string
  forum_group_id?: number
  author_name?: string; authorName?: string
  author_id?: number; authorId?: number
  created_at: string
  updated_at?: string
}

interface ForumComment {
  id: number
  content: string
  post_id?: number
  author_name?: string; authorName?: string
  author_id?: number; authorId?: number
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function memberName(m: ForumMember): string {
  const flat = m.user_name ?? m.userName
  if (flat) return flat
  const u = m.user
  if (!u) return '—'
  if (u.name) return u.name
  const f = u.firstName ?? u.first_name ?? ''
  const l = u.lastName  ?? u.last_name  ?? ''
  return `${f} ${l}`.trim() || u.email || '—'
}

function memberEmail(m: ForumMember): string {
  return m.user_email ?? m.userEmail ?? m.user?.email ?? '—'
}

function userName(u: UserSearchResult): string {
  if (u.name) return u.name
  const f = u.firstName ?? u.first_name ?? ''
  const l = u.lastName  ?? u.last_name  ?? ''
  return `${f} ${l}`.trim() || u.email
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
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

// ── Members content (tab body) ────────────────────────────────────────────────
function MembersContent({ group }: { group: ForumGroup }) {
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
    <>
      {/* Add member search */}
      <div className="px-5 py-4 border-b border-[#f3f4f6] flex-shrink-0">
        <p className="text-[12px] font-semibold text-[#374151] font-display mb-2">
          Add Member <span className="font-normal text-[#9ca3af]">· {activeMembers.length} current</span>
        </p>
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
              const uid   = m.user_id ?? m.userId ?? m.user?.id ?? i
              const name  = memberName(m)
              const email = memberEmail(m)
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
    </>
  )
}

// ── Posts content (tab body) ──────────────────────────────────────────────────
function PostsContent({ group }: { group: ForumGroup }) {
  const [posts,            setPosts]           = useState<ForumPost[]>([])
  const [loading,          setLoading]         = useState(true)
  const [newContent,       setNewContent]      = useState('')
  const [posting,          setPosting]         = useState(false)
  const [expandedId,       setExpandedId]      = useState<number | null>(null)
  const [commentMap,       setCommentMap]      = useState<Record<number, ForumComment[]>>({})
  const [commentLoading,   setCommentLoading]  = useState<number | null>(null)
  const [commentInput,     setCommentInput]    = useState<Record<number, string>>({})
  const [deletingPostId,   setDeletingPostId]  = useState<number | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.get(`/forum/posts?scope=GROUP&groupId=${group.id}&size=50`)
      const raw = unwrap<{ posts?: ForumPost[]; content?: ForumPost[] } | ForumPost[]>(res.data)
      const list: ForumPost[] = Array.isArray(raw) ? raw : raw?.posts ?? (raw as { content?: ForumPost[] })?.content ?? []
      setPosts([...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    } catch { setPosts([]) } finally { setLoading(false) }
  }, [group.id])

  useEffect(() => { loadPosts() }, [loadPosts])

  async function loadComments(postId: number) {
    if (commentMap[postId] !== undefined) return
    setCommentLoading(postId)
    try {
      const res = await apiClient.get(`/forum/posts/${postId}/comments?size=100`)
      const raw = unwrap<{ comments?: ForumComment[]; content?: ForumComment[] } | ForumComment[]>(res.data)
      const list: ForumComment[] = Array.isArray(raw) ? raw : raw?.comments ?? (raw as { content?: ForumComment[] })?.content ?? []
      setCommentMap(prev => ({ ...prev, [postId]: list }))
    } catch { setCommentMap(prev => ({ ...prev, [postId]: [] })) } finally { setCommentLoading(null) }
  }

  function togglePost(postId: number) {
    if (expandedId === postId) {
      setExpandedId(null)
    } else {
      setExpandedId(postId)
      loadComments(postId)
    }
  }

  async function submitPost() {
    if (!newContent.trim()) return
    setPosting(true)
    try {
      await apiClient.post('/forum/posts', { scope: 'GROUP', forum_group_id: group.id, content: newContent.trim() })
      setNewContent('')
      await loadPosts()
    } catch { /* ignore */ } finally { setPosting(false) }
  }

  async function deletePost(postId: number) {
    setDeletingPostId(postId)
    try {
      await apiClient.delete(`/forum/posts/${postId}`)
      setPosts(prev => prev.filter(p => p.id !== postId))
      if (expandedId === postId) setExpandedId(null)
    } catch { /* ignore */ } finally { setDeletingPostId(null) }
  }

  async function submitComment(postId: number) {
    const content = (commentInput[postId] ?? '').trim()
    if (!content) return
    try {
      await apiClient.post(`/forum/posts/${postId}/comments`, { content })
      setCommentInput(prev => ({ ...prev, [postId]: '' }))
      // Reload comments for this post
      setCommentMap(prev => { const next = { ...prev }; delete next[postId]; return next })
      await loadComments(postId)
    } catch { /* ignore */ }
  }

  async function deleteComment(postId: number, commentId: number) {
    setDeletingCommentId(commentId)
    try {
      await apiClient.delete(`/forum/comments/${commentId}`)
      setCommentMap(prev => ({ ...prev, [postId]: (prev[postId] ?? []).filter(c => c.id !== commentId) }))
    } catch { /* ignore */ } finally { setDeletingCommentId(null) }
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
      {/* Compose */}
      <div className="px-5 py-4 border-b border-[#f3f4f6] flex-shrink-0">
        <p className="text-[12px] font-semibold text-[#374151] font-display mb-2">New Post</p>
        <textarea
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          rows={3}
          placeholder="Write a post to this group…"
          className="w-full px-3 py-2 rounded-[6px] border border-[#e5e7eb] text-[13px] text-[#111827] font-body focus:outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520] resize-none"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={submitPost}
            disabled={posting || !newContent.trim()}
            className="h-8 px-4 rounded-[8px] bg-[#d51520] text-white text-[12px] font-semibold font-display hover:bg-[#b91219] transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {posting && <Loading01Icon size={12} className="animate-spin" />}
            Post
          </button>
        </div>
      </div>

      {/* Posts list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loading01Icon size={20} className="animate-spin text-[#d51520]" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-[10px] bg-[#f3f4f6] flex items-center justify-center mb-3">
              <BubbleChatIcon size={20} color="#9ca3af" strokeWidth={1.5} />
            </div>
            <p className="text-[14px] font-semibold text-[#111827] font-display mb-1">No posts yet</p>
            <p className="text-[13px] text-[#6b7280] font-body">Be the first to post in this group.</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="border-b border-[#f3f4f6] last:border-b-0">
              {/* Post row */}
              <div
                className="px-5 py-3.5 hover:bg-[#f9fafb] cursor-pointer"
                onClick={() => togglePost(post.id)}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#374151] font-display mb-0.5">
                      {post.author_name ?? post.authorName ?? 'Unknown'}
                      <span className="font-normal text-[#9ca3af] ml-1.5">{formatTimeAgo(post.created_at)}</span>
                    </p>
                    <p className="text-[13px] text-[#111827] font-body leading-relaxed line-clamp-2">{post.content}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                    <button
                      onClick={e => { e.stopPropagation(); deletePost(post.id) }}
                      disabled={deletingPostId === post.id}
                      className="w-6 h-6 flex items-center justify-center rounded-[5px] text-[#9ca3af] hover:text-[#d51520] hover:bg-[#fef2f2] transition-colors"
                    >
                      {deletingPostId === post.id
                        ? <Loading01Icon size={11} className="animate-spin" />
                        : <Delete01Icon size={11} strokeWidth={1.5} />}
                    </button>
                    {expandedId === post.id
                      ? <ArrowUp01Icon size={14} color="#9ca3af" strokeWidth={1.5} />
                      : <ArrowDown01Icon size={14} color="#9ca3af" strokeWidth={1.5} />}
                  </div>
                </div>
              </div>

              {/* Comments */}
              {expandedId === post.id && (
                <div className="bg-[#fafafa] border-t border-[#f3f4f6] px-5 py-3">
                  {commentLoading === post.id ? (
                    <div className="flex items-center justify-center py-4">
                      <Loading01Icon size={16} className="animate-spin text-[#d51520]" />
                    </div>
                  ) : (commentMap[post.id] ?? []).length === 0 ? (
                    <p className="text-[12px] text-[#9ca3af] font-body py-2">No comments yet.</p>
                  ) : (
                    <div className="space-y-2 mb-3">
                      {(commentMap[post.id] ?? []).map(c => (
                        <div key={c.id} className="flex items-start gap-2 bg-white rounded-[8px] px-3 py-2 border border-[#f3f4f6]">
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-[#374151] font-display">
                              {c.author_name ?? c.authorName ?? 'Unknown'}
                              <span className="font-normal text-[#9ca3af] ml-1">{formatTimeAgo(c.created_at)}</span>
                            </p>
                            <p className="text-[12px] text-[#4b5563] font-body mt-0.5">{c.content}</p>
                          </div>
                          <button
                            onClick={() => deleteComment(post.id, c.id)}
                            disabled={deletingCommentId === c.id}
                            className="flex-shrink-0 text-[#9ca3af] hover:text-[#d51520] transition-colors mt-0.5"
                          >
                            {deletingCommentId === c.id
                              ? <Loading01Icon size={11} className="animate-spin" />
                              : <Delete01Icon size={11} strokeWidth={1.5} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Add comment input */}
                  <div className="flex items-center gap-2">
                    <input
                      value={commentInput[post.id] ?? ''}
                      onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(post.id) } }}
                      placeholder="Add a comment…"
                      className="flex-1 h-8 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body focus:outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520]"
                    />
                    <button
                      onClick={() => submitComment(post.id)}
                      disabled={!(commentInput[post.id] ?? '').trim()}
                      className="h-8 px-3 rounded-[6px] bg-[#d51520] text-white text-[12px] font-semibold font-display hover:bg-[#b91219] transition-colors disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Group detail panel (Members + Posts tabs) ─────────────────────────────────
function GroupDetailPanel({
  group, onClose,
}: {
  group: ForumGroup
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<'members' | 'posts'>('members')

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[520px] bg-white h-full flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6] flex-shrink-0">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">{group.name}</h2>
          <button onClick={onClose} className="text-[#4b5563] hover:text-[#111827] transition-colors">
            <Cancel01Icon size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-[#f3f4f6] flex-shrink-0">
          {(['members', 'posts'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-[13px] font-semibold font-display transition-colors ${
                activeTab === tab
                  ? 'text-[#d51520] border-b-2 border-[#d51520]'
                  : 'text-[#6b7280] hover:text-[#374151]'
              }`}
            >
              {tab === 'members' ? 'Members' : 'Posts'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeTab === 'members' ? <MembersContent group={group} /> : <PostsContent group={group} />}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ForumGroupsPage() {
  const [groups,        setGroups]      = useState<ForumGroup[]>([])
  const [loading,       setLoading]     = useState(true)
  const [search,        setSearch]      = useState('')
  const [showModal,     setShowModal]   = useState(false)
  const [editTarget,    setEditTarget]  = useState<ForumGroup | null>(null)
  const [panelGroup,    setPanelGroup]  = useState<ForumGroup | null>(null)
  const [archivingId,   setArchivingId] = useState<number | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<ForumGroup | null>(null)
  const [error,         setError]       = useState('')

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

  async function confirmArchiveGroup() {
    if (!archiveTarget) return
    setArchivingId(archiveTarget.id); setError('')
    setArchiveTarget(null)
    try {
      await apiClient.delete(`/admin/forum-groups/${archiveTarget.id}`)
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
          <p className="text-[13px] text-[#4b5563] font-body mt-0.5">Manage community forum groups</p>
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
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#111827] font-display truncate">{g.name}</p>
                {g.description && (
                  <p className="text-[11px] text-[#6b7280] font-body truncate mt-0.5">{g.description}</p>
                )}
              </div>
              <p className="text-[12px] text-[#6b7280] font-body truncate">{g.slug ?? '—'}</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-display w-fit ${VISIBILITY_STYLE[g.visibility ?? ''] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                {g.visibility ?? '—'}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-display w-fit ${STATUS_STYLE[g.status ?? ''] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                {g.status ?? '—'}
              </span>
              <p className="text-[13px] text-[#374151] font-body">{g.member_count ?? g.memberCount ?? '—'}</p>
              <div className="flex items-center gap-1 justify-end">
                <button
                  onClick={() => setPanelGroup(g)}
                  title="View members & posts"
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
                    onClick={() => setArchiveTarget(g)}
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
        <GroupDetailPanel
          group={panelGroup}
          onClose={() => setPanelGroup(null)}
        />
      )}

      {/* Archive confirmation */}
      {archiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-[12px] shadow-xl w-[440px] max-w-[95vw]">
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
                  <AlertCircleIcon size={20} color="#d51520" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#111827] font-display mb-1">Archive &quot;{archiveTarget.name}&quot;?</h3>
                  <p className="text-[13px] text-[#4b5563] font-body leading-relaxed">
                    The group will be archived and no longer visible to students. Members will retain their records and graduation history.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#f3f4f6]">
              <button
                onClick={() => setArchiveTarget(null)}
                className="h-9 px-4 rounded-[8px] border border-[#e5e7eb] text-[13px] font-semibold text-[#374151] font-display hover:bg-[#f9fafb] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmArchiveGroup}
                className="h-9 px-4 rounded-[8px] bg-[#d51520] text-white text-[13px] font-semibold font-display hover:bg-[#b91219] transition-colors"
              >
                Archive Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
