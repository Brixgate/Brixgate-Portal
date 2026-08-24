'use client'

import { useState, useEffect, useCallback } from 'react'
import QRCode from 'qrcode'
import TopNav from '@/components/layout/TopNav'
import {
  Award01Icon,
  Download01Icon,
  Loading01Icon,
  Share01Icon,
  EyeIcon,
  Cancel01Icon,
  Copy01Icon,
} from 'hugeicons-react'
import EmptyState from '@/components/shared/EmptyState'
import { apiClient, unwrap } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { useToast, ToastContainer } from '@/components/shared/Toast'

// ── API shapes ────────────────────────────────────────────────────────────────
interface ApiCohort {
  id: number; name: string; end_date?: string; start_date?: string
}
interface ApiEnrollment {
  id: number; progress?: number; cohort_id?: number; cohort?: ApiCohort
}
interface ApiProgram {
  id: number; title: string; category?: string; duration?: string
  enrollment?: ApiEnrollment; progress?: number; cohort?: ApiCohort; cohort_id?: number
}
interface ApiCertification {
  id: number
  program_id?: number; programId?: number
  cohort_id?: number; cohortId?: number
  program_title?: string
  issued_at?: string; issuedAt?: string
  certificate_url?: string; certificateUrl?: string
  pdf_url?: string; pdfUrl?: string
  certificate_number?: string; certificateNumber?: string
  cohort_title?: string; cohortTitle?: string
  metadata?: { signatories?: string[] }
  certificate?: {
    id?: number; program_id?: number; programId?: number
    cohort_id?: number; cohortId?: number; title?: string; template_url?: string
  }
}

// ── Normalised row ────────────────────────────────────────────────────────────
interface CertRow {
  key: string
  programId: number
  title: string
  cohortLabel: string
  progress: number
  cohortId: number
  endDate: string
  certificateUrl: string | null
  pdfUrl: string | null
  issuedAt: string | null
  certificateNumber: string | null
  instructorName: string
  instructorSignatureUrl: string
}

function normaliseProgramToCertRow(
  raw: ApiProgram,
  byProgram: Map<number, ApiCertification>,
  byCohort: Map<number, ApiCertification>,
): CertRow {
  const enrollment  = raw.enrollment
  const cohort      = enrollment?.cohort ?? raw.cohort ?? null
  const title       = raw.title ?? 'Untitled Programme'
  const cohortName  = cohort?.name ?? ''
  const cohortLabel = cohortName.replace(`${title} — `, '').replace(`${title} - `, '') || cohortName
  const cohortId    = enrollment?.cohort_id ?? cohort?.id ?? raw.cohort_id ?? 0

  const cert        = byProgram.get(raw.id) ?? byCohort.get(cohortId) ?? null
  const rawIssuedAt = cert?.issued_at ?? cert?.issuedAt ?? null

  return {
    key: String(raw.id),
    programId: raw.id,
    title,
    cohortLabel,
    progress:  enrollment?.progress ?? raw.progress ?? 0,
    cohortId,
    endDate: cohort?.end_date
      ? new Date(cohort.end_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
      : '—',
    certificateUrl:    cert?.certificate_url ?? cert?.certificateUrl ?? null,
    pdfUrl:            cert?.pdf_url         ?? cert?.pdfUrl         ?? null,
    issuedAt:          rawIssuedAt
      ? new Date(rawIssuedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
      : null,
    certificateNumber: cert?.certificate_number ?? cert?.certificateNumber ?? null,
    // Pre-populate from cert metadata if available; cohort API lookup may override later
    instructorName: cert?.metadata?.signatories?.[0] ?? '',
    instructorSignatureUrl: '',
  }
}

// ── Fetch the instructor for a given cohort ───────────────────────────────────
interface InstructorData { name: string; signatureUrl: string }

interface CohortMember {
  role: string
  user: {
    name?: string
    profile_image_url?: string | null
  }
}

async function fetchCohortInstructor(cohortId: number): Promise<InstructorData> {
  try {
    const res  = await apiClient.get(`/cohorts/${cohortId}/members?size=100`)
    console.log('[cert] cohortId', cohortId, 'raw response', res.data)
    const data = unwrap<{ members: CohortMember[] }>(res.data)
    console.log('[cert] unwrapped', data)
    const instructor = (data?.members ?? []).find(
      m => String(m.role).toUpperCase() === 'INSTRUCTOR'
    )
    console.log('[cert] instructor found', instructor)
    if (instructor?.user?.name) {
      return {
        name: instructor.user.name,
        signatureUrl: instructor.user.profile_image_url ?? '',
      }
    }
  } catch (err) {
    console.error('[cert] instructor fetch error for cohortId', cohortId, err)
  }
  return { name: '', signatureUrl: '' }
}

// ── SVG helpers ───────────────────────────────────────────────────────────────
const SVG_TEMPLATE_URL = '/Brixgate_Certificate_light_.svg'

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function buildFilledSvg(row: CertRow, fullName: string): Promise<string> {
  const { title, issuedAt, instructorName, certificateNumber } = row
  const completedDate = issuedAt
    ?? new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
  const certId  = certificateNumber ?? '—'
  const certUrl = certificateNumber
    ? `https://brixgate.com/verify/${certificateNumber}`
    : 'https://brixgate.com/verify'

  const [raw, qrDataUri] = await Promise.all([
    fetch(SVG_TEMPLATE_URL).then(r => r.text()),
    QRCode.toDataURL(certUrl, { width: 200, margin: 1, color: { dark: '#021024', light: '#FFFFFF' } }),
  ])

  // The SVG has a hardcoded QR code drawn as vector paths inside a white box
  // at (1014, 698) — (1114, 798). We overlay it with the dynamic QR code.
  const qrOverlay = `<rect x="1014" y="698" width="100" height="100" fill="white"/><image x="1016" y="700" width="96" height="96" href="${qrDataUri}" preserveAspectRatio="xMidYMid meet"/>`

  return raw
    .replace(/width="1188" height="840"/, 'width="100%" height="auto"')
    .replace('{{fullname}}',        escapeXml(fullName   || 'Student Name'))
    .replace('{{programme}}',       escapeXml(title      || ''))
    .replace('{{completion-date}}', escapeXml(completedDate))
    .replace('{{instructor-name}}', escapeXml(instructorName || ''))
    .replace('BXG-CYB-2609-0147',  escapeXml(certId))
    // Leave 'brixgate.com/verify' display text as-is — QR code encodes the full URL
    .replace('</svg>', `${qrOverlay}</svg>`)
}

// ── Certificate preview (inline SVG) ─────────────────────────────────────────
function CertificatePreview({ svgHtml }: { svgHtml: string }) {
  if (!svgHtml) {
    return (
      <div style={{
        width: '100%', aspectRatio: '1188/840',
        background: '#F6F4F2', borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Loading01Icon size={28} className="animate-spin text-[#98A2B3]" strokeWidth={1.5} />
      </div>
    )
  }
  return (
    <div
      id="brixgate-certificate"
      style={{ width: '100%', borderRadius: 12, overflow: 'hidden', lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  )
}

// ── Generate print HTML from the filled SVG string ────────────────────────────
function generatePrintHtml(svgHtml: string, fullName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Certificate — ${escapeXml(fullName)}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
html,body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#E8EBF0!important}
@media print{@page{margin:0;size:A4 landscape}html,body{background:#E8EBF0!important}}
.wrap{width:100%;max-width:1188px}
svg{width:100%;height:auto;display:block}
</style>
</head>
<body>
<div class="wrap">${svgHtml}</div>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},800)})<\/script>
</body></html>`
}

// ── Certificate modal ─────────────────────────────────────────────────────────
function CertificateModal({ row, fullName, onClose }: {
  row: CertRow; fullName: string; onClose: () => void
}) {
  const { toasts, toast, removeToast } = useToast()
  const [svgHtml, setSvgHtml] = useState('')
  const { title, cohortLabel, issuedAt, certificateNumber } = row

  const pubLink = certificateNumber
    ? `https://brixgate.com/verify/${certificateNumber}`
    : 'https://brixgate.com'

  useEffect(() => {
    buildFilledSvg(row, fullName)
      .then(setSvgHtml)
      .catch(() => { /* silently fail — preview shows loader */ })
  }, [row, fullName])

  function handleDownload() {
    if (!svgHtml) { toast.error('Certificate is still loading, please wait.'); return }
    const html = generatePrintHtml(svgHtml, fullName)
    const win  = window.open('', '_blank')
    if (!win) { toast.error('Pop-up blocked — please allow pop-ups and try again.'); return }
    win.document.write(html)
    win.document.close()
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(pubLink)
      toast.success('Certificate link copied!')
    } catch { toast.error('Could not copy to clipboard.') }
  }

  function handleLinkedIn() {
    const certDate  = issuedAt ?? new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
    const shareText = `🎓 Excited to share that I've completed ${title} at Brixgate${cohortLabel ? ` (${cohortLabel})` : ''}!\n\nCertificate awarded on ${certDate}${certificateNumber ? ` — Cert No: ${certificateNumber}` : ''}.\n\nVerify: ${pubLink}\n\n#Brixgate #AITraining #Certificate`
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(shareText)}`, '_blank')
  }

  async function handleNativeShare() {
    const certDate  = issuedAt ?? ''
    const shareText = `🎓 I'm proud to have completed ${title} at Brixgate${cohortLabel ? ` (${cohortLabel})` : ''}!\n\nCertificate awarded to ${fullName} on ${certDate}${certificateNumber ? `\n\nCertificate No: ${certificateNumber}` : ''}.\n\nVerify: ${pubLink}\n\n#Brixgate #AITraining #Certificate`
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: `${fullName} — Brixgate Certificate`, text: shareText, url: pubLink }) }
      catch { /* user cancelled */ }
    } else { await handleCopyLink() }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-start overflow-y-auto py-10 px-4"
        onClick={onClose}
      >
        <div className="w-full max-w-[820px] flex flex-col gap-4" onClick={e => e.stopPropagation()}>
          {/* Certificate */}
          <CertificatePreview svgHtml={svgHtml} />

          {/* Action bar */}
          <div className="bg-white rounded-[12px] p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 h-9 px-4 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] font-display hover:bg-[#f9fafb] transition-colors"
              >
                <Copy01Icon size={14} color="#374151" strokeWidth={1.5} />
                Copy link
              </button>
              <button
                onClick={handleLinkedIn}
                className="flex items-center gap-2 h-9 px-4 rounded-[8px] bg-[#0A66C2] text-[13px] font-medium text-white font-display hover:bg-[#084fa1] transition-colors"
              >
                <span style={{ fontWeight: 900, fontSize: 11, fontStyle: 'italic', background: 'rgba(255,255,255,0.18)', borderRadius: 3, padding: '1px 4px', lineHeight: 1 }}>in</span>
                Post to LinkedIn
              </button>
              <button
                onClick={handleNativeShare}
                className="flex items-center gap-2 h-9 px-4 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] font-display hover:bg-[#f9fafb] transition-colors"
              >
                <Share01Icon size={14} color="#374151" strokeWidth={1.5} />
                Share
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                disabled={!svgHtml}
                className="flex items-center gap-2 h-9 px-5 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download01Icon size={14} color="white" strokeWidth={1.5} />
                Download PDF
              </button>
              <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors">
                <Cancel01Icon size={16} color="#374151" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ issued }: { issued: boolean }) {
  if (issued) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#ecfdf3] text-[#166534] border border-[#bbf7d0] font-display">
      <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] flex-shrink-0" />
      Ready
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#fffbeb] text-[#92400e] border border-[#fde68a] font-display">
      <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] flex-shrink-0" />
      Pending
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CertificatePage() {
  const { user } = useAuth()
  const [rows, setRows]               = useState<CertRow[]>([])
  const [loading, setLoading]         = useState(true)
  const [selectedRow, setSelectedRow] = useState<CertRow | null>(null)
  const { toasts, toast, removeToast } = useToast()

  const fullName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : ''

  const load = useCallback(async () => {
    try {
      const [programsRes, certsRes] = await Promise.all([
        apiClient.get('/users/me/programs'),
        apiClient.get('/users/me/certifications').catch(() => ({ data: null })),
      ])

      const programsRaw = unwrap<unknown>(programsRes.data)
      const programs: ApiProgram[] = Array.isArray(programsRaw)
        ? programsRaw
        : Array.isArray((programsRaw as Record<string, unknown>)?.programs)
          ? (programsRaw as Record<string, unknown>).programs as ApiProgram[]
          : []

      const certsRaw = unwrap<unknown>(certsRes.data)
      const certs: ApiCertification[] = (() => {
        if (!certsRaw) return []
        if (Array.isArray(certsRaw)) return certsRaw as ApiCertification[]
        const r = certsRaw as Record<string, unknown>
        if (Array.isArray(r.certifications))    return r.certifications    as ApiCertification[]
        if (Array.isArray(r.certificates))      return r.certificates      as ApiCertification[]
        if (Array.isArray(r.user_certificates)) return r.user_certificates as ApiCertification[]
        return []
      })()

      const byProgram = new Map<number, ApiCertification>()
      const byCohort  = new Map<number, ApiCertification>()
      for (const c of certs) {
        const def    = c.certificate ?? c
        const progId = def.program_id ?? def.programId ?? c.program_id ?? c.programId
        const cohId  = def.cohort_id  ?? def.cohortId  ?? c.cohort_id  ?? c.cohortId
        if (progId) byProgram.set(progId, c)
        if (cohId)  byCohort.set(cohId,  c)
      }

      const baseRows = programs.map(p => normaliseProgramToCertRow(p, byProgram, byCohort))
      console.log('[cert] baseRows cohortIds', baseRows.map(r => ({ title: r.title, cohortId: r.cohortId })))

      const seen = new Set<number>()
      const uniqueCohortIds = baseRows.map(r => r.cohortId).filter(id => {
        if (!id || seen.has(id)) return false
        seen.add(id)
        return true
      })
      console.log('[cert] uniqueCohortIds to fetch instructors for', uniqueCohortIds)
      const instructorResults = await Promise.allSettled(
        uniqueCohortIds.map(id => fetchCohortInstructor(id))
      )
      const instructorMap = new Map<number, InstructorData>()
      uniqueCohortIds.forEach((id, i) => {
        const result = instructorResults[i]
        if (result.status === 'fulfilled' && result.value) {
          instructorMap.set(id, result.value)
        }
      })

      setRows(baseRows.map(r => ({
        ...r,
        instructorName:         instructorMap.get(r.cohortId)?.name         || r.instructorName,
        instructorSignatureUrl: instructorMap.get(r.cohortId)?.signatureUrl ?? r.instructorSignatureUrl,
      })))
    } catch {
      // show empty state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDownloadRow(row: CertRow, e: React.MouseEvent) {
    e.stopPropagation()
    if (!row.issuedAt) { toast.error('Certificate not yet issued.'); return }
    try {
      const svg  = await buildFilledSvg(row, fullName)
      const html = generatePrintHtml(svg, fullName)
      const win  = window.open('', '_blank')
      if (!win) { toast.error('Pop-up blocked — please allow pop-ups and try again.'); return }
      win.document.write(html)
      win.document.close()
    } catch { toast.error('Could not load certificate template.') }
  }

  return (
    <>
      <TopNav title="My Certificates" />

      <div className="px-4 md:px-8 pb-10">
        <div className="pt-7 pb-6">
          <h1 className="text-[24px] font-bold text-[#111827] font-display leading-tight">My Certificates</h1>
          <p className="text-[14px] text-[#4b5563] font-body mt-1">
            Your Brixgate certificates — one per programme you complete.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 gap-2 text-[#4b5563]">
            <Loading01Icon size={18} className="animate-spin" strokeWidth={1.5} />
            <span className="text-[13px] font-body">Loading your certificates…</span>
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
            <EmptyState
              icon={Award01Icon}
              title="No certificates yet"
              description="Enrol in a programme and complete all requirements to earn your certificate."
              action={{ label: 'View Programmes', href: '/student/programs' }}
            />
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                  {['Programme', 'Cohort', 'Status', 'Date Issued', 'Certificate No.', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f4f6]">
                {rows.map(row => {
                  const issued = row.issuedAt !== null
                  return (
                    <tr key={row.key} className="hover:bg-[#fafafa] transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-[13px] font-semibold text-[#111827] font-display">{row.title}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[13px] text-[#4b5563] font-body">{row.cohortLabel || '—'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge issued={issued} />
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[13px] text-[#4b5563] font-body">{row.issuedAt ?? '—'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[12px] text-[#4b5563] font-body tracking-wide">{row.certificateNumber ?? '—'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { if (issued) setSelectedRow(row) }}
                            disabled={!issued}
                            className={`flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[12px] font-medium font-display border transition-colors ${
                              issued ? 'border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]' : 'border-[#f3f4f6] text-[#d1d5db] cursor-not-allowed'
                            }`}
                          >
                            <EyeIcon size={13} strokeWidth={1.5} />
                            View
                          </button>
                          <button
                            onClick={e => handleDownloadRow(row, e)}
                            disabled={!issued}
                            className={`flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[12px] font-medium font-display transition-colors ${
                              issued ? 'bg-[#d51520] text-white hover:bg-[#b81119]' : 'bg-[#f3f4f6] text-[#d1d5db] cursor-not-allowed'
                            }`}
                          >
                            <Download01Icon size={13} strokeWidth={1.5} />
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRow && (
        <CertificateModal
          row={selectedRow}
          fullName={fullName}
          onClose={() => setSelectedRow(null)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}
