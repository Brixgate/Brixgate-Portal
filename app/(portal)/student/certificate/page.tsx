'use client'

import { useState, useEffect, useCallback } from 'react'
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
  instructorName: string          // fetched from cohort members after initial load
  instructorSignatureUrl: string  // signature image URL from instructor profile
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
    instructorName: '',
    instructorSignatureUrl: '',
  }
}

// ── Fetch the instructor for a given cohort ───────────────────────────────────
interface InstructorData { name: string; signatureUrl: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractName(u: any): string {
  if (!u) return ''
  return (
    u.name ??
    `${u.first_name ?? u.firstName ?? ''} ${u.last_name ?? u.lastName ?? ''}`.trim()
  ) || u.email || ''
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSignatureUrl(u: any): string {
  if (!u) return ''
  return u.signature_url ?? u.signatureUrl ?? u.signature ?? ''
}

async function fetchCohortInstructor(cohortId: number): Promise<InstructorData> {
  const endpoints = [
    `/cohorts/${cohortId}/instructors`,
    `/cohorts/${cohortId}/users?role=INSTRUCTOR`,
    `/cohorts/${cohortId}/members?role=INSTRUCTOR`,
    `/cohorts/${cohortId}`,
  ]
  for (const ep of endpoints) {
    try {
      const res  = await apiClient.get(ep)
      const data = unwrap<unknown>(res.data)
      if (!data) continue

      // endpoint returned a list of instructors / users
      const candidates: unknown[] = (() => {
        if (Array.isArray(data)) return data
        const d = data as Record<string, unknown>
        if (Array.isArray(d.instructors)) return d.instructors
        if (Array.isArray(d.users))       return d.users
        if (Array.isArray(d.members))     return d.members
        return []
      })()

      if (candidates.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const match = candidates.find((u: any) =>
          !u?.role || String(u.role).toUpperCase() === 'INSTRUCTOR'
        ) ?? candidates[0]
        const name = extractName(match)
        if (name) return { name, signatureUrl: extractSignatureUrl(match) }
      }

      // endpoint returned cohort details — check for nested instructors
      const cohort = data as Record<string, unknown>
      const nested: unknown = cohort.instructors ?? cohort.instructor ?? cohort.tutor
      if (nested) {
        if (Array.isArray(nested) && nested.length > 0) {
          const name = extractName(nested[0])
          if (name) return { name, signatureUrl: extractSignatureUrl(nested[0]) }
        } else if (typeof nested === 'object' && nested !== null) {
          const name = extractName(nested)
          if (name) return { name, signatureUrl: extractSignatureUrl(nested) }
        }
      }
    } catch { /* try next endpoint */ }
  }
  return { name: '', signatureUrl: '' }
}

// ── Certificate card design (based on brixer-certificate.html template) ───────
const CORNER_SVG = (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M1 11 V1 H11" stroke="#FF294E" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

function CertificateDesign({ row, fullName }: { row: CertRow; fullName: string }) {
  const { title, cohortLabel, certificateNumber } = row

  const pubLink = certificateNumber
    ? `https://brixgate.com/verify/${certificateNumber}`
    : 'https://brixgate.com'
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&color=000000&bgcolor=ffffff&data=${encodeURIComponent(pubLink)}`
  const programmeLabel = cohortLabel || 'Expert Practitioner Programme · AI in My Field'

  return (
    <div
      id="brixgate-certificate"
      style={{
        position: 'relative',
        width: '100%',
        background: '#0B1224',
        border: '1.5px solid #FF294E',
        borderRadius: 18,
        padding: 'clamp(32px,5%,52px) clamp(28px,7%,64px) clamp(28px,4%,48px)',
        overflow: 'hidden',
        boxShadow: '0 0 0 1px rgba(255,41,78,.12), 0 0 40px rgba(255,41,78,.1), 0 32px 80px rgba(0,0,0,.5)',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        boxSizing: 'border-box',
      }}
    >
      {/* Watermark */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', userSelect: 'none', zIndex: 0,
      }}>
        <span style={{
          fontSize: 'clamp(60px,16vw,140px)', fontWeight: 900, letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.03)', whiteSpace: 'nowrap',
          fontFamily: "DM Sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}>BRIXGATE</span>
      </div>

      {/* Corner brackets */}
      <div style={{ position: 'absolute', top: 18, left: 18, zIndex: 1 }}>{CORNER_SVG}</div>
      <div style={{ position: 'absolute', top: 18, right: 18, zIndex: 1, transform: 'scaleX(-1)' }}>{CORNER_SVG}</div>
      <div style={{ position: 'absolute', bottom: 18, left: 18, zIndex: 1, transform: 'scaleY(-1)' }}>{CORNER_SVG}</div>
      <div style={{ position: 'absolute', bottom: 18, right: 18, zIndex: 1, transform: 'scale(-1)' }}>{CORNER_SVG}</div>

      {/* Body */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>

        {/* Logo — left-aligned row */}
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo2.png" alt="Brixgate" style={{ height: 28, width: 'auto', display: 'block' }} />
        </div>

        {/* Eyebrow */}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 14 }}>
          Expert Practitioner Certificate
        </div>
        <div style={{ width: 56, height: 2, background: '#FF294E', borderRadius: 2, marginBottom: 36 }} />

        <div style={{ fontSize: 14, fontStyle: 'italic', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>This certifies that</div>
        <div style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.15, marginBottom: 12 }}>
          {fullName || 'Student Name'}
        </div>
        <div style={{ fontSize: 14, fontStyle: 'italic', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>has successfully completed the</div>
        <div style={{ fontSize: 'clamp(16px,3vw,22px)', fontWeight: 800, color: '#FF294E', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 36 }}>
          {programmeLabel}
        </div>

        {/* QR */}
        <div style={{ background: '#ffffff', borderRadius: 10, padding: 10, marginBottom: 14, display: 'inline-flex' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} width={120} height={120} alt="QR code" style={{ display: 'block' }} />
        </div>
        {certificateNumber && (
          <div style={{ fontSize: 11, fontFamily: "'SF Mono','Fira Code','Courier New',monospace", color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>
            {certificateNumber}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Generate standalone HTML for print/PDF ────────────────────────────────────
function generatePrintHtml(row: CertRow, fullName: string, baseUrl: string): string {
  const { title, cohortLabel, certificateNumber } = row
  const pubLink        = certificateNumber ? `https://brixgate.com/verify/${certificateNumber}` : 'https://brixgate.com'
  const qrUrl          = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&color=000000&bgcolor=ffffff&data=${encodeURIComponent(pubLink)}`
  const logoUrl        = `${baseUrl}/images/logo2.png`
  const programmeLabel = cohortLabel || 'Expert Practitioner Programme · AI in My Field'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Certificate — ${fullName}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
html,body{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;background:#E8EBF0!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
@media print{@page{margin:0;size:A4 landscape}html,body{background:#E8EBF0!important}}
.cert-card{position:relative;width:860px;max-width:100%;background:#0B1224!important;border:1.5px solid #FF294E;border-radius:18px;padding:52px 64px 48px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,41,78,.12),0 0 40px rgba(255,41,78,.1),0 32px 80px rgba(0,0,0,.5)}
.wm{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;user-select:none;z-index:0}
.wm span{font-size:140px;font-weight:900;letter-spacing:.12em;color:rgba(255,255,255,.03);white-space:nowrap;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
.corner{position:absolute;width:22px;height:22px;z-index:1}
.corner svg{display:block}
.tl{top:18px;left:18px}.tr{top:18px;right:18px;transform:scaleX(-1)}.bl{bottom:18px;left:18px;transform:scaleY(-1)}.br{bottom:18px;right:18px;transform:scale(-1)}
.body{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;text-align:center}
.logo-row{width:100%;display:flex;align-items:center;margin-bottom:32px}
.logo-row img{height:28px;width:auto}
.eyebrow{font-size:11px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:14px}
.divider{width:56px;height:2px;background:#FF294E;border-radius:2px;margin-bottom:36px}
.certifies{font-size:14px;font-style:italic;color:rgba(255,255,255,.4);margin-bottom:12px}
.name{font-size:38px;font-weight:800;color:#fff;letter-spacing:-.01em;line-height:1.15;margin-bottom:12px}
.completed{font-size:14px;font-style:italic;color:rgba(255,255,255,.4);margin-bottom:10px}
.field{font-size:22px;font-weight:800;color:#FF294E;margin-bottom:8px}
.programme{font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.3);margin-bottom:36px}
.qr-wrap{background:#fff!important;border-radius:10px;padding:10px;margin-bottom:14px;display:inline-flex}
.cert-id{font-size:11px;font-family:'SF Mono','Fira Code','Courier New',monospace;color:rgba(255,255,255,.35);letter-spacing:.1em}
</style>
</head>
<body>
<div class="cert-card">
<div class="wm"><span>BRIXGATE</span></div>
<div class="corner tl"><svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M1 11 V1 H11" stroke="#FF294E" stroke-width="2" stroke-linecap="round"/></svg></div>
<div class="corner tr"><svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M1 11 V1 H11" stroke="#FF294E" stroke-width="2" stroke-linecap="round"/></svg></div>
<div class="corner bl"><svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M1 11 V1 H11" stroke="#FF294E" stroke-width="2" stroke-linecap="round"/></svg></div>
<div class="corner br"><svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M1 11 V1 H11" stroke="#FF294E" stroke-width="2" stroke-linecap="round"/></svg></div>
<div class="body">
<div class="logo-row"><img src="${logoUrl}" alt="Brixgate"></div>
<div class="eyebrow">Expert Practitioner Certificate</div>
<div class="divider"></div>
<div class="certifies">This certifies that</div>
<div class="name">${fullName}</div>
<div class="completed">has successfully completed the</div>
<div class="field">${title}</div>
<div class="programme">${programmeLabel}</div>
<div class="qr-wrap"><img src="${qrUrl}" width="120" height="120" alt="QR"></div>
<div class="cert-id">${certificateNumber ?? ''}</div>
</div>
</div>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},600)})<\/script>
</body></html>`
}

// ── Certificate modal ─────────────────────────────────────────────────────────
function CertificateModal({ row, fullName, onClose }: {
  row: CertRow; fullName: string; onClose: () => void
}) {
  const { toasts, toast, removeToast } = useToast()
  const { title, cohortLabel, issuedAt, certificateNumber } = row

  const pubLink = certificateNumber
    ? `https://brixgate.com/verify/${certificateNumber}`
    : 'https://brixgate.com'

  function handleDownload() {
    const html = generatePrintHtml(row, fullName, window.location.origin)
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
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-start overflow-y-auto py-10 px-4" onClick={onClose}>
        <div className="w-full max-w-[820px] flex flex-col gap-4" onClick={e => e.stopPropagation()}>
          {/* Certificate card */}
          <CertificateDesign row={row} fullName={fullName} />

          {/* Action bar */}
          <div className="bg-white rounded-[12px] p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleCopyLink}
                className="flex items-center gap-2 h-9 px-4 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] font-display hover:bg-[#f9fafb] transition-colors">
                <Copy01Icon size={14} color="#374151" strokeWidth={1.5} />
                Copy link
              </button>
              <button onClick={handleLinkedIn}
                className="flex items-center gap-2 h-9 px-4 rounded-[8px] bg-[#0A66C2] text-[13px] font-medium text-white font-display hover:bg-[#084fa1] transition-colors">
                <span style={{ fontWeight: 900, fontSize: 11, fontStyle: 'italic', background: 'rgba(255,255,255,0.18)', borderRadius: 3, padding: '1px 4px', lineHeight: 1 }}>in</span>
                Post to LinkedIn
              </button>
              <button onClick={handleNativeShare}
                className="flex items-center gap-2 h-9 px-4 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] font-display hover:bg-[#f9fafb] transition-colors">
                <Share01Icon size={14} color="#374151" strokeWidth={1.5} />
                Share
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleDownload}
                className="flex items-center gap-2 h-9 px-5 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] transition-colors">
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

      // Fetch instructor for each unique cohort (best-effort, parallel)
      const seen = new Set<number>()
      const uniqueCohortIds = baseRows.map(r => r.cohortId).filter(id => { if (!id || seen.has(id)) return false; seen.add(id); return true })
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
        instructorName:         instructorMap.get(r.cohortId)?.name         ?? '',
        instructorSignatureUrl: instructorMap.get(r.cohortId)?.signatureUrl ?? '',
      })))
    } catch {
      // show empty state — student may not be enrolled yet
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleDownloadRow(row: CertRow, e: React.MouseEvent) {
    e.stopPropagation()
    if (!row.issuedAt) { toast.error('Certificate not yet issued.'); return }
    const html = generatePrintHtml(row, fullName, window.location.origin)
    const win  = window.open('', '_blank')
    if (!win) { toast.error('Pop-up blocked — please allow pop-ups and try again.'); return }
    win.document.write(html)
    win.document.close()
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
            <EmptyState icon={Award01Icon} title="No certificates yet"
              description="Enrol in a programme and complete all requirements to earn your certificate."
              action={{ label: 'View Programmes', href: '/student/programs' }} />
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
        <CertificateModal row={selectedRow} fullName={fullName} onClose={() => setSelectedRow(null)} />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}
