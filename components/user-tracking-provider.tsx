"use client"

import type React from "react"

import { createContext, useContext, useEffect } from "react"
import { useAuth } from "./auth-provider"

interface UserTrackingContextType {
  trackEvent: (event: string, data?: any) => void
}

const UserTrackingContext = createContext<UserTrackingContextType>({
  trackEvent: () => {},
})

export function UserTrackingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  const trackEvent = async (event: string, data: any = {}) => {
    if (!user) return

    try {
      await fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          data,
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (error) {
      console.error("Error tracking event:", error)
    }
  }

  // Track page views
  useEffect(() => {
    if (user) {
      trackEvent("page_view", {
        path: window.location.pathname,
        referrer: document.referrer,
      })
    }
  }, [user])

  return <UserTrackingContext.Provider value={{ trackEvent }}>{children}</UserTrackingContext.Provider>
}

export const useUserTracking = () => useContext(UserTrackingContext)
