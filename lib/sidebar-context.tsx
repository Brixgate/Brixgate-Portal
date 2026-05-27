'use client'

import { createContext, useContext, useState } from 'react'

interface SidebarContextType {
  mobileOpen: boolean
  openMobile: () => void
  closeMobile: () => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  toggleCollapsed: () => void
}

const SidebarContext = createContext<SidebarContextType>({
  mobileOpen: false,
  openMobile: () => {},
  closeMobile: () => {},
  collapsed: false,
  setCollapsed: () => {},
  toggleCollapsed: () => {},
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed]   = useState(false)

  return (
    <SidebarContext.Provider
      value={{
        mobileOpen,
        openMobile:  () => setMobileOpen(true),
        closeMobile: () => setMobileOpen(false),
        collapsed,
        setCollapsed,
        toggleCollapsed: () => setCollapsed(v => !v),
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
