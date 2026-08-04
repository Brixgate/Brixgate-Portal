'use client'

import { useState, useEffect, useCallback } from 'react'
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
  ArrowDown01Icon,
  CheckmarkCircle01Icon,
  EyeIcon,
  Cancel01Icon,
} from 'hugeicons-react'
import EmptyState from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

// ── Filter chips ──────────────────────────────────────────────────────────────
const FILTER_CHIPS: { label: string; apiType: string | null }[] = [
  { label: 'All',    apiType: null           },
  { label: 'PDF',    apiType: 'PDF'          },
  { label: 'Slides', apiType: 'PRESENTATION' },
  { label: 'Video',  apiType: 'VIDEO'        },
  { label: 'Doc',    apiType: 'ARTICLE'      },
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
  programModuleId?: number
}
interface ApiResourcesResponse {
  resources: ApiResource[]
}

// ── Cohort option (built from /users/me/programs) ─────────────────────────────
interface CohortOption {
  cohortId: number
  label: string        // e.g. "AI in Software Engineering"
  cohortLabel: string  // e.g. "Cohort 3"
}

// ── Defensive field readers ───────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readCohortId(c: any): number    { return c?.cohortId    ?? c?.cohort_id    ?? 0  }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readCohortTitle(c: any): string { return c?.cohortTitle ?? c?.cohort_title ?? '' }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readMyCohorts(p: any): any[]    { return p?.myCohorts   ?? p?.my_cohorts   ?? [] }

// ── Normalise API resource → internal Resource shape ─────────────────────────
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
    weekNumber:  raw.programModuleId ?? 0,
    weekTitle:   '',
    uploadedAt:  raw.createdAt ?? '',
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
    if (!out[week]) out[week] = { title: r.weekTitle ?? `Week ${week}`, items: [] }
    out[week].items.push(r)
  }
  return out
}

// ── Resource row ──────────────────────────────────────────────────────────────
function ResourceRow({ resource }: { resource: Resource }) {
  const [downloading, setDownloading] = useState(false)
  const [previewing, setPreviewing]   = useState(false)
  const [preview, setPreview]         = useState<{ url: string; mime: string } | null>(null)

  const FileIcon = FILE_ICONS[resource.fileType] ?? File01Icon
  const colours  = FILE_COLOURS[resource.fileType] ?? { bg: '#F7F8FA', text: '#6b7280' }
  const uploadedDate = resource.uploadedAt
    ? new Date(resource.uploadedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  async function fetchBlob(): Promise<{ blob: Blob; mime: string } | { redirectUrl: string } | null> {
    const res = await apiClient.get(`/program-resources/${resource.id}/download`, { responseType: 'blob' })
    const blob: Blob = res.data
    const mime: string = (res.headers['content-type'] as string) ?? ''
    if (mime.includes('json') || mime.includes('text')) {
      const text = await blob.text()
      try {
        const json = JSON.parse(text) as Record<string, unknown>
        const url = (json.url ?? json.link ?? json.downloadUrl ?? json.download_url) as string | undefined
        if (url) return { redirectUrl: url }
      } catch { /* not JSON */ }
    }
    return { blob, mime }
  }

  async function handleDownload() {
    if (downloading) return
    setDownloading(true)
    try {
      const result = await fetchBlob()
      if (!result) return
      if ('redirectUrl' in result) { window.open(result.redirectUrl, '_blank'); return }
      const objectUrl = URL.createObjectURL(result.blob)
      const a = document.createElement('a')
      a.href = objectUrl; a.download = resource.title || 'download'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      const fallback = resource.downloadUrl
      if (fallback && fallback !== '#') { window.open(fallback, '_blank') }
      else { alert(`Download failed: ${getApiError(err)}`) }
    } finally { setDownloading(false) }
  }

  async function handlePreview() {
    if (previewing) return
    setPreviewing(true)
    try {
      const result = await fetchBlob()
      if (!result) return
      if ('redirectUrl' in result) { window.open(result.redirectUrl, '_blank'); return }
      const objectUrl = URL.createObjectURL(result.blob)
      setPreview({ url: objectUrl, mime: result.mime })
    } catch (err) { alert(`Preview failed: ${getApiError(err)}`) }
    finally { setPreviewing(false) }
  }

  function closePreview() {
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  return (
    <>
      <div className="flex items-center gap-4 py-3.5 px-5 hover:bg-[#f9fafb] transition-colors rounded-[8px] group">
        <div
          className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0"
          style={{ background: colours.bg }}
        >
          <FileIcon size={16} color={colours.text} strokeWidth={1.5} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-medium text-[#111827] font-body leading-snug truncate">
              {resource.title}
            </p>
            {isNew(resource.uploadedAt) && (
              <span className="text-[9px] font-semibold uppercase tracking-wide bg-[#fef2f2] text-[#d51520] px-1.5 py-0.5 rounded-[4px] flex-shrink-0 font-display">
                New
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#4b5563] font-body mt-0.5">
            {resource.fileType.toUpperCase()}
            {uploadedDate ? ` · Uploaded ${uploadedDate}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={handlePreview}
            disabled={previewing}
            className="flex items-center gap-1.5 text-[12px] font-medium font-display text-[#374151] border border-[#e5e7eb] px-3 py-1.5 rounded-[6px] hover:bg-[#f3f4f6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Preview ${resource.title}`}
          >
            {previewing
              ? <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />
              : <EyeIcon size={13} color="#374151" strokeWidth={1.5} />}
            {previewing ? 'Loading…' : 'Preview'}
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 text-[12px] font-medium font-display text-[#374151] border border-[#e5e7eb] px-3 py-1.5 rounded-[6px] hover:bg-[#f3f4f6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Download ${resource.title}`}
          >
            {downloading
              ? <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />
              : <Download01Icon size={13} color="#374151" strokeWidth={1.5} />}
            {downloading ? 'Downloading…' : 'Download'}
          </button>
        </div>
      </div>

      {/* Preview modal — full screen overlay */}
      {preview && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-[#e5e7eb] shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <FileIcon size={15} color={colours.text} strokeWidth={1.5} className="flex-shrink-0" />
              <p className="text-[14px] font-semibold text-[#111827] font-display truncate">{resource.title}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <button
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = preview.url; a.download = resource.title
                  document.body.appendChild(a); a.click(); document.body.removeChild(a)
                }}
                className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-medium text-[#374151] font-body hover:bg-[#f3f4f6] transition-colors"
              >
                <Download01Icon size={13} color="#374151" strokeWidth={1.5} />
                Download
              </button>
              <button onClick={closePreview}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors">
                <Cancel01Icon size={16} color="#374151" strokeWidth={1.5} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-[#1a1a1a] flex items-center justify-center">
            {preview.mime.includes('pdf') ? (
              <iframe src={preview.url} className="w-full h-full border-0" title={resource.title} />
            ) : preview.mime.startsWith('image/') ? (
              <img src={preview.url} alt={resource.title} className="max-w-full max-h-full object-contain p-8" />
            ) : (
              <div className="text-center text-white px-6">
                <File01Icon size={40} color="#6b7280" strokeWidth={1} className="mx-auto mb-3" />
                <p className="text-[15px] font-semibold font-display mb-1">Preview not available</p>
                <p className="text-[13px] text-[#9ca3af] font-body">This file type cannot be previewed. Use the Download button above to open it.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── Cohort switcher dropdown ──────────────────────────────────────────────────
function CohortSwitcher({
  cohorts,
  selected,
  onChange,
}: {
  cohorts: CohortOption[]
  selected: CohortOption
  onChange: (c: CohortOption) => void
}) {
  const [open, setOpen] = useState(false)

  if (cohorts.length <= 1) return null   // only show if enrolled in 2+ cohorts

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-[38px] pl-3.5 pr-3 bg-white border border-[#e5e7eb] rounded-[8px] hover:bg-[#f9fafb] transition-colors"
      >
        <div className="text-left">
          <p className="text-[12px] font-semibold text-[#111827] font-display leading-none">
            {selected.label}
          </p>
          {selected.cohortLabel && (
            <p className="text-[10px] text-[#4b5563] font-body mt-0.5 leading-none">
              {selected.cohortLabel}
            </p>
          )}
        </div>
        <ArrowDown01Icon
          size={13}
          color="#4b5563"
          strokeWidth={1.5}
          className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Menu */}
          <div className="absolute right-0 top-[calc(100%+6px)] z-50 bg-white rounded-[10px] shadow-[0px_8px_24px_rgba(16,24,40,0.12)] border border-[#f3f4f6] min-w-[240px] py-1.5 overflow-hidden">
            {cohorts.map((c) => {
              const isSelected = c.cohortId === selected.cohortId
              return (
                <button
                  key={c.cohortId}
                  onClick={() => { onChange(c); setOpen(false) }}
                  className={`w-full text-left flex items-center justify-between gap-3 px-4 py-2.5 transition-colors ${
                    isSelected ? 'bg-[#fef2f2]' : 'hover:bg-[#f9fafb]'
                  }`}
                >
                  <div>
                    <p className={`text-[13px] font-medium font-display leading-snug ${
                      isSelected ? 'text-[#d51520]' : 'text-[#111827]'
                    }`}>
                      {c.label}
                    </p>
                    {c.cohortLabel && (
                      <p className="text-[11px] text-[#4b5563] font-body mt-0.5">{c.cohortLabel}</p>
                    )}
                  </div>
                  {isSelected && (
                    <CheckmarkCircle01Icon size={15} color="#d51520" strokeWidth={1.5} className="flex-shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ResourcesPage() {
  const [cohorts, setCohorts]           = useState<CohortOption[]>([])
  const [selected, setSelected]         = useState<CohortOption | null>(null)
  const [resources, setResources]       = useState<Resource[]>([])
  const [totalCount, setTotalCount]     = useState(0)
  const [loading, setLoading]           = useState(true)
  const [filtering, setFiltering]       = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>('All')

  // Step 1 — resolve all enrolled cohorts on mount
  useEffect(() => {
    async function resolveCohorts() {
      try {
        const res  = await apiClient.get('/users/me/programs')
        const data = unwrap<{ programs: unknown[] }>(res.data)
        const programs = Array.isArray(data?.programs) ? data.programs : []

        const options: CohortOption[] = []
        for (const prog of programs) {
          const title   = (prog as Record<string, unknown>)?.['title'] as string ?? 'Programme'
          const cohorts = readMyCohorts(prog)
          for (const c of cohorts) {
            const cId = readCohortId(c)
            if (!cId) continue
            const rawTitle  = readCohortTitle(c)
            const cohortLbl = rawTitle
              .replace(`${title} — `, '')
              .replace(`${title} - `, '')
              || rawTitle
            options.push({ cohortId: cId, label: title, cohortLabel: cohortLbl })
          }
        }

        setCohorts(options)
        if (options.length > 0) setSelected(options[0])
        else setLoading(false)
      } catch (err) {
        setError(getApiError(err))
        setLoading(false)
      }
    }
    resolveCohorts()
  }, [])

  // Step 2 — fetch resources whenever selected cohort or filter changes
  const fetchResources = useCallback(async (cohortId: number, apiType: string | null) => {
    const params: Record<string, string> = {}
    if (apiType) params.type = apiType
    const res  = await apiClient.get(`/cohorts/${cohortId}/resources`, { params })
    const data = unwrap<ApiResourcesResponse>(res.data)
    return (Array.isArray(data?.resources) ? data.resources : []).map(normaliseResource)
  }, [])

  useEffect(() => {
    if (!selected) return
    setActiveFilter('All')
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const rows = await fetchResources(selected.cohortId, null)
        setResources(rows)
        setTotalCount(rows.length)
      } catch (err) {
        setError(getApiError(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [selected, fetchResources])

  async function handleFilterChange(label: string, apiType: string | null) {
    if (label === activeFilter || !selected) return
    setActiveFilter(label)
    setFiltering(true)
    try {
      const rows = await fetchResources(selected.cohortId, apiType)
      setResources(rows)
    } catch {
      // keep existing on filter error
    } finally {
      setFiltering(false)
    }
  }

  const byWeek      = groupByWeek(resources)
  const weekNumbers = Object.keys(byWeek).map(Number).sort((a, b) => a - b)

  return (
    <>
      <TopNav title="Resources" />

      <div className="px-4 md:px-8 pb-10">
        {/* Page header */}
        <div className="pt-7 pb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[24px] font-bold text-[#111827] font-display leading-tight">
              Resources
            </h1>
            <p className="text-[14px] text-[#4b5563] font-body mt-1">
              Session slides, guides, and materials for your cohort.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1 flex-wrap">
            {/* Cohort switcher — only visible when enrolled in 2+ cohorts */}
            {selected && cohorts.length > 1 && (
              <CohortSwitcher
                cohorts={cohorts}
                selected={selected}
                onChange={(c) => setSelected(c)}
              />
            )}
            {!loading && !error && (
              <p className="text-[13px] text-[#4b5563] font-body">
                {totalCount} file{totalCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
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

        {/* Empty */}
        {!loading && !error && totalCount === 0 && (
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
            <EmptyState
              icon={BookOpen01Icon}
              title="No resources yet"
              description="Your instructor hasn't uploaded any resources for this cohort yet. Check back after your next session."
            />
          </div>
        )}

        {/* Content */}
        {!loading && !error && totalCount > 0 && (
          <>
            {/* Filter chips */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {FILTER_CHIPS.map(({ label, apiType }) => (
                <button
                  key={label}
                  onClick={() => handleFilterChange(label, apiType)}
                  disabled={filtering}
                  className={cn(
                    'px-4 h-8 rounded-full text-[13px] font-medium transition-colors disabled:opacity-60',
                    activeFilter === label
                      ? 'bg-[#d51520] text-white font-display'
                      : 'bg-white border border-[#e5e7eb] text-[#4b5563] font-body hover:bg-[#f9fafb]'
                  )}
                >
                  {label}
                </button>
              ))}
              {filtering && (
                <Loading01Icon size={14} className="animate-spin text-[#4b5563]" strokeWidth={1.5} />
              )}
            </div>

            {/* Filter empty */}
            {weekNumbers.length === 0 ? (
              <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
                <EmptyState
                  icon={File01Icon}
                  title="No files match this filter"
                  description="Try a different filter to see more resources."
                />
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {weekNumbers.map((week) => {
                  const { title, items } = byWeek[week]
                  return (
                    <div
                      key={week}
                      className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden"
                    >
                      <div className="px-5 py-4 flex items-center justify-between border-b border-[#f3f4f6]">
                        <div>
                          <p className="text-[15px] font-semibold text-[#111827] font-display">
                            {week > 0 ? `Week ${week}` : 'General'}
                          </p>
                          {title && title !== `Week ${week}` && (
                            <p className="text-[12px] text-[#4b5563] font-body mt-0.5">{title}</p>
                          )}
                        </div>
                        <span className="text-[11px] text-[#4b5563] font-body">
                          {items.length} file{items.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="p-2">
                        {items.map((resource) => (
                          <ResourceRow key={resource.id} resource={resource} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
