'use client'

import { Delete01Icon, Loading01Icon } from 'hugeicons-react'

interface Props {
  title?: string
  message?: string
  itemName?: string
  onConfirm: () => void
  onCancel: () => void
  deleting?: boolean
  confirmLabel?: string
}

export default function DeleteConfirmModal({
  title = 'Delete item?',
  message,
  itemName,
  onConfirm,
  onCancel,
  deleting = false,
  confirmLabel = 'Delete',
}: Props) {
  const body = message ?? (
    itemName
      ? `"${itemName}" will be permanently deleted. This action cannot be undone.`
      : 'This item will be permanently deleted. This action cannot be undone.'
  )

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-[14px] shadow-xl w-full max-w-[400px] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-7 pb-5 text-center">
          <div className="w-12 h-12 rounded-full bg-[#fef2f2] flex items-center justify-center mx-auto mb-4">
            <Delete01Icon size={20} color="#d51520" strokeWidth={1.5} />
          </div>
          <h3 className="text-[16px] font-bold text-[#111827] font-display mb-2">{title}</h3>
          <p className="text-[13px] text-[#475467] font-body leading-[1.6]">{body}</p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium font-body text-[#374151] hover:bg-[#f9fafb] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
          >
            {deleting && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
