'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'brixgate_student_avatar'

export function useAvatar() {
  const [avatar, setAvatarState] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setAvatarState(stored)
    } catch {
      // localStorage not available
    }
    setIsLoaded(true)
  }, [])

  const setAvatar = useCallback((dataUrl: string | null) => {
    try {
      if (dataUrl) {
        localStorage.setItem(STORAGE_KEY, dataUrl)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // localStorage not available
    }
    setAvatarState(dataUrl)
  }, [])

  return { avatar, setAvatar, isLoaded }
}
