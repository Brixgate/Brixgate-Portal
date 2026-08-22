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

// ── Certificate design using the official Brixgate SVG template ───────────────
// The SVG has all text as paths (Figma "outline text" export), so we overlay
// dynamic fields using absolutely-positioned HTML on top of the SVG image.
// Background colour #F6F4F2 (from SVG path fill) masks the placeholder paths.

const CERT_SVG_SRC  = '/Brixgate_Certificate_light_editable_11%202.svg'
const CERT_BODY_BG  = '#F6F4F2'

function CertificateDesign({ row, fullName }: { row: CertRow; fullName: string }) {
  const { title, issuedAt, instructorName } = row
  const completedDate = issuedAt
    ?? new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div
      id="brixgate-certificate"
      style={{ position: 'relative', width: '100%', aspectRatio: '1188/840', overflow: 'hidden', borderRadius: 12 }}
    >
      {/* SVG template as background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CERT_SVG_SRC}
        alt="Brixgate certificate"
        draggable={false}
        style={{ width: '100%', height: '100%', display: 'block', userSelect: 'none' }}
      />

      {/* ── Student name: height 10%, padding-top 3% pushes text to ~42% to align with SVG paths ── */}
      <div style={{
        position: 'absolute',
        top: '39%', left: '18.5%', right: '5%',
        height: '10%',
        background: CERT_BODY_BG,
        paddingTop: '3%',
        overflow: 'hidden',
      }}>
        <div style={{
          fontFamily: "DM Sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontSize: 'clamp(16px, 3.2vw, 38px)',
          fontWeight: 700,
          color: '#1A1D2E',
          lineHeight: 1.1,
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {fullName || 'Student Name'}
        </div>
      </div>

      {/* ── Programme name: height 13% covers SVG programme + its hardcoded date below ── */}
      <div style={{
        position: 'absolute',
        top: '59%', left: '18.5%', right: '5%',
        height: '13%',
        background: CERT_BODY_BG,
        paddingTop: '3%',
        overflow: 'hidden',
      }}>
        <div style={{
          fontFamily: "DM Sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontSize: 'clamp(12px, 2.5vw, 30px)',
          fontWeight: 700,
          color: '#D92D20',
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {title}
        </div>
      </div>

      {/* ── Completion date: centred in the content zone ── */}
      <div style={{
        position: 'absolute',
        top: '79%', left: '18.5%', right: '5%',
        height: '3%',
        background: CERT_BODY_BG,
        paddingTop: '0.5%',
        textAlign: 'center',
        overflow: 'hidden',
      }}>
        <div style={{
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: 'clamp(7px, 0.9vw, 12px)',
          color: '#475467',
          whiteSpace: 'nowrap',
        }}>
          Completed {completedDate}
        </div>
      </div>

      {/* ── Instructor: extends to cert bottom, fully masks SVG instructor name paths ── */}
      {instructorName && (
        <div style={{
          position: 'absolute',
          top: '92%', left: '18.5%', right: '50%',
          bottom: 0,
          background: CERT_BODY_BG,
          paddingTop: '1.5%',
          overflow: 'hidden',
        }}>
          <div style={{
            fontFamily: "DM Sans, -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: 'clamp(6px, 0.72vw, 9px)',
            fontWeight: 600,
            color: '#101828',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {instructorName}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Generate standalone HTML for print/PDF ────────────────────────────────────
// Uses the official SVG template with HTML overlays for dynamic fields.
function generatePrintHtml(row: CertRow, fullName: string, baseUrl: string): string {
  const { title, issuedAt, instructorName } = row
  const completedDate = issuedAt
    ?? new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
  const svgUrl = `${baseUrl}/Brixgate_Certificate_light_editable_11%202.svg`
  const bg     = '#F6F4F2'

  // Pixel positions calibrated for 1188×840 SVG canvas (scale 1:1)
  // top%  × 840 = px, left% × 1188 = px
  const instructorHtml = instructorName
    ? `<div class="ol" style="top:773px;left:220px;right:594px;bottom:0;padding-top:13px;">
        <div style="font-family:'DM Sans',-apple-system,sans-serif;font-size:11px;font-weight:600;color:#101828;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${instructorName}</div>
       </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Certificate — ${fullName}</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
html,body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#E8EBF0!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
@media print{@page{margin:0;size:A4 landscape}html,body{background:#E8EBF0!important;padding:0}}
.cert-wrap{position:relative;width:1188px;height:840px;overflow:hidden;border-radius:12px;flex-shrink:0;}
.cert-wrap img{width:1188px;height:840px;display:block;user-select:none;}
.ol{position:absolute;background:${bg};overflow:hidden;}
</style>
</head>
<body>
<div class="cert-wrap">
  <img src="${svgUrl}" alt="Certificate">
  <!-- name: top 39% = 328px, height 10% = 84px, padding-top 3% = 25px -->
  <div class="ol" style="top:328px;left:220px;right:60px;height:84px;padding-top:25px;">
    <div style="font-family:'DM Sans',-apple-system,sans-serif;font-size:50px;font-weight:700;color:#1A1D2E;line-height:1.1;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${fullName}</div>
  </div>
  <!-- programme: top 59% = 496px, height 13% = 109px, padding-top 3% = 25px -->
  <div class="ol" style="top:496px;left:220px;right:60px;height:109px;padding-top:25px;">
    <div style="font-family:'DM Sans',-apple-system,sans-serif;font-size:40px;font-weight:700;color:#D92D20;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
  </div>
  <!-- date: top 79% = 664px, height 3% = 25px -->
  <div class="ol" style="top:664px;left:220px;right:60px;height:25px;padding-top:4px;text-align:center;">
    <div style="font-family:Inter,-apple-system,sans-serif;font-size:13px;color:#475467;white-space:nowrap;">Completed ${completedDate}</div>
  </div>
  ${instructorHtml}
</div>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},800)})<\/script>
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
