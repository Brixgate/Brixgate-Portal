'use client'

import { useState, useEffect } from 'react'
import TopNav from '@/components/layout/TopNav'
import { Award01Icon, LockIcon, Download01Icon, CheckmarkCircle01Icon, Loading01Icon, Share01Icon } from 'hugeicons-react'
import EmptyState from '@/components/shared/EmptyState'
import { apiClient, unwrap } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'

// ── API shapes ────────────────────────────────────────────────────────────────
interface ApiCohort {
  id: number
  name: string
  end_date?: string
  start_date?: string
}

interface ApiEnrollment {
  id: number
  progress?: number
  cohort_id?: number
  cohort?: ApiCohort
}

interface ApiProgram {
  id: number
  title: string
  category?: string
  duration?: string
  enrollment?: ApiEnrollment
  progress?: number
  cohort?: ApiCohort
  cohort_id?: number
}

interface ApiCertification {
  id: number
  program_id?: number
  program_title?: string
  issued_at?: string
  certificate_url?: string
  pdf_url?: string
  certificate_number?: string
  certificateNumber?: string
  cohort_title?: string
  cohortTitle?: string
}

// ── Normalised ────────────────────────────────────────────────────────────────
interface CertRow {
  key: string
  programId: number
  title: string
  cohortLabel: string
  progress: number
  cohortId: number
  endDate: string
  certificateUrl: string | null
  issuedAt: string | null
  certificateNumber: string | null
}

function normaliseProgramToCertRow(raw: ApiProgram, certMap: Map<number, ApiCertification>): CertRow {
  const enrollment = raw.enrollment
  const cohort = enrollment?.cohort ?? raw.cohort ?? null
  const title = raw.title ?? 'Untitled Programme'
  const cohortName = cohort?.name ?? ''
  const cohortLabel = cohortName.replace(`${title} — `, '').replace(`${title} - `, '') || cohortName
  const cert = certMap.get(raw.id)

  return {
    key: String(raw.id),
    programId: raw.id,
    title,
    cohortLabel,
    progress: enrollment?.progress ?? raw.progress ?? 0,
    cohortId: enrollment?.cohort_id ?? cohort?.id ?? raw.cohort_id ?? 0,
    endDate: cohort?.end_date
      ? new Date(cohort.end_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
      : '—',
    certificateUrl:    cert?.certificate_url ?? cert?.pdf_url ?? null,
    issuedAt:          cert?.issued_at
      ? new Date(cert.issued_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
      : null,
    certificateNumber: cert?.certificate_number ?? cert?.certificateNumber ?? null,
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RequirementItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${done ? 'bg-[#d51520]' : 'bg-[#f3f4f6]'}`}>
        {done
          ? <CheckmarkCircle01Icon size={12} color="white" strokeWidth={2} />
          : <div className="w-1.5 h-1.5 rounded-full bg-[#d1d5db]" />}
      </div>
      <p className={`text-[13px] font-body leading-snug ${done ? 'text-[#374151]' : 'text-[#4b5563]'}`}>
        {label}
      </p>
    </div>
  )
}

function CertificateCard({ row, fullName }: { row: CertRow; fullName: string }) {
  const { title, cohortLabel, issuedAt, certificateNumber } = row
  // Unlocked = admin has issued the certificate (not based on progress)
  const isUnlocked = issuedAt !== null
  const [sharing, setSharing] = useState(false)

  function handleDownload() {
    // Print the certificate section — use window.print() with a print-only style
    window.print()
  }

  async function handleShare() {
    const text = `🎓 I'm proud to have completed ${title} at Brixgate!\n\nThis certificate was awarded to ${fullName} on ${issuedAt} for successfully completing ${title}${cohortLabel ? ` — ${cohortLabel}` : ''}.${certificateNumber ? `\n\nCertificate No: ${certificateNumber}` : ''}\n\n#Brixgate #AITraining #Certificate`
    setSharing(true)
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'My Brixgate Certificate', text })
      } else {
        await navigator.clipboard.writeText(text)
        alert('Share text copied to clipboard!')
      }
    } catch { /* user cancelled */ } finally { setSharing(false) }
  }

  return (
    <div className="grid grid-cols-[1fr_340px] gap-5">
      {/* Left: certificate visual */}
      <div className="flex flex-col gap-4">

        {/* Status banner */}
        <div className={`rounded-[12px] p-5 border ${isUnlocked ? 'bg-[#ecfdf3] border-[#bbf7d0]' : 'bg-[#fef2f2] border-[#fecdca]'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isUnlocked ? 'bg-[#dcfce7]' : 'bg-[#fee2e2]'}`}>
              {isUnlocked
                ? <CheckmarkCircle01Icon size={20} color="#16a34a" strokeWidth={1.5} />
                : <LockIcon size={18} color="#d51520" strokeWidth={1.5} />
              }
            </div>
            <div>
              <p className={`text-[14px] font-semibold font-display ${isUnlocked ? 'text-[#166534]' : 'text-[#991b1b]'}`}>
                {isUnlocked ? 'Certificate issued' : 'Certificate pending'}
              </p>
              <p className={`text-[12px] font-body mt-0.5 ${isUnlocked ? 'text-[#16a34a]' : 'text-[#d51520]'}`}>
                {isUnlocked
                  ? `Issued on ${issuedAt}`
                  : 'Your instructor has not yet issued your certificate'}
              </p>
            </div>
          </div>
        </div>

        {/* Certificate preview */}
        <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden" id="certificate-print-area">
          <div className="relative">
            {/* Certificate visual — replace inner content with <img> when template image is provided */}
            <div
              className={`relative min-h-[380px] flex flex-col items-center justify-center p-10 text-center ${!isUnlocked ? 'select-none' : ''}`}
              style={{ background: 'linear-gradient(160deg, #fff9f9 0%, #ffffff 50%, #fff9f9 100%)', borderBottom: '1px solid #f3f4f6' }}
            >
              {/* Corner decorations */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-[#fecdca] rounded-tl-[4px]" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-[#fecdca] rounded-tr-[4px]" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-[#fecdca] rounded-bl-[4px]" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-[#fecdca] rounded-br-[4px]" />

              {/* Lock overlay */}
              {!isUnlocked && (
                <div className="absolute inset-0 backdrop-blur-[6px] bg-white/70 z-10 flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-[#f3f4f6] flex items-center justify-center">
                    <LockIcon size={26} color="#9ca3af" strokeWidth={1.5} />
                  </div>
                  <p className="text-[14px] font-semibold text-[#374151] font-display">Certificate not yet issued</p>
                  <p className="text-[12px] text-[#6b7280] font-body max-w-[240px]">
                    Your instructor will issue your certificate once they&apos;ve reviewed your performance.
                  </p>
                </div>
              )}

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d51520] font-display mb-5">
                Certificate of Completion
              </p>
              <p className="text-[13px] text-[#6b7280] font-body mb-2">This is to certify that</p>
              <p className="text-[30px] font-bold text-[#111827] font-display leading-tight mb-3">{fullName}</p>
              <p className="text-[12px] text-[#6b7280] font-body mb-2">has successfully completed</p>
              <p className="text-[17px] font-semibold text-[#111827] font-display max-w-[380px] leading-snug mb-1">{title}</p>
              {cohortLabel && <p className="text-[12px] text-[#6b7280] font-body">{cohortLabel}</p>}

              <div className="mt-6 flex items-center gap-8">
                <div className="text-center">
                  <div className="w-24 h-px bg-[#e5e7eb] mb-1.5 mx-auto" />
                  <p className="text-[10px] text-[#6b7280] font-body">{issuedAt ?? '—'}</p>
                  <p className="text-[9px] text-[#9ca3af] font-body uppercase tracking-wider mt-0.5">Date Issued</p>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-[#d51520] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#d51520] font-display">BG</span>
                </div>
                <div className="text-center">
                  <div className="w-24 h-px bg-[#e5e7eb] mb-1.5 mx-auto" />
                  <p className="text-[10px] text-[#6b7280] font-body">Brixgate Academy</p>
                  <p className="text-[9px] text-[#9ca3af] font-body uppercase tracking-wider mt-0.5">Issuer</p>
                </div>
              </div>

              {certificateNumber && (
                <p className="mt-4 text-[9px] text-[#9ca3af] font-body tracking-widest uppercase">
                  Certificate No: {certificateNumber}
                </p>
              )}
            </div>

            {/* Action bar */}
            <div className="px-6 py-4 flex items-center justify-between gap-3">
              <p className="text-[12px] text-[#6b7280] font-body">
                {isUnlocked ? 'Download or share your certificate.' : 'Available once your instructor issues it.'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShare}
                  disabled={!isUnlocked || sharing}
                  className={`inline-flex items-center gap-2 text-[13px] font-semibold font-display px-4 py-2 rounded-[8px] border transition-colors ${
                    isUnlocked
                      ? 'border-[#d1d5dd] text-[#374151] hover:bg-[#f9fafb]'
                      : 'border-[#e5e7eb] text-[#d1d5db] cursor-not-allowed'
                  }`}
                >
                  <Share01Icon size={14} strokeWidth={1.5} />
                  Share
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!isUnlocked}
                  className={`inline-flex items-center gap-2 text-[13px] font-semibold font-display px-4 py-2 rounded-[8px] transition-colors ${
                    isUnlocked
                      ? 'bg-[#d51520] text-white hover:bg-[#b81119]'
                      : 'bg-[#f3f4f6] text-[#d1d5db] cursor-not-allowed'
                  }`}
                >
                  <Download01Icon size={14} strokeWidth={1.5} />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: details */}
      <div className="flex flex-col gap-4">
        <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] p-6">
          <p className="text-[15px] font-semibold text-[#111827] font-display mb-4">Certificate Details</p>
          <div className="flex flex-col gap-4">
            {[
              { label: 'Recipient',          value: fullName },
              { label: 'Programme',          value: title },
              { label: 'Cohort',             value: cohortLabel || '—' },
              { label: 'Date of Issue',      value: issuedAt ?? 'Pending' },
              { label: 'Certificate No.',    value: certificateNumber ?? 'Pending' },
              { label: 'Issuer',             value: 'Brixgate Academy' },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">{label}</p>
                <p className="text-[13px] font-medium text-[#374151] font-body">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {!isUnlocked && (
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] p-6">
            <p className="text-[15px] font-semibold text-[#111827] font-display mb-0.5">What&apos;s next?</p>
            <p className="text-[12px] text-[#6b7280] font-body mb-4">Steps your instructor evaluates before issuing your certificate.</p>
            <div className="flex flex-col gap-3">
              {[
                'Attend at least 80% of live sessions',
                'Submit all required assignments',
                'Complete all session materials',
                'Pass the final assessment',
              ].map(label => (
                <RequirementItem key={label} done={false} label={label} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CertificatePage() {
  const { user } = useAuth()
  const [rows, setRows]       = useState<CertRow[]>([])
  const [loading, setLoading] = useState(true)

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : ''

  useEffect(() => {
    async function load() {
      try {
        // Fetch programs and certifications in parallel
        const [programsRes, certsRes] = await Promise.all([
          apiClient.get('/users/me/programs'),
          apiClient.get('/users/me/certifications').catch(() => ({ data: [] })),
        ])

        const programs = (unwrap<ApiProgram[]>(programsRes.data) ?? [])
        const certs    = (unwrap<ApiCertification[]>(certsRes.data) ?? [])

        // Build a map of program_id → certification
        const certMap = new Map<number, ApiCertification>()
        for (const c of certs) {
          if (c.program_id) certMap.set(c.program_id, c)
        }

        const certRows = (Array.isArray(programs) ? programs : []).map((p) =>
          normaliseProgramToCertRow(p, certMap)
        )
        setRows(certRows)
      } catch {
        // Any failure (401, network, missing endpoint) — just show empty state.
        // "No certificates yet" is always more helpful than "something went wrong"
        // when the user simply hasn't enrolled or isn't authenticated yet.
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <>
      <TopNav title="My Certificate" />

      <div className="px-4 md:px-8 pb-10">
        <div className="pt-7 pb-6">
          <h1 className="text-[24px] font-bold text-[#111827] font-display leading-tight">
            My Certificates
          </h1>
          <p className="text-[14px] text-[#4b5563] font-body mt-1">
            Complete each programme to earn and download your Brixgate certificate.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-2 text-[#4b5563]">
            <Loading01Icon size={18} className="animate-spin" strokeWidth={1.5} />
            <span className="text-[13px] font-body">Loading your certificates…</span>
          </div>
        )}

        {/* Empty */}
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

        {/* Cards */}
        {!loading && rows.length > 0 && (
          <div className="flex flex-col gap-10">
            {rows.map((row) => (
              <CertificateCard key={row.key} row={row} fullName={fullName} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
