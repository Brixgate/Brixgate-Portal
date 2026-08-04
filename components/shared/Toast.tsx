'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { CheckmarkCircle01Icon, AlertCircleIcon, Cancel01Icon, InformationCircleIcon } from 'hugeicons-react'

// ── Types ─────────────────────────────────────────────────────────────────────
export type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counterRef = useRef(0)

  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `toast-${++counterRef.current}`
    setToasts(prev => [...prev, { id, message, variant }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (msg: string) => addToast(msg, 'success'),
    error:   (msg: string) => addToast(msg, 'error'),
    info:    (msg: string) => addToast(msg, 'info'),
  }

  return { toasts, toast, removeToast }
}

// ── Single toast item ─────────────────────────────────────────────────────────
const VARIANT_CONFIG: Record<ToastVariant, {
  bg: string; border: string; text: string; Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; className?: string }>
}> = {
  success: {
    bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D',
    Icon: CheckmarkCircle01Icon,
  },
  error: {
    bg: '#FEF2F2', border: '#FECACA', text: '#DC2626',
    Icon: AlertCircleIcon,
  },
  info: {
    bg: '#F0F9FF', border: '#BAE6FD', text: '#0369A1',
    Icon: InformationCircleIcon,
  },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const cfg = VARIANT_CONFIG[toast.variant]

  useEffect(() => {
    const timer = setTimeout(onRemove, toast.variant === 'error' ? 6000 : 4000)
    return () => clearTimeout(timer)
  }, [toast.variant, onRemove])

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-[10px] shadow-md border text-[13px] font-body max-w-[360px] min-w-[240px] animate-[slideIn_0.2s_ease-out]"
      style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.text }}
    >
      <cfg.Icon size={16} color={cfg.text} strokeWidth={1.8} className="flex-shrink-0 mt-[1px]" />
      <p className="flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={onRemove}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-[1px]"
        aria-label="Dismiss"
      >
        <Cancel01Icon size={13} color={cfg.text} strokeWidth={1.8} />
      </button>
    </div>
  )
}

// ── Container rendered at the bottom-right of the viewport ───────────────────
export function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2.5 items-end">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={() => onRemove(t.id)} />
      ))}
    </div>
  )
}
