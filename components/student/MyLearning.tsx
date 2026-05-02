'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  StarIcon,
  BookOpen01Icon,
  UserGroupIcon,
  File01Icon,
  PresentationBarChart01Icon,
  FolderZipIcon,
  FileEditIcon,
  ArrowRight01Icon,
  Download01Icon,
} from 'hugeicons-react'
import { MOCK_ENROLLMENTS, MOCK_RESOURCES } from '@/lib/mock-data'
import type { Resource } from '@/lib/types/index'
import { getProgramImage } from '@/lib/program-images'
import { cn } from '@/lib/utils'

const TABS = ['My Programs', 'Resources', 'Certifications']

// ── File type config ────────────────────────────────────────────────────────
const FILE_ICONS: Record<string, React.ElementType> = {
  pdf:  File01Icon,
  pptx: PresentationBarChart01Icon,
  zip:  FolderZipIcon,
  docx: FileEditIcon,
}
const FILE_COLOURS: Record<string, { bg: string; text: string }> = {
  pdf:  { bg: '#FEF2F2', text: '#D51520' },
  pptx: { bg: '#FFF7ED', text: '#EA580C' },
  zip:  { bg: '#F0F9FF', text: '#0EA5E9' },
  docx: { bg: '#F0FDF4', text: '#16A34A' },
}

function isNew(uploadedAt: string): boolean {
  const diffDays = (Date.now() - new Date(uploadedAt).getTime()) / 86400000
  return diffDays <= 7
}

function ResourceRow({ resource }: { resource: Resource }) {
  const FileIcon = FILE_ICONS[resource.fileType] ?? File01Icon
  const colours = FILE_COLOURS[resource.fileType] ?? { bg: '#F7F8FA', text: '#6b7280' }
  const uploaded = new Date(resource.uploadedAt).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="flex items-center gap-3 py-2.5 hover:bg-[#f9fafb] rounded-[6px] px-2 transition-colors group">
      <div
        className="w-8 h-8 rounded-[7px] flex items-center justify-center flex-shrink-0"
        style={{ background: colours.bg }}
      >
        <FileIcon size={14} color={colours.text} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-medium text-[#111827] font-body truncate leading-snug">
            {resource.title}
          </p>
          {isNew(resource.uploadedAt) && (
            <span className="text-[9px] font-bold uppercase tracking-wide bg-[#fef2f2] text-[#d51520] px-1.5 py-0.5 rounded-[3px] flex-shrink-0 font-display">
              New
            </span>
          )}
        </div>
        <p className="text-[11px] text-[#9ca3af] font-body mt-0.5">
          {resource.fileType.toUpperCase()} · {resource.fileSize} · {uploaded}
        </p>
      </div>
      <a
        href={resource.downloadUrl}
        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-[#9ca3af] hover:text-[#374151]"
        aria-label="Download"
      >
        <Download01Icon size={14} strokeWidth={1.5} />
      </a>
    </div>
  )
}

// ── Course card ─────────────────────────────────────────────────────────────
function CourseCard({
  cohortName,
  programTitle,
  progress,
  thumbImage,
  href,
}: {
  cohortName: string
  programTitle: string
  progress: number
  thumbImage?: string
  href: string
}) {
  return (
    <div className="border border-[#eee] rounded-[12px] overflow-hidden w-[271px] shrink-0">
      <div
        className="h-[142px] flex items-end p-3 relative overflow-hidden bg-[#1a1d2e]"
        style={{
          backgroundImage: thumbImage ? `url(${thumbImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute top-3 left-3 bg-[#d51520] text-white text-[8px] font-medium px-2 py-0.5 rounded-full font-display z-10">
          Beginner — Expert
        </div>
        <p className="text-white text-[13px] font-semibold font-display leading-tight pr-4 relative z-10">
          {programTitle}
        </p>
      </div>

      <div className="bg-white p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-[16px] font-semibold text-[#0f172a] font-display leading-snug">
            {cohortName.split('—')[0].trim()}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              <StarIcon size={12} color="#f59e0b" strokeWidth={0} />
              <span className="text-[12px] text-[#f59e0b] font-semibold font-body">4.8</span>
            </div>
            <span className="text-[#d1d5db]">·</span>
            <span className="text-[12px] text-[#727272] font-body">12 weeks</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <BookOpen01Icon size={12} color="#374151" strokeWidth={1.5} />
            <span className="text-[12px] font-medium text-[#374151] font-body">12 Sessions</span>
          </div>
          <span className="text-[#d1d5db]">|</span>
          <div className="flex items-center gap-1">
            <UserGroupIcon size={12} color="#374151" strokeWidth={1.5} />
            <span className="text-[12px] font-medium text-[#374151] font-body">47 Students</span>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between mb-1.5">
            <span className="text-[11px] text-[#9ca3af] font-body">Progress</span>
            <span className="text-[12px] font-semibold text-[#374151] font-body">{progress}%</span>
          </div>
          <div className="h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#d51520] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Link
          href={href}
          className="flex items-center justify-center bg-[#d51520] text-white text-[13px] font-medium font-body h-9 rounded-[7px] hover:bg-[#b81119] transition-colors"
        >
          Continue Learning
        </Link>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function MyLearning() {
  const [activeTab, setActiveTab] = useState('My Programs')

  const enrolledCohorts = MOCK_ENROLLMENTS.map((e) => ({
    enrollment: e,
    cohort: e.cohort,
  }))

  // Show 4 most recent resources
  const recentResources = [...MOCK_RESOURCES]
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 4)

  return (
    <div className="bg-white rounded-[10px] overflow-hidden shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
      {/* Header */}
      <div className="px-6 pt-5 pb-0">
        <p className="text-[17px] font-semibold text-[#111827] font-display leading-none">
          My Learning
        </p>
      </div>

      {/* Tabs */}
      <div className="mt-3 flex border-b border-[#e5e7eb] px-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex flex-col items-center pb-0 mr-6 last:mr-0"
          >
            <span
              className={cn(
                'pb-2.5 text-[14px] font-display transition-colors',
                activeTab === tab
                  ? 'font-semibold text-[#d51715]'
                  : 'font-normal text-[#6b7280] hover:text-[#374151]'
              )}
            >
              {tab}
            </span>
            <div
              className={cn(
                'h-[2px] w-full rounded-t-full transition-colors',
                activeTab === tab ? 'bg-[#d51715]' : 'bg-transparent'
              )}
            />
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* My Programs */}
        {activeTab === 'My Programs' && (
          <div className="flex flex-wrap gap-4">
            {enrolledCohorts.length === 0 && (
              <div className="w-full py-10 text-center">
                <BookOpen01Icon size={36} color="#d1d5db" className="mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-[14px] font-semibold text-[#374151] font-display">No programmes yet</p>
                <p className="text-[13px] text-[#9ca3af] font-body mt-1">
                  Your enrolled programmes will appear here.
                </p>
              </div>
            )}
            {enrolledCohorts.map(({ enrollment, cohort }) => (
              <CourseCard
                key={enrollment.id}
                cohortName={cohort.name}
                programTitle={cohort.program.title}
                progress={enrollment.progress}
                thumbImage={getProgramImage(cohort.program.title)}
                href="/student/programs"
              />
            ))}
          </div>
        )}

        {/* Resources */}
        {activeTab === 'Resources' && (
          <div>
            {recentResources.length === 0 ? (
              <div className="py-8 text-center">
                <File01Icon size={32} color="#d1d5db" className="mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-[14px] font-semibold text-[#374151] font-display">No resources yet</p>
                <p className="text-[13px] text-[#9ca3af] font-body mt-1">
                  Session materials will appear here once uploaded.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col -mx-2">
                  {recentResources.map((r) => (
                    <ResourceRow key={r.id} resource={r} />
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-[#f3f4f6]">
                  <Link
                    href="/student/resources"
                    className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[#d51520] font-display hover:underline"
                  >
                    View all resources
                    <ArrowRight01Icon size={13} color="#d51520" strokeWidth={2} />
                  </Link>
                </div>
              </>
            )}
          </div>
        )}

        {/* Certifications */}
        {activeTab === 'Certifications' && (
          <div className="py-8 text-center">
            <p className="text-[14px] font-semibold text-[#374151] font-display mb-1">
              Not yet unlocked
            </p>
            <p className="text-[13px] text-[#9ca3af] font-body">
              Complete your programme to earn your certificate.
            </p>
            <Link
              href="/student/certificate"
              className="inline-flex items-center gap-1.5 mt-4 text-[13px] font-semibold text-[#d51520] font-display hover:underline"
            >
              View requirements
              <ArrowRight01Icon size={13} color="#d51520" strokeWidth={2} />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
