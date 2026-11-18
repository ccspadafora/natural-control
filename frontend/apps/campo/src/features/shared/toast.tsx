import { useEffect, useState } from "react"
import { createRoot, type Root } from "react-dom/client"

type ToastTone = "ok" | "warn" | "info"

let host: HTMLDivElement | null = null
let root: Root | null = null
let hideTimer: number | undefined

function ensureHost() {
  if (host) return host
  host = document.createElement("div")
  host.className = "nc-campo-toast-host"
  document.body.appendChild(host)
  root = createRoot(host)
  return host
}

function ToastView({ message, tone }: { message: string; tone: ToastTone }) {
  return (
    <div className={`nc-campo-toast nc-campo-toast--${tone}`} role="status">
      {message}
    </div>
  )
}

export function showToast(message: string, tone: ToastTone = "info") {
  ensureHost()
  root?.render(<ToastView message={message} tone={tone} />)
  window.clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => {
    root?.render(null)
  }, 2800)
}

/** Hook-friendly dismissible toast for screens that own their state. */
export function useToast() {
  const [msg, setMsg] = useState<{ text: string; tone: ToastTone } | null>(null)
  useEffect(() => {
    if (!msg) return
    const t = window.setTimeout(() => setMsg(null), 2800)
    return () => window.clearTimeout(t)
  }, [msg])
  return {
    toast: msg,
    show: (text: string, tone: ToastTone = "info") => setMsg({ text, tone }),
    clear: () => setMsg(null),
  }
}
