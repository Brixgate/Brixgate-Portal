'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient, unwrap } from '@/lib/api-client'
import {
  Loading01Icon, Search01Icon, ArrowDown01Icon, ArrowUp01Icon,
  ChartBarLineIcon, Add01Icon, Cancel01Icon,
} from 'hugeicons-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface QuestionnaireSummary {
  id: number
  questionnaire_id?: number; questionnaireId?: number
  name?: string; full_name?: string
  email: string
  score: number
  rating_level?: string; ratingLevel?: string
  occupation?: string
  phone_number?: string; phoneNumber?: string
  created_at?: string; createdAt?: string
}

type MergedRow = QuestionnaireSummary & { _sourceId: number }

interface SummaryResponse {
  data?: QuestionnaireSummary[]
  summaries?: QuestionnaireSummary[]
  results?: QuestionnaireSummary[]
  content?: QuestionnaireSummary[]
  items?: QuestionnaireSummary[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function ratingLevel(r: QuestionnaireSummary) { return r.rating_level ?? r.ratingLevel ?? '—' }
function displayName(r: QuestionnaireSummary) { return r.name ?? r.full_name ?? '—' }
function createdAt(r: QuestionnaireSummary) {
  const raw = r.created_at ?? r.createdAt
  if (!raw) return '—'
  return new Date(raw).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

const LEVEL_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  ADVANCED:     { bg: '#ecfdf3', text: '#027a48', border: '#bbf7d0' },
  INTERMEDIATE: { bg: '#fffaeb', text: '#b45309', border: '#fed7aa' },
  BEGINNER:     { bg: '#fef2f2', text: '#d51520', border: '#fecdca' },
}

function LevelBadge({ level }: { level: string }) {
  const s = LEVEL_STYLES[level.toUpperCase()] ?? { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border font-body"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.text }} />
      {level.charAt(0) + level.slice(1).toLowerCase()}
    </span>
  )
}

const PAGE_SIZE   = 20
const STORAGE_KEY = 'brixgate_polls_qids'

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PollsPage() {
  const [savedIds, setSavedIds]     = useState<number[]>([])
  const [idInput, setIdInput]       = useState('')
  const [allRows, setAllRows]       = useState<MergedRow[]>([])
  const [loading, setLoading]       = useState(false)
  const [fetchErrors, setFetchErrors] = useState<Record<number, string>>({})
  const [sourceFilter, setSource]   = useState<number | 'ALL'>('ALL')
  const [search, setSearch]         = useState('')
  const [levelFilter, setLevel]     = useState('ALL')
  const [sortField, setSortField]   = useState<'score' | 'created_at'>('created_at')
  const [sortDir, setSortDir]       = useState<'desc' | 'asc'>('desc')
  const [page, setPage]             = useState(1)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as number[]
        if (Array.isArray(parsed) && parsed.length > 0) setSavedIds(parsed)
      }
    } catch { /* ignore */ }
  }, [])

  const fetchAll = useCallback(async () => {
    if (savedIds.length === 0) { setAllRows([]); return }
    setLoading(true); setFetchErrors({})
    try {
      const results = await Promise.allSettled(
        savedIds.map(id => apiClient.get(`/admin/questionnaires/${id}/summaries?page=1&size=200`))
      )
      const merged: MergedRow[] = []
      const errs: Record<number, string> = {}
      results.forEach((r, i) => {
        const id = savedIds[i]
        if (r.status === 'fulfilled') {
          const d = unwrap<SummaryResponse>(r.value.data)
          const list: QuestionnaireSummary[] = Array.isArray(d) ? d :
            d?.data ?? d?.summaries ?? d?.results ?? d?.content ?? d?.items ?? []
          list.forEach(row => merged.push({ ...row, _sourceId: id }))
        } else {
          errs[id] = 'Failed to load'
        }
      })
      setAllRows(merged)
      if (Object.keys(errs).length > 0) setFetchErrors(errs)
    } finally { setLoading(false) }
  }, [savedIds])

  useEffect(() => { fetchAll() }, [fetchAll])

  function addId(e: React.FormEvent) {
    e.preventDefault()
    const n = parseInt(idInput.trim())
    if (!n || isNaN(n) || savedIds.includes(n)) { setIdInput(''); return }
    const next = [...savedIds, n]
    setSavedIds(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setIdInput('')
  }

  function removeId(id: number) {
    const next = savedIds.filter(x => x !== id)
    setSavedIds(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    if (sourceFilter === id) setSource('ALL')
  }

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortField(field); setSortDir('desc') }
  }

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field
      ? sortDir === 'desc'
        ? <ArrowDown01Icon size={12} color="#4b5563" strokeWidth={2} />
        : <ArrowUp01Icon size={12} color="#4b5563" strokeWidth={2} />
      : null

  // Stats reflect the active source filter
  const statsBase = sourceFilter === 'ALL' ? allRows : allRows.filter(r => r._sourceId === sourceFilter)
  const advanced     = statsBase.filter(r => ratingLevel(r).toUpperCase() === 'ADVANCED').length
  const intermediate = statsBase.filter(r => ratingLevel(r).toUpperCase() === 'INTERMEDIATE').length
  const beginner     = statsBase.filter(r => ratingLevel(r).toUpperCase() === 'BEGINNER').length
  const avgScore     = statsBase.length ? Math.round(statsBase.reduce((s, r) => s + (r.score ?? 0), 0) / statsBase.length) : 0

  const filtered = allRows
    .filter(r => {
      const matchSource = sourceFilter === 'ALL' || r._sourceId === sourceFilter
      const q           = search.toLowerCase()
      const matchSearch = !q || (r.email ?? '').toLowerCase().includes(q) || displayName(r).toLowerCase().includes(q) || (r.occupation ?? '').toLowerCase().includes(q)
      const matchLevel  = levelFilter === 'ALL' || ratingLevel(r).toUpperCase() === levelFilter
      return matchSource && matchSearch && matchLevel
    })
    .sort((a, b) => {
      if (sortField === 'score') return sortDir === 'desc' ? b.score - a.score : a.score - b.score
      const da = new Date(a.created_at ?? a.createdAt ?? 0).getTime()
      const db = new Date(b.created_at ?? b.createdAt ?? 0).getTime()
      return sortDir === 'desc' ? db - da : da - db
    })

  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const showSource = sourceFilter === 'ALL' && savedIds.length > 1

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-[24px] font-bold text-[#111827] font-display leading-[32px]">AI Readiness Polls</h1>
            <p className="text-[14px] text-[#4b5563] font-body mt-0.5">Results from the AI readiness quiz on brixgate.com</p>
          </div>

          {/* Source manager */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3] font-display">Questionnaire Sources</p>
            <div className="flex items-center gap-2 flex-wrap">
              {savedIds.map(id => (
                <span key={id}
                  className={`inline-flex items-center gap-1.5 h-8 pl-3 pr-2 rounded-full text-[12px] font-semibold border transition-colors ${
                    fetchErrors[id]
                      ? 'bg-[#fef2f2] text-[#d51520] border-[#fecdca]'
                      : 'bg-white text-[#374151] border-[#e5e7eb]'
                  }`}>
                  QID {id}
                  {fetchErrors[id] && <span className="text-[10px] font-normal">(error)</span>}
                  <button onClick={() => removeId(id)}
                    className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors flex-shrink-0">
                    <Cancel01Icon size={9} strokeWidth={2.5} />
                  </button>
                </span>
              ))}
              <form onSubmit={addId} className="flex items-center gap-1.5">
                <input
                  type="number" min="1" value={idInput}
                  onChange={e => setIdInput(e.target.value)}
                  placeholder="Add ID…"
                  className="h-8 w-[90px] px-3 border border-dashed border-[#d0d5dd] rounded-full text-[12px] font-body text-[#374151] placeholder:text-[#98a2b3] focus:outline-none focus:border-[#d51520] focus:ring-1 focus:ring-[#d51520]/20"
                />
                <button type="submit"
                  className="w-8 h-8 flex items-center justify-center bg-[#d51520] text-white rounded-full hover:bg-[#b81119] transition-colors">
                  <Add01Icon size={13} strokeWidth={2.5} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {savedIds.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
            <ChartBarLineIcon size={28} color="#98a2b3" strokeWidth={1.5} />
          </div>
          <h3 className="text-[16px] font-semibold text-[#111827] font-display mb-1">No sources added</h3>
          <p className="text-[13px] text-[#4b5563] font-body max-w-[300px]">
            Enter a questionnaire ID above and click the + button to start loading poll responses.
          </p>
        </div>
      )}

      {savedIds.length > 0 && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Responses', value: statsBase.length, sub: 'quiz completions',  accent: '#7c3aed', tint: '#f5f3ff' },
              { label: 'Advanced',        value: advanced,          sub: 'AI Practitioner+',  accent: '#027a48', tint: '#ecfdf3' },
              { label: 'Intermediate',    value: intermediate,      sub: 'AI Aware',          accent: '#b45309', tint: '#fffaeb' },
              { label: 'Beginner',        value: beginner,          sub: 'needs development', accent: '#d51520', tint: '#fef2f2' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3] font-display mb-3">{s.label}</p>
                {loading
                  ? <div className="h-8 w-16 bg-[#f3f4f6] rounded animate-pulse" />
                  : <p className="text-[30px] font-bold leading-none font-display text-[#101828]">{s.value.toLocaleString()}</p>}
                <p className="mt-1 text-[12px] text-[#98a2b3] font-body">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Average score banner */}
          {!loading && statsBase.length > 0 && (
            <div className="bg-[#fef2f2] border border-[#fecdca] rounded-[10px] px-6 py-4 mb-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#d51520] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-[16px] font-display">{avgScore}%</span>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#111827] font-display">Average AI Readiness Score: {avgScore}%</p>
                <p className="text-[12px] text-[#4b5563] font-body mt-0.5">
                  Across {statsBase.length.toLocaleString()} response{statsBase.length !== 1 ? 's' : ''}
                  {sourceFilter !== 'ALL' ? ` for QID ${sourceFilter}` : ` across ${savedIds.length} source${savedIds.length !== 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
          )}

          {/* Table card */}
          <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
            {/* Filters */}
            <div className="px-5 py-4 border-b border-[#f3f4f6] flex items-center gap-3 flex-wrap">
              {/* Source filter chips */}
              {savedIds.length > 1 && (
                <div className="flex items-center gap-2 mr-2">
                  {(['ALL', ...savedIds] as const).map(id => (
                    <button key={id} onClick={() => { setSource(id); setPage(1) }}
                      className={`h-8 px-3.5 rounded-full text-[12px] font-semibold transition-colors ${
                        sourceFilter === id
                          ? 'bg-[#d51520] text-white'
                          : 'bg-white border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'
                      }`}>
                      {id === 'ALL' ? 'All Sources' : `QID ${id}`}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative flex-1 min-w-[200px]">
                <Search01Icon className="absolute left-3.5 top-1/2 -translate-y-1/2" size={15} color="#4b5563" strokeWidth={1.5} />
                <input type="text" placeholder="Search by name, email, or occupation…"
                  value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                  className="w-full h-[38px] pl-9 pr-3.5 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#4b5563] focus:outline-none focus:border-[#d51520]/40 focus:ring-2 focus:ring-[#d51520]/10" />
              </div>
              <select value={levelFilter} onChange={e => { setLevel(e.target.value); setPage(1) }}
                className="h-[38px] pl-3 pr-8 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#374151] bg-white outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 min-w-[140px]">
                <option value="ALL">All Levels</option>
                <option value="ADVANCED">Advanced</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="BEGINNER">Beginner</option>
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-[#4b5563]">
                <Loading01Icon size={18} className="animate-spin" strokeWidth={1.5} />
                <span className="text-[13px] font-body">Loading responses…</span>
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <p className="text-[14px] font-semibold text-[#374151] font-display mb-1">No results found</p>
                <p className="text-[13px] text-[#4b5563] font-body">
                  {allRows.length === 0 ? 'No quiz responses have been submitted yet.' : 'Try adjusting your search or filter.'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                        {showSource && <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3] font-display">Source</th>}
                        {['Name', 'Email', 'Occupation', 'Level'].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3] font-display">{h}</th>
                        ))}
                        <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3] font-display cursor-pointer hover:text-[#374151] select-none" onClick={() => toggleSort('score')}>
                          <span className="inline-flex items-center gap-1 justify-end">Score <SortIcon field="score" /></span>
                        </th>
                        <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3] font-display cursor-pointer hover:text-[#374151] select-none" onClick={() => toggleSort('created_at')}>
                          <span className="inline-flex items-center gap-1">Date <SortIcon field="created_at" /></span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map(r => (
                        <tr key={`${r._sourceId}-${r.id}`} className="border-b border-[#f3f4f6] last:border-0 hover:bg-[#f9fafb] transition-colors">
                          {showSource && (
                            <td className="px-5 py-3.5">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f3f4f6] text-[#4b5563] font-display">
                                QID {r._sourceId}
                              </span>
                            </td>
                          )}
                          <td className="px-5 py-3.5 text-[13px] font-medium text-[#111827] font-body">{displayName(r)}</td>
                          <td className="px-5 py-3.5 text-[13px] text-[#374151] font-body">{r.email}</td>
                          <td className="px-5 py-3.5 text-[13px] text-[#4b5563] font-body">{r.occupation ?? '—'}</td>
                          <td className="px-5 py-3.5"><LevelBadge level={ratingLevel(r)} /></td>
                          <td className="px-5 py-3.5 text-right text-[13px] font-semibold text-[#111827] font-display">{r.score != null ? `${r.score}%` : '—'}</td>
                          <td className="px-5 py-3.5 text-[13px] text-[#4b5563] font-body whitespace-nowrap">{createdAt(r)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="px-5 py-4 border-t border-[#f3f4f6] flex items-center justify-between">
                    <p className="text-[12px] text-[#4b5563] font-body">
                      Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()} responses
                    </p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="h-8 px-3 border border-[#e5e7eb] rounded-[6px] text-[12px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] disabled:opacity-40 transition-colors">
                        Previous
                      </button>
                      <span className="text-[12px] text-[#4b5563] font-body px-1">Page {page} of {totalPages}</span>
                      <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
                        className="h-8 px-3 border border-[#e5e7eb] rounded-[6px] text-[12px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] disabled:opacity-40 transition-colors">
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
