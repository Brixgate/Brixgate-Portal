'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'
import {
  BubbleChatAddIcon, BubbleChatIcon, UserGroup02Icon,
  PencilEdit01Icon, Delete01Icon, Cancel01Icon,
  AlertCircleIcon, Loading01Icon, SentIcon, Mortarboard01Icon,
  GlobeIcon, ArrowLeft01Icon,
} from 'hugeicons-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ForumGroup {
  id: number
  name: string
  slug?: string
  my_role?: string
}

interface ForumPost {
  id: number
  author_user_id: number
  author_name: string
  forum_group_id?: number
  scope: 'GENERAL' | 'GROUP'
  post_type: 'ARTICLE' | 'DISCUSSION'
  title: string
  body: string
  status: string
  comment_count: number
  created_at: string
  updated_at: string
}

interface ForumComment {
  id: number
  post_id: number
  author_user_id: number
  author_name: string
  parent_comment_id: number | null
  body: string
  status: string
  created_at: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function initials(name: string): string {
  return name.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

// ── Write Post Modal ──────────────────────────────────────────────────────────
function WritePostModal({
  groups, onClose, onPosted,
}: {
  groups: ForumGroup[]
  onClose: () => void
  onPosted: () => void
}) {
  const [scope,    setScope]    = useState<'GENERAL' | 'GROUP'>('GENERAL')
  const [groupId,  setGroupId]  = useState<number>(groups[0]?.id ?? 0)
  const [postType, setPostType] = useState<'DISCUSSION' | 'ARTICLE'>('DISCUSSION')
  const [title,    setTitle]    = useState('')
  const [body,     setBody]     = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  async function handlePost() {
    if (!title.trim()) { setError('A title is required.'); return }
    if (!body.trim())  { setError('Post body cannot be empty.'); return }
    if (scope === 'GROUP' && !groupId) { setError('Select a group.'); return }
    setSaving(true); setError('')
    try {
      const payload: Record<string, unknown> = {
        scope, post_type: postType,
        title: title.trim(), body: body.trim(),
      }
      if (scope === 'GROUP') payload.forum_group_id = groupId
      await apiClient.post('/forum/posts', payload)
      onPosted()
      onClose()
    } catch (e) {
      setError(getApiError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-[12px] shadow-xl w-full max-w-[560px] flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6] flex-shrink-0">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">Write a Post</h2>
          <button onClick={onClose} className="text-[#6b7280] hover:text-[#111827] transition-colors">
            <Cancel01Icon size={18} strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[#fef2f2] text-[#d51520] text-[13px]">
              <AlertCircleIcon size={14} strokeWidth={1.5} />
              {error}
            </div>
          )}
          {/* Scope */}
          <div className="flex gap-2">
            {(['GENERAL', 'GROUP'] as const).map(s => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`flex-1 h-9 rounded-[8px] text-[13px] font-semibold font-display border transition-colors ${
                  scope === s
                    ? 'bg-[#d51520] text-white border-[#d51520]'
                    : 'bg-white text-[#374151] border-[#e5e7eb] hover:bg-[#f9fafb]'
                }`}
              >
                {s === 'GENERAL' ? 'General Feed' : 'Group Post'}
              </button>
            ))}
          </div>
          {/* Group picker (visible when GROUP) */}
          {scope === 'GROUP' && (
            <div>
              <label className="block text-[12px] font-semibold text-[#374151] mb-1.5 font-display">Post to group</label>
              <select
                value={groupId}
                onChange={e => setGroupId(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-[6px] border border-[#e5e7eb] text-[13px] text-[#111827] font-body bg-white focus:outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520]"
              >
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
          {/* Post type */}
          <div className="flex gap-2">
            {(['DISCUSSION', 'ARTICLE'] as const).map(t => (
              <button
                key={t}
                onClick={() => setPostType(t)}
                className={`px-4 h-8 rounded-full text-[12px] font-semibold font-display border transition-colors ${
                  postType === t
                    ? 'bg-[#111827] text-white border-[#111827]'
                    : 'bg-white text-[#6b7280] border-[#e5e7eb] hover:bg-[#f9fafb]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {/* Title */}
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5 font-display">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What's this about?"
              className="w-full h-10 px-3 rounded-[6px] border border-[#e5e7eb] text-[14px] text-[#111827] font-body focus:outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520]"
            />
          </div>
          {/* Body */}
          <div>
            <label className="block text-[12px] font-semibold text-[#374151] mb-1.5 font-display">Body</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={6}
              placeholder="Share your thoughts, learnings, or questions…"
              className="w-full px-3 py-2.5 rounded-[6px] border border-[#e5e7eb] text-[14px] text-[#111827] font-body focus:outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520] resize-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#f3f4f6] flex-shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-[8px] border border-[#e5e7eb] text-[13px] font-semibold text-[#374151] font-display hover:bg-[#f9fafb] transition-colors">
            Cancel
          </button>
          <button
            onClick={handlePost}
            disabled={saving}
            className="flex items-center gap-2 h-9 px-4 rounded-[8px] bg-[#d51520] text-white text-[13px] font-semibold font-display hover:bg-[#b91219] transition-colors disabled:opacity-50"
          >
            {saving ? <Loading01Icon size={14} className="animate-spin" /> : <SentIcon size={14} strokeWidth={2} />}
            {saving ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Post detail panel ─────────────────────────────────────────────────────────
function PostPanel({
  post, currentUserId, onClose, onDeleted,
}: {
  post: ForumPost
  currentUserId: number | null
  onClose: () => void
  onDeleted: () => void
}) {
  const [comments,      setComments]      = useState<ForumComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentBody,   setCommentBody]   = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [deletingPost,  setDeletingPost]  = useState(false)
  const [deletingCid,   setDeletingCid]   = useState<number | null>(null)
  const [error,         setError]         = useState('')
  const commentRef = useRef<HTMLTextAreaElement>(null)

  const loadComments = useCallback(async () => {
    setCommentsLoading(true)
    try {
      const res = await apiClient.get(`/forum/posts/${post.id}/comments?size=100`)
      const raw = unwrap<{ comments?: ForumComment[]; content?: ForumComment[] } | ForumComment[]>(res.data)
      const list: ForumComment[] = Array.isArray(raw) ? raw : raw?.comments ?? (raw as { content?: ForumComment[] })?.content ?? []
      setComments(list)
    } catch { /* ignore */ } finally { setCommentsLoading(false) }
  }, [post.id])

  useEffect(() => { loadComments() }, [loadComments])

  async function submitComment() {
    if (!commentBody.trim()) return
    setSubmitting(true); setError('')
    try {
      await apiClient.post(`/forum/posts/${post.id}/comments`, { body: commentBody.trim(), parent_comment_id: null })
      setCommentBody('')
      await loadComments()
    } catch (e) {
      setError(getApiError(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteComment(id: number) {
    setDeletingCid(id)
    try {
      await apiClient.delete(`/forum/comments/${id}`)
      setComments(prev => prev.filter(c => c.id !== id))
    } catch { /* ignore */ } finally { setDeletingCid(null) }
  }

  async function deletePost() {
    if (!confirm('Delete this post? This cannot be undone.')) return
    setDeletingPost(true)
    try {
      await apiClient.delete(`/forum/posts/${post.id}`)
      onDeleted()
      onClose()
    } catch { /* ignore */ } finally { setDeletingPost(false) }
  }

  const isMyPost = currentUserId !== null && post.author_user_id === currentUserId

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-[520px] bg-white h-full flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6] flex-shrink-0">
          <button onClick={onClose} className="flex items-center gap-2 text-[13px] text-[#6b7280] hover:text-[#111827] font-display transition-colors">
            <ArrowLeft01Icon size={15} strokeWidth={1.5} />
            Back
          </button>
          {isMyPost && (
            <button
              onClick={deletePost}
              disabled={deletingPost}
              className="flex items-center gap-1 text-[12px] text-[#9ca3af] hover:text-[#d51520] font-display transition-colors"
            >
              {deletingPost ? <Loading01Icon size={13} className="animate-spin" /> : <Delete01Icon size={13} strokeWidth={1.5} />}
              Delete
            </button>
          )}
        </div>

        {/* Post content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 border-b border-[#f3f4f6]">
            {/* Meta */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-[#d51520] flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-white font-display">{initials(post.author_name)}</span>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#111827] font-display leading-none">{post.author_name}</p>
                <p className="text-[11px] text-[#9ca3af] font-body mt-0.5">{timeAgo(post.created_at)}</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-display ${
                  post.post_type === 'ARTICLE' ? 'bg-[#eff6ff] text-[#1d4ed8]' : 'bg-[#f0fdfa] text-[#0f766e]'
                }`}>
                  {post.post_type}
                </span>
                {post.scope === 'GENERAL' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-display bg-[#f3f4f6] text-[#6b7280]">
                    GENERAL
                  </span>
                )}
              </div>
            </div>
            {/* Title + body */}
            <h2 className="text-[17px] font-bold text-[#111827] font-display mb-2 leading-snug">{post.title}</h2>
            <p className="text-[14px] text-[#374151] font-body leading-relaxed whitespace-pre-wrap">{post.body}</p>
          </div>

          {/* Comments */}
          <div className="px-5 py-4">
            <p className="text-[12px] font-bold uppercase tracking-wider text-[#9ca3af] font-display mb-3">
              {post.comment_count} Comment{post.comment_count !== 1 ? 's' : ''}
            </p>
            {commentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loading01Icon size={18} className="animate-spin text-[#d51520]" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-[13px] text-[#9ca3af] font-body text-center py-6">No comments yet. Be the first!</p>
            ) : (
              <div className="flex flex-col gap-4">
                {comments.filter(c => (c.status ?? 'PUBLISHED') !== 'DELETED').map(c => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#f3f4f6] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[9px] font-bold text-[#374151] font-display">{initials(c.author_name)}</span>
                    </div>
                    <div className="flex-1 min-w-0 bg-[#f9fafb] rounded-[8px] px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-[12px] font-semibold text-[#111827] font-display">{c.author_name}</p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <p className="text-[11px] text-[#9ca3af] font-body">{timeAgo(c.created_at)}</p>
                          {currentUserId !== null && c.author_user_id === currentUserId && (
                            <button
                              onClick={() => deleteComment(c.id)}
                              disabled={deletingCid === c.id}
                              className="text-[#d1d5db] hover:text-[#d51520] transition-colors"
                            >
                              {deletingCid === c.id ? <Loading01Icon size={11} className="animate-spin" /> : <Delete01Icon size={11} strokeWidth={1.5} />}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[13px] text-[#374151] font-body leading-relaxed whitespace-pre-wrap">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comment composer */}
        <div className="border-t border-[#f3f4f6] px-5 py-4 flex-shrink-0">
          {error && (
            <p className="text-[12px] text-[#d51520] font-body mb-2 flex items-center gap-1">
              <AlertCircleIcon size={12} strokeWidth={1.5} /> {error}
            </p>
          )}
          <div className="flex gap-2">
            <textarea
              ref={commentRef}
              value={commentBody}
              onChange={e => setCommentBody(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { submitComment() } }}
              rows={2}
              placeholder="Write a comment… (Ctrl+Enter to post)"
              className="flex-1 px-3 py-2 rounded-[8px] border border-[#e5e7eb] text-[13px] text-[#111827] font-body focus:outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520] resize-none"
            />
            <button
              onClick={submitComment}
              disabled={submitting || !commentBody.trim()}
              className="self-end h-9 w-9 flex items-center justify-center rounded-[8px] bg-[#d51520] text-white hover:bg-[#b91219] transition-colors disabled:opacity-40"
            >
              {submitting ? <Loading01Icon size={15} className="animate-spin" /> : <SentIcon size={15} strokeWidth={2} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Post card ─────────────────────────────────────────────────────────────────
function PostCard({ post, groups, onClick }: { post: ForumPost; groups: ForumGroup[]; onClick: () => void }) {
  const group = groups.find(g => g.id === post.forum_group_id)
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,0.05)] p-5 hover:shadow-[0px_1px_3px_rgba(16,24,40,0.10)] transition-shadow"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-[#d51520] flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-white font-display">{initials(post.author_name)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-[#111827] font-display truncate">{post.author_name}</p>
            <p className="text-[11px] text-[#9ca3af] font-body">{timeAgo(post.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-display ${
            post.post_type === 'ARTICLE' ? 'bg-[#eff6ff] text-[#1d4ed8]' : 'bg-[#f0fdfa] text-[#0f766e]'
          }`}>
            {post.post_type}
          </span>
          {group && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-display bg-[#fef2f2] text-[#d51520]">
              {group.name}
            </span>
          )}
        </div>
      </div>
      {/* Title */}
      <h3 className="text-[14px] font-bold text-[#111827] font-display mb-1.5 leading-snug line-clamp-2">{post.title}</h3>
      {/* Body preview */}
      <p className="text-[13px] text-[#6b7280] font-body leading-relaxed line-clamp-2 mb-3">{post.body}</p>
      {/* Footer */}
      <div className="flex items-center gap-1 text-[12px] text-[#9ca3af] font-body">
        <BubbleChatIcon size={13} strokeWidth={1.5} />
        {post.comment_count} comment{post.comment_count !== 1 ? 's' : ''}
      </div>
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ForumPage() {
  const { user } = useAuth()
  const currentUserId = (user as { id?: number } | null)?.id ?? null

  const [isAlumnus,    setIsAlumnus]    = useState<boolean | null>(null)
  const [groups,       setGroups]       = useState<ForumGroup[]>([])
  const [posts,        setPosts]        = useState<ForumPost[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [activeScope,  setActiveScope]  = useState<'ALL' | 'GENERAL' | number>('ALL')
  const [showWrite,    setShowWrite]    = useState(false)
  const [activePost,   setActivePost]   = useState<ForumPost | null>(null)

  // Load alumni status + groups
  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get('/forum/groups')
        const raw = unwrap<{ is_alumnus?: boolean; groups?: ForumGroup[] }>(res.data)
        setIsAlumnus(raw?.is_alumnus ?? false)
        setGroups(raw?.groups ?? [])
      } catch {
        setIsAlumnus(false)
      }
    }
    load()
  }, [])

  const loadPosts = useCallback(async () => {
    setPostsLoading(true)
    try {
      let url = '/forum/posts?size=30&page=1'
      if (activeScope === 'GENERAL') url += '&scope=GENERAL'
      else if (typeof activeScope === 'number') url += `&scope=GROUP&groupId=${activeScope}`
      const res = await apiClient.get(url)
      const raw = unwrap<{ posts?: ForumPost[]; content?: ForumPost[] } | ForumPost[]>(res.data)
      const list: ForumPost[] = Array.isArray(raw) ? raw : raw?.posts ?? (raw as { content?: ForumPost[] })?.content ?? []
      setPosts(list.filter(p => p.status === 'PUBLISHED' || p.status === 'EDITED'))
    } catch {
      setPosts([])
    } finally {
      setPostsLoading(false)
    }
  }, [activeScope])

  useEffect(() => {
    if (isAlumnus) loadPosts()
  }, [isAlumnus, loadPosts])

  // Not yet loaded
  if (isAlumnus === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading01Icon size={24} className="animate-spin text-[#d51520]" />
      </div>
    )
  }

  // Not an alumnus — locked state
  if (!isAlumnus) {
    return (
      <div className="p-10 max-w-[640px]">
        <div className="bg-white rounded-[12px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,0.05)] p-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-[16px] bg-[#f3f4f6] flex items-center justify-center mb-4">
            <Mortarboard01Icon size={28} color="#9ca3af" strokeWidth={1.5} />
          </div>
          <h2 className="text-[18px] font-bold text-[#111827] font-display mb-2">Alumni Forum</h2>
          <p className="text-[14px] text-[#6b7280] font-body max-w-[320px] leading-relaxed">
            The Alumni Forum unlocks after you graduate from a programme. Complete your cohort to join the community and start connecting with fellow Brixgate alumni.
          </p>
        </div>
      </div>
    )
  }

  const activeGroupName = typeof activeScope === 'number'
    ? groups.find(g => g.id === activeScope)?.name ?? 'Group'
    : null

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Left panel — group navigation */}
      <div className="w-[220px] flex-shrink-0 border-r border-[#f3f4f6] flex flex-col py-4 px-3 gap-1 bg-white overflow-y-auto">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#9ca3af] font-display px-3 mb-1">Feed</p>
        <button
          onClick={() => setActiveScope('ALL')}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] text-[13px] font-semibold font-display w-full text-left transition-colors ${
            activeScope === 'ALL' ? 'bg-[#fef2f2] text-[#d51520]' : 'text-[#374151] hover:bg-[#f9fafb]'
          }`}
        >
          <GlobeIcon size={15} strokeWidth={1.5} />
          All Posts
        </button>
        <button
          onClick={() => setActiveScope('GENERAL')}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] text-[13px] font-semibold font-display w-full text-left transition-colors ${
            activeScope === 'GENERAL' ? 'bg-[#fef2f2] text-[#d51520]' : 'text-[#374151] hover:bg-[#f9fafb]'
          }`}
        >
          <GlobeIcon size={15} strokeWidth={1.5} />
          General
        </button>

        {groups.length > 0 && (
          <>
            <div className="h-px bg-[#f3f4f6] my-2" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#9ca3af] font-display px-3 mb-1">My Groups</p>
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => setActiveScope(g.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] text-[13px] font-semibold font-display w-full text-left transition-colors ${
                  activeScope === g.id ? 'bg-[#fef2f2] text-[#d51520]' : 'text-[#374151] hover:bg-[#f9fafb]'
                }`}
              >
                <UserGroup02Icon size={15} strokeWidth={1.5} />
                <span className="truncate">{g.name}</span>
              </button>
            ))}
          </>
        )}
      </div>

      {/* Main feed */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-[760px]">
          {/* Page header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-[18px] font-bold text-[#111827] font-display">
                {activeScope === 'ALL'     ? 'All Posts'
                  : activeScope === 'GENERAL' ? 'General Feed'
                  : activeGroupName ?? 'Group'}
              </h1>
              <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">
                {activeScope === 'ALL' ? 'Posts from your groups and the general alumni feed' :
                 activeScope === 'GENERAL' ? 'Open to all Brixgate alumni' :
                 'Posts from this group'}
              </p>
            </div>
            <button
              onClick={() => setShowWrite(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-[8px] bg-[#d51520] text-white text-[13px] font-semibold font-display hover:bg-[#b91219] transition-colors"
            >
              <BubbleChatAddIcon size={15} strokeWidth={2} />
              Write Post
            </button>
          </div>

          {/* Posts */}
          {postsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loading01Icon size={22} className="animate-spin text-[#d51520]" />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-3">
                <BubbleChatAddIcon size={24} color="#9ca3af" strokeWidth={1.5} />
              </div>
              <p className="text-[15px] font-bold text-[#111827] font-display mb-1">No posts yet</p>
              <p className="text-[13px] text-[#6b7280] font-body max-w-[280px]">
                Be the first to share something with the community.
              </p>
              <button
                onClick={() => setShowWrite(true)}
                className="mt-4 flex items-center gap-2 h-9 px-4 rounded-[8px] bg-[#d51520] text-white text-[13px] font-semibold font-display hover:bg-[#b91219] transition-colors"
              >
                <PencilEdit01Icon size={14} strokeWidth={2} />
                Write the first post
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {posts.map(p => (
                <PostCard
                  key={p.id}
                  post={p}
                  groups={groups}
                  onClick={() => setActivePost(p)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Write post modal */}
      {showWrite && (
        <WritePostModal
          groups={groups}
          onClose={() => setShowWrite(false)}
          onPosted={loadPosts}
        />
      )}

      {/* Post detail panel */}
      {activePost && (
        <PostPanel
          post={activePost}
          currentUserId={currentUserId}
          onClose={() => setActivePost(null)}
          onDeleted={loadPosts}
        />
      )}
    </div>
  )
}
