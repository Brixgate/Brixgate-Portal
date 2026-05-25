'use client'

import { useEffect, useRef, useCallback } from 'react'

const TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const

/**
 * Logs the user out after TIMEOUT_MS of complete inactivity.
 * Resets on any mouse, keyboard, scroll, or touch event.
 */
export function useSessionTimeout(onTimeout: () => void) {
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbackRef = useRef(onTimeout)

  // Keep callback ref fresh without restarting the timer
  useEffect(() => { callbackRef.current = onTimeout }, [onTimeout])

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => callbackRef.current(), TIMEOUT_MS)
  }, [])

  useEffect(() => {
    reset() // start timer immediately

    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, reset, { passive: true }))

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, reset))
    }
  }, [reset])
}
