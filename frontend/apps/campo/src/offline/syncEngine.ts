import { flushOutbox } from "./outbox"

const FLUSH_DEBOUNCE_MS = 2000

let started = false
let debounce: ReturnType<typeof setTimeout> | null = null

function scheduleFlush() {
  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(() => {
    debounce = null
    void flushOutbox()
  }, FLUSH_DEBOUNCE_MS)
}

export function startOfflineSync() {
  if (started || typeof window === "undefined") return () => undefined
  started = true

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
    window.removeEventListener("online", onOnline)
    document.removeEventListener("visibilitychange", onVisible)
    window.clearInterval(interval)
    if (debounce) clearTimeout(debounce)
  }
}
