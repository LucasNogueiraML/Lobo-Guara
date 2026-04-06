"use client"

import { useEffect } from "react"
import { SessionProvider } from "next-auth/react"

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return

    const registerWorker = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js")
      } catch {
        // Sem impacto funcional para quem nao usa PWA
      }
    }

    registerWorker()
  }, [])

  return <SessionProvider>{children}</SessionProvider>
}
