'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function NavigationProgress() {
  const pathname = usePathname()
  const [visible, setVisible]       = useState(false)
  const [completing, setCompleting] = useState(false)
  const prevPathRef = useRef(pathname)

  // When pathname changes, route has loaded — run completion animation then hide
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname
      setCompleting(true)
      const t = setTimeout(() => {
        setVisible(false)
        setCompleting(false)
      }, 350)
      return () => clearTimeout(t)
    }
  }, [pathname])

  // Intercept any internal link click — show bar INSTANTLY
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      const href = anchor.getAttribute('href') ?? ''
      // Skip external, hash-only, or same-page links
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) return
      if (href === prevPathRef.current) return
      setCompleting(false)
      setVisible(true)
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] overflow-hidden bg-[#fecdca]"
      style={{ pointerEvents: 'none' }}
    >
      {completing ? (
        // Route loaded — fill bar to 100% then fade out
        <div className="h-full w-full bg-[#d51520] transition-all duration-300" />
      ) : (
        // Route loading — animated shimmer moving right
        <div
          className="h-full w-1/3 bg-[#d51520] rounded-full"
          style={{ animation: 'nav-progress 1.2s ease-in-out infinite' }}
        />
      )}
    </div>
  )
}
