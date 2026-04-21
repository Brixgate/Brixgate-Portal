import TopNav from '@/components/layout/TopNav'
import { MOCK_ENROLLMENTS, MOCK_STUDENT } from '@/lib/mock-data'
import { Award01Icon, LockIcon, Download01Icon, CheckmarkCircle01Icon } from 'hugeicons-react'
import EmptyState from '@/components/shared/EmptyState'

function getStatusBadge(progress: number) {
  if (progress >= 100) return { label: 'Completed', color: '#16a34a', bg: '#ecfdf3', border: '#bbf7d0' }
  if (progress > 0)    return { label: 'In Progress', color: '#d97706', bg: '#fffbeb', border: '#fde68a' }
  return                      { label: 'Not Started', color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb' }
}

function RequirementItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${done ? 'bg-[#d51520]' : 'bg-[#f3f4f6]'}`}>
        {done
          ? <CheckmarkCircle01Icon size={12} color="white" strokeWidth={2} />
          : <div className="w-1.5 h-1.5 rounded-full bg-[#d1d5db]" />}
      </div>
      <p className={`text-[13px] font-body leading-snug ${done ? 'text-[#374151]' : 'text-[#9ca3af]'}`}>
        {label}
      </p>
    </div>
  )
}

function CertificateCard({
  enrollment,
}: {
  enrollment: (typeof MOCK_ENROLLMENTS)[number]
}) {
  const { cohort, progress } = enrollment
  const program = cohort.program
  const isUnlocked = progress >= 100
  const status = getStatusBadge(progress)

  const cohortLabel = cohort.name.replace(`${program.title} — `, '')

  const endDate = cohort.endDate
    ? new Date(cohort.endDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  const requirements = [
    { label: 'Attend at least 80% of live sessions', done: progress >= 40 },
    { label: 'Submit all required assignments',       done: progress >= 60 },
    { label: 'Complete all session materials',        done: progress >= 80 },
    { label: 'Final assessment passed',               done: progress >= 100 },
  ]

  return (
    <div className="grid grid-cols-[1fr_340px] gap-5">
      {/* Left: certificate preview */}
      <div className="flex flex-col gap-4">
        {/* Progress banner */}
        <div className="bg-[#fef2f2] border border-[#fecdca] rounded-[12px] p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[15px] font-semibold text-[#111827] font-display leading-tight">
                {program.title}
              </p>
              <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">{cohortLabel}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border font-display"
                style={{ color: status.color, background: status.bg, borderColor: status.border }}
              >
                {status.label}
              </span>
              <span className="text-[22px] font-bold text-[#d51520] font-display">{progress}%</span>
            </div>
          </div>
          <div className="h-2 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-[#d51520] rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[12px] text-[#9ca3af] font-body mt-2">
            {isUnlocked
              ? 'Programme complete — your certificate is ready!'
              : `${100 - progress}% remaining to unlock your certificate`}
          </p>
        </div>

        {/* Certificate design */}
        <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
          <div className="relative">
            <div
              className={`relative min-h-[340px] flex flex-col items-center justify-center p-10 text-center ${!isUnlocked ? 'select-none' : ''}`}
              style={{ background: 'linear-gradient(160deg, #fff9f9 0%, #ffffff 50%, #fff9f9 100%)', borderBottom: '1px solid #f3f4f6' }}
            >
              {/* Corner decorations */}
              <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-[#fecdca] rounded-tl-[4px]" />
              <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-[#fecdca] rounded-tr-[4px]" />
              <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-[#fecdca] rounded-bl-[4px]" />
              <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-[#fecdca] rounded-br-[4px]" />

              {/* Lock overlay */}
              {!isUnlocked && (
                <div className="absolute inset-0 backdrop-blur-[6px] bg-white/60 z-10 flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-[#f3f4f6] flex items-center justify-center">
                    <LockIcon size={24} color="#9ca3af" strokeWidth={1.5} />
                  </div>
                  <p className="text-[14px] font-semibold text-[#374151] font-display">
                    Complete the programme to unlock
                  </p>
                  <p className="text-[12px] text-[#9ca3af] font-body max-w-[240px]">
                    {100 - progress}% remaining — keep going!
                  </p>
                </div>
              )}

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#d51520] font-display mb-4">
                Certificate of Completion
              </p>
              <p className="text-[13px] text-[#9ca3af] font-body mb-2">This is to certify that</p>
              <p className="text-[28px] font-bold text-[#111827] font-display leading-tight mb-3">
                {MOCK_STUDENT.firstName} {MOCK_STUDENT.lastName}
              </p>
              <p className="text-[12px] text-[#6b7280] font-body mb-1">has successfully completed</p>
              <p className="text-[16px] font-semibold text-[#111827] font-display max-w-[360px] mb-1">{program.title}</p>
              <p className="text-[11px] text-[#9ca3af] font-body">{cohortLabel}</p>

              <div className="mt-5 flex items-center gap-6">
                <div className="text-center">
                  <div className="w-20 h-px bg-[#e5e7eb] mb-1 mx-auto" />
                  <p className="text-[10px] text-[#9ca3af] font-body">{isUnlocked ? endDate : 'Date'}</p>
                </div>
                <div className="w-9 h-9 rounded-full border-2 border-[#d51520] flex items-center justify-center">
                  <span className="text-[9px] font-bold text-[#d51520] font-display">BG</span>
                </div>
                <div className="text-center">
                  <div className="w-20 h-px bg-[#e5e7eb] mb-1 mx-auto" />
                  <p className="text-[10px] text-[#9ca3af] font-body">Instructor</p>
                </div>
              </div>
            </div>

            {/* Download bar */}
            <div className="px-6 py-4 flex items-center justify-between">
              <p className="text-[12px] text-[#9ca3af] font-body">
                {isUnlocked ? 'Your certificate is ready to download.' : 'Certificate locked until programme completion.'}
              </p>
              <button
                disabled={!isUnlocked}
                className={`inline-flex items-center gap-2 text-[13px] font-medium font-display px-4 py-2 rounded-[8px] transition-colors ${
                  isUnlocked
                    ? 'bg-[#d51520] text-white hover:bg-[#b81119]'
                    : 'bg-[#f3f4f6] text-[#d1d5db] cursor-not-allowed'
                }`}
              >
                <Download01Icon size={14} strokeWidth={1.5} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right: requirements + details */}
      <div className="flex flex-col gap-4">
        {/* Requirements */}
        <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] p-6">
          <p className="text-[15px] font-semibold text-[#111827] font-display mb-0.5">Requirements</p>
          <p className="text-[12px] text-[#9ca3af] font-body mb-4">Complete all steps to unlock your certificate.</p>
          <div className="flex flex-col gap-3">
            {requirements.map(({ label, done }) => (
              <RequirementItem key={label} done={done} label={label} />
            ))}
          </div>
        </div>

        {/* Certificate details */}
        <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] p-6">
          <p className="text-[15px] font-semibold text-[#111827] font-display mb-4">Certificate Details</p>
          <div className="flex flex-col gap-4">
            {[
              { label: 'Recipient',   value: `${MOCK_STUDENT.firstName} ${MOCK_STUDENT.lastName}` },
              { label: 'Programme',   value: program.title },
              { label: 'Cohort',      value: cohortLabel },
              { label: 'Course Ends', value: endDate },
              { label: 'Issuer',      value: 'Brixgate Academy' },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">{label}</p>
                <p className="text-[13px] font-medium text-[#374151] font-body">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CertificatePage() {
  const isEnrolled = MOCK_ENROLLMENTS.length > 0

  return (
    <>
      <TopNav title="My Certificate" />

      <div className="px-8 pb-10">
        {/* Page header */}
        <div className="pt-7 pb-6">
          <h1 className="text-[24px] font-bold text-[#111827] font-display leading-tight">
            My Certificates
          </h1>
          <p className="text-[14px] text-[#6b7280] font-body mt-1">
            Complete each programme to earn and download your Brixgate certificate.
          </p>
        </div>

        {!isEnrolled ? (
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
            <EmptyState
              icon={Award01Icon}
              title="No certificates yet"
              description="Enrol in a programme and complete all requirements to earn your certificate."
              action={{ label: 'View Programmes', href: '/student/programs' }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {MOCK_ENROLLMENTS.map((enrollment) => (
              <CertificateCard key={enrollment.cohortId} enrollment={enrollment} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
