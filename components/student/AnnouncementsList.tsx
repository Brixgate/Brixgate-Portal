import { Megaphone, ChevronRight } from 'lucide-react'
import { MOCK_NOTIFICATIONS } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

export default function AnnouncementsList() {
  const announcements = MOCK_NOTIFICATIONS
    .filter((n) => n.type === 'announcement')
    .slice(0, 3)

  return (
    <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#111827] font-[var(--font-dm-sans)]">
          Announcements
        </h3>
        <button className="text-[13px] text-[#D51520] font-medium hover:underline flex items-center gap-0.5">
          Mark all read <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
      </div>
      <div className="h-px bg-[#F3F4F6]" />

      {/* List */}
      <div className="p-4 space-y-1">
        {announcements.length === 0 && (
          <div className="py-10 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-[10px] bg-[#F7F8FA] flex items-center justify-center mb-3">
              <Megaphone className="w-5 h-5 text-[#9CA3AF]" strokeWidth={1.8} />
            </div>
            <p className="text-[14px] font-medium text-[#111827]">No announcements</p>
            <p className="text-[13px] text-[#9CA3AF] mt-1">You're all caught up!</p>
          </div>
        )}

        {announcements.map((note) => (
          <div
            key={note.id}
            className={cn(
              'px-3 py-3 rounded-[8px] cursor-pointer transition-colors hover:bg-[#F9FAFB]',
              !note.isRead && 'bg-[#FEF2F2] hover:bg-[#FEF2F2]/80'
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 mt-0.5',
                !note.isRead ? 'bg-[#D51520]' : 'bg-[#F3F4F6]'
              )}>
                <Megaphone
                  className={cn('w-[15px] h-[15px]', !note.isRead ? 'text-white' : 'text-[#9CA3AF]')}
                  strokeWidth={2}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn(
                    'text-[13px] leading-snug truncate',
                    !note.isRead ? 'font-semibold text-[#111827]' : 'font-medium text-[#374151]'
                  )}>
                    {note.title}
                  </p>
                  {!note.isRead && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D51520] flex-shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-[12px] text-[#9CA3AF] mt-0.5 line-clamp-2">{note.body}</p>
                <p className="text-[11px] text-[#D1D5DB] mt-1">
                  {new Date(note.createdAt).toLocaleDateString('en-NG', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
