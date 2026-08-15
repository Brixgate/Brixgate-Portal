'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import TopNav from '@/components/layout/TopNav'
import type { Resource, ResourceFileType } from '@/lib/types'
import {
  Download01Icon,
  File01Icon,
  PresentationBarChart01Icon,
  FileEditIcon,
  Video01Icon,
  BookOpen01Icon,
  Loading01Icon,
  EyeIcon,
  Cancel01Icon,
  Search01Icon,
} from 'hugeicons-react'
import EmptyState from '@/components/shared/EmptyState'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'
import { useToast, ToastContainer } from '@/components/shared/Toast'

// ── File type filter options ──────────────────────────────────────────────────
const FILE_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Types',   value: 'all'          },
  { label: 'PDF',         value: 'PDF'          },
  { label: 'Slides',      value: 'PRESENTATION' },
  { label: 'Video',       value: 'VIDEO'        },
  { label: 'Doc',         value: 'ARTICLE'      },
]

const FILE_ICONS: Record<string, React.ElementType> = {
  pdf:  File01Icon,
  pptx: PresentationBarChart01Icon,
  docx: FileEditIcon,
  mp4:  Video01Icon,
}
const FILE_COLOURS: Record<string, { bg: string; text: string }> = {
  pdf:  { bg: '#FEF2F2', text: '#D51520' },
  pptx: { bg: '#FFF7ED', text: '#EA580C' },
  docx: { bg: '#F0FDF4', text: '#16A34A' },
  mp4:  { bg: '#F5F3FF', text: '#7C3AED' },
}

// ── API shapes ────────────────────────────────────────────────────────────────
interface ApiResource {
  id: number
  title?: string
  type?: string
  link?: string
  status?: string
  createdAt?: string
  created_at?: string
  programModuleId?: number
  program_module_id?: number
}
interface ApiResourcesResponse {
  resources: ApiResource[]
}

// ── Cohort option ─────────────────────────────────────────────────────────────
interface CohortOption {
  cohortId: number
  label: string
  cohortLabel: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readCohortId(c: any): number    { return c?.cohortId    ?? c?.cohort_id    ?? 0  }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readCohortTitle(c: any): string { return c?.cohortTitle ?? c?.cohort_title ?? '' }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readMyCohorts(p: any): any[]    { return p?.myCohorts   ?? p?.my_cohorts   ?? [] }

function inferFileType(type: string): ResourceFileType {
  const t = type.toUpperCase()
  if (t === 'PDF')                       return 'pdf'
  if (t === 'PRESENTATION')              return 'pptx'
  if (t === 'VIDEO' || t === 'LECTURE')  return 'mp4'
  if (t === 'ARTICLE')                   return 'docx'
  return 'pdf'
}

function normaliseResource(raw: ApiResource): Resource {
  return {
    id:          String(raw.id),
    cohortId:    '',
    title:       raw.title ?? 'Untitled Resource',
    fileName:    raw.title ?? 'file',
    fileType:    inferFileType(raw.type ?? ''),
    fileSize:    '',
    weekNumber:  raw.programModuleId ?? raw.program_module_id ?? 0,
    weekTitle:   '',
    uploadedAt:  raw.createdAt ?? raw.created_at ?? '',
    uploadedBy:  '',
    downloadUrl: raw.link ?? '#',
  }
}

function isNew(uploadedAt: string): boolean {
  if (!uploadedAt) return false
  return (Date.now() - new Date(uploadedAt).getTime()) / (1000 * 60 * 60 * 24) <= 7
}

function groupByWeek(resources: Resource[]): Record<number, { title: string; items: Resource[] }> {
  const out: Record<number, { title: string; items: Resource[] }> = {}
  for (const r of resources) {
    const week = r.weekNumber ?? 0
    if (!out[week]) out[week] = { title: r.weekTitle ?? (week > 0 ? `Module ${week}` : 'General'), items: [] }
    out[week].items.push(r)
  }
  return out
}

// ── Resource row ──────────────────────────────────────────────────────────────
function ResourceRow({ resource }: { resource: Resource }) {
  const [downloading, setDownloading] = useState(false)
  const [previewing, setPreviewing]   = useState(false)
  const [preview, setPreview]         = useState<{ s3Url: string; contentType: string } | null>(null)
  const { toasts, toast, removeToast } = useToast()

  const FileIcon = FILE_ICONS[resource.fileType] ?? File01Icon
  const colours  = FILE_COLOURS[resource.fileType] ?? { bg: '#F7F8FA', text: '#6b7280' }
  const uploadedDate = resource.uploadedAt
    ? new Date(resource.uploadedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  async function getPresignedUrl(): Promise<{ url: string; contentType: string }> {
    const res = await apiClient.get(`/program-resources/${resource.id}/download`)
    const body = res.data as Record<string, unknown>
    const inner = (body?.data ?? body) as Record<string, unknown>
    const url = (inner?.url ?? inner?.link ?? body?.url) as string | undefined
    if (!url) throw new Error('No download URL in response')
    return { url, contentType: ((inner?.content_type ?? inner?.contentType ?? '') as string) }
  }

  async function handleDownload() {
    if (downloading) return
    setDownloading(true)
    try {
      const { url } = await getPresignedUrl()
      window.open(url, '_blank')
    } catch (err) { toast.error(`Download failed: ${getApiError(err)}`) }
    finally { setDownloading(false) }
  }

  async function handlePreview() {
    if (previewing) return
    setPreviewing(true)
    try {
      const { url, contentType } = await getPresignedUrl()
      setPreview({ s3Url: url, contentType })
    } catch (err) { toast.error(`Preview failed: ${getApiError(err)}`) }
    finally { setPreviewing(false) }
  }

  return (
    <>
      <div className="flex items-center gap-4 py-3.5 px-5 hover:bg-[#f9fafb] transition-colors rounded-[8px] group">
        <div className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: colours.bg }}>
          <FileIcon size={16} color={colours.text} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-medium text-[#111827] font-body leading-snug truncate">{resource.title}</p>
            {isNew(resource.uploadedAt) && (
              <span className="text-[9px] font-semibold uppercase tracking-wide bg-[#fef2f2] text-[#d51520] px-1.5 py-0.5 rounded-[4px] flex-shrink-0 font-display">New</span>
            )}
          </div>
          <p className="text-[11px] text-[#4b5563] font-body mt-0.5">
            {resource.fileType.toUpperCase()}{uploadedDate ? ` · Uploaded ${uploadedDate}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={handlePreview} disabled={previewing}
            className="flex items-center gap-1.5 text-[12px] font-medium font-display text-[#374151] border border-[#e5e7eb] px-3 py-1.5 rounded-[6px] hover:bg-[#f3f4f6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {previewing ? <Loading01Icon size={13} className="animate-spin" strokeWidth={2} /> : <EyeIcon size={13} color="#374151" strokeWidth={1.5} />}
            {previewing ? 'Loading…' : 'Preview'}
          </button>
          <button onClick={handleDownload} disabled={downloading}
            className="flex items-center gap-1.5 text-[12px] font-medium font-display text-[#374151] border border-[#e5e7eb] px-3 py-1.5 rounded-[6px] hover:bg-[#f3f4f6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {downloading ? <Loading01Icon size={13} className="animate-spin" strokeWidth={2} /> : <Download01Icon size={13} color="#374151" strokeWidth={1.5} />}
            {downloading ? 'Downloading…' : 'Download'}
          </button>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-[#e5e7eb] shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <FileIcon size={15} color={colours.text} strokeWidth={1.5} className="flex-shrink-0" />
              <p className="text-[14px] font-semibold text-[#111827] font-display truncate">{resource.title}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <button onClick={() => window.open(preview.s3Url, '_blank')}
                className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-medium text-[#374151] font-body hover:bg-[#f3f4f6] transition-colors">
                <Download01Icon size={13} color="#374151" strokeWidth={1.5} /> Download
              </button>
              <button onClick={() => setPreview(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors">
                <Cancel01Icon size={16} color="#374151" strokeWidth={1.5} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-[#1a1a1a] flex items-center justify-center">
            {preview.contentType.includes('pdf') || resource.title.toLowerCase().endsWith('.pdf') ? (
              <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(preview.s3Url)}&embedded=true`}
                className="w-full h-full border-0" title={resource.title} />
            ) : preview.contentType.startsWith('image/') ? (
              <img src={preview.s3Url} alt={resource.title} className="max-w-full max-h-full object-contain p-8" />
            ) : (
              <div className="text-center text-white px-6">
                <File01Icon size={40} color="#6b7280" strokeWidth={1} className="mx-auto mb-3" />
                <p className="text-[15px] font-semibold font-display mb-1">Preview not available</p>
                <p className="text-[13px] text-[#9ca3af] font-body">Use the Download button above to open this file.</p>
              </div>
            )}
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}

// ── Dropdown component ────────────────────────────────────────────────────────
function FilterSelect({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7280] font-display">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-9 pl-3 pr-8 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body text-[#111827] bg-white outline-none focus:border-[#d51520] appearance-none cursor-pointer min-w-[180px]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ResourcesPage() {
  const [cohorts, setCohorts]         = useState<CohortOption[]>([])
  const [programFilter, setProg]      = useState<string>('all')  // 'all' | cohortId string
  const [fileTypeFilter, setFileType] = useState<string>('all')
  const [search, setSearch]           = useState('')
  const [resources, setResources]     = useState<Resource[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)

  // Resolve enrolled cohorts + read ?cohort= URL param on mount
  useEffect(() => {
    const urlParam = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('cohort')
      : null

    async function resolveCohorts() {
      try {
        const res  = await apiClient.get('/users/me/programs')
        const data = unwrap<{ programs: unknown[] }>(res.data)
        const programs = Array.isArray(data?.programs) ? data.programs : []
        const options: CohortOption[] = []
        for (const prog of programs) {
          const title      = (prog as Record<string, unknown>)?.['title'] as string ?? 'Programme'
          const cohortList = readMyCohorts(prog)
          for (const c of cohortList) {
            const cId = readCohortId(c)
            if (!cId) continue
            const rawTitle  = readCohortTitle(c)
            const cohortLbl = rawTitle.replace(`${title} — `, '').replace(`${title} - `, '') || rawTitle
            options.push({ cohortId: cId, label: title, cohortLabel: cohortLbl })
          }
        }
        setCohorts(options)
        // Pre-select from URL param if present and valid
        if (urlParam && options.some(o => String(o.cohortId) === urlParam)) {
          setProg(urlParam)
        }
        if (options.length === 0) setLoading(false)
      } catch (err) {
        setError(getApiError(err))
        setLoading(false)
      }
    }
    resolveCohorts()
  }, [])

  // Fetch resources whenever the programme filter or cohort list changes
  const fetchForCohort = useCallback(async (cohortId: number) => {
    const res  = await apiClient.get(`/cohorts/${cohortId}/resources`)
    const data = unwrap<ApiResourcesResponse>(res.data)
    return (Array.isArray(data?.resources) ? data.resources : []).map(normaliseResource)
  }, [])

  useEffect(() => {
    if (cohorts.length === 0) return
    setLoading(true); setError(null)
    ;(async () => {
      try {
        if (programFilter === 'all') {
          // Fetch all cohorts in parallel and merge
          const results = await Promise.allSettled(cohorts.map(c => fetchForCohort(c.cohortId)))
          const seen = new Set<string>()
          const merged: Resource[] = []
          results.forEach(r => {
            if (r.status === 'fulfilled') {
              r.value.forEach(res => { if (!seen.has(res.id)) { seen.add(res.id); merged.push(res) } })
            }
          })
          setResources(merged)
        } else {
          const rows = await fetchForCohort(Number(programFilter))
          setResources(rows)
        }
      } catch (err) { setError(getApiError(err)) }
      finally { setLoading(false) }
    })()
  }, [cohorts, programFilter, fetchForCohort])

  // Client-side file type filter + search
  const displayed = useMemo(() => {
    let list = resources
    if (fileTypeFilter !== 'all') {
      list = list.filter(r => inferFileTypeRaw(r.fileType.toUpperCase()) === inferFileTypeRaw(fileTypeFilter))
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r => r.title.toLowerCase().includes(q))
    }
    return list
  }, [resources, fileTypeFilter, search])

  const byWeek      = groupByWeek(displayed)
  const weekNumbers = Object.keys(byWeek).map(Number).sort((a, b) => a - b)
  const totalCount  = resources.length

  // Build programme dropdown options
  const programOptions = useMemo(() => [
    { label: 'All Programmes', value: 'all' },
    ...cohorts.map(c => ({
      label: c.cohortLabel ? `${c.label} · ${c.cohortLabel}` : c.label,
      value: String(c.cohortId),
    })),
  ], [cohorts])

  return (
    <>
      <TopNav title="Resources" />

      <div className="px-4 md:px-8 pb-10">

        {/* ── Page header ───────────────────────────────────────────── */}
        <div className="pt-7 pb-5">
          <h1 className="text-[24px] font-bold text-[#111827] font-display leading-tight">Resources</h1>
          <p className="text-[14px] text-[#4b5563] font-body mt-1">
            Session slides, guides, and materials for your cohorts.
          </p>
        </div>

        {/* ── Filter bar — always visible ───────────────────────────── */}
        <div className="flex items-end gap-4 mb-6 flex-wrap">
          <FilterSelect
            label="Programme"
            value={programFilter}
            onChange={v => { setProg(v); setFileType('all'); setSearch('') }}
            options={programOptions}
          />
          <FilterSelect
            label="File type"
            value={fileTypeFilter}
            onChange={setFileType}
            options={FILE_TYPE_OPTIONS}
          />
          {/* Search */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px] max-w-[320px]">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7280] font-display">Search</label>
            <div className="relative">
              <Search01Icon size={14} color="#9ca3af" strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search resources…"
                className="w-full h-9 pl-8 pr-3 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] outline-none focus:border-[#d51520] bg-white"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#374151]">
                  <Cancel01Icon size={13} strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>
          {!loading && !error && (
            <span className="text-[13px] text-[#6b7280] font-body pb-1">{totalCount} file{totalCount !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-2 text-[#4b5563]">
            <Loading01Icon size={18} className="animate-spin" strokeWidth={1.5} />
            <span className="text-[13px] font-body">Loading resources…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] p-8 text-center">
            <p className="text-[14px] text-[#d51520] font-body">{error}</p>
          </div>
        )}

        {/* Empty — no resources at all */}
        {!loading && !error && totalCount === 0 && (
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
            <EmptyState icon={BookOpen01Icon} title="No resources yet"
              description="Your instructor hasn't uploaded any resources for this cohort yet. Check back after your next session." />
          </div>
        )}

        {/* Empty — filter/search has no matches */}
        {!loading && !error && totalCount > 0 && weekNumbers.length === 0 && (
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
            <EmptyState icon={File01Icon} title="No matches"
              description="Try adjusting the filters or search to find what you're looking for." />
          </div>
        )}

        {/* Content */}
        {!loading && !error && weekNumbers.length > 0 && (
          <div className="flex flex-col gap-6">
            {weekNumbers.map(week => {
              const { title, items } = byWeek[week]
              return (
                <div key={week} className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
                  <div className="px-5 py-4 flex items-center justify-between border-b border-[#f3f4f6]">
                    <div>
                      <p className="text-[15px] font-semibold text-[#111827] font-display">
                        {week > 0 ? `Module ${week}` : 'General'}
                      </p>
                      {title && title !== `Module ${week}` && title !== 'General' && (
                        <p className="text-[12px] text-[#4b5563] font-body mt-0.5">{title}</p>
                      )}
                    </div>
                    <span className="text-[11px] text-[#4b5563] font-body">{items.length} file{items.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="p-2">
                    {items.map(resource => <ResourceRow key={resource.id} resource={resource} />)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// map FILTER_CHIPS apiType → ResourceFileType key for client-side filtering
function inferFileTypeRaw(apiType: string): string {
  if (apiType === 'PDF')          return 'PDF'
  if (apiType === 'PRESENTATION') return 'PPTX'
  if (apiType === 'VIDEO')        return 'MP4'
  if (apiType === 'ARTICLE')      return 'DOCX'
  return apiType
}
