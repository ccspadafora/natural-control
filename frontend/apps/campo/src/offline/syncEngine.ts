import { pullRemote } from "./cache"
import { flushOutbox, isOfflineMode } from "./outbox"
import { notifyOutbox } from "./events"

const FLUSH_DEBOUNCE_MS = 2000

let started = false
let debounce: ReturnType<typeof setTimeout> | null = null
let currentUserId: string | null = null
let syncingPull = false

async function syncCycle() {
  if (isOfflineMode() || !currentUserId) return
  if (!syncingPull) {
    syncingPull = true
    notifyOutbox()
    try {
      await pullRemote(currentUserId)
    } catch {
      // Si el pull falla, igual intentamos vaciar el outbox.
    } finally {
      syncingPull = false
      notifyOutbox()
    }
  }
  await flushOutbox()
}

function scheduleFlush() {
  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(() => {
    debounce = null
    void syncCycle()
  }, FLUSH_DEBOUNCE_MS)
}

export function startOfflineSync(userId?: string) {
  if (started || typeof window === "undefined") return () => undefined
  started = true
  currentUserId = userId || null

  const onOnline = () => scheduleFlush()
  const onVisible = () => {
    if (document.visibilityState === "visible") scheduleFlush()
  }

  window.addEventListener("online", onOnline)
  document.addEventListener("visibilitychange", onVisible)
  const interval = window.setInterval(() => {
    if (navigator.onLine) scheduleFlush()
  }, 60_000)

  if (navigator.onLine) scheduleFlush()

  return () => {
    started = false
    currentUserId = null
    window.removeEventListener("online", onOnline)
    document.removeEventListener("visibilitychange", onVisible)
    window.clearInterval(interval)
    if (debounce) clearTimeout(debounce)
  }
}

export function isPullSyncing() {
  return syncingPull
}
