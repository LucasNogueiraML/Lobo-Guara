"use client"

import { useSyncExternalStore } from "react"

export const PRIVACY_STORAGE_KEY = "privacy-mode-enabled"
export const PRIVACY_EVENT_NAME = "privacy-mode-changed"

const listeners = new Set<() => void>()

export function readPrivacyMode(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(PRIVACY_STORAGE_KEY) === "1"
}

export function writePrivacyMode(enabled: boolean) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(PRIVACY_STORAGE_KEY, enabled ? "1" : "0")
  window.dispatchEvent(new CustomEvent(PRIVACY_EVENT_NAME, { detail: enabled }))
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  if (typeof window === "undefined") {
    return () => {
      listeners.delete(listener)
    }
  }

  function onStorage(event: StorageEvent) {
    if (event.key === PRIVACY_STORAGE_KEY) listener()
  }

  function onCustomEvent() {
    listener()
  }

  window.addEventListener("storage", onStorage)
  window.addEventListener(PRIVACY_EVENT_NAME, onCustomEvent)

  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(PRIVACY_EVENT_NAME, onCustomEvent)
  }
}

export function usePrivacyMode(): boolean {
  return useSyncExternalStore(subscribe, readPrivacyMode, () => false)
}
