import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { Toast, type ToastTone } from "@nc/ui"

/** Toast efímero (patrón del prototipo): `show("texto")` y renderiza `node` al final de la página. */
export function useToast(ms = 4200) {
  const [state, setState] = useState<{ message: string; tone: ToastTone } | null>(null)
  const timer = useRef<number>()

  const show = useCallback(
    (message: string, tone: ToastTone = "success") => {
      window.clearTimeout(timer.current)
      setState({ message, tone })
      timer.current = window.setTimeout(() => setState(null), ms)
    },
    [ms],
  )

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const node: ReactNode = state ? (
    <div
      style={{ position: "fixed", right: 24, bottom: 24, zIndex: 80, maxWidth: 420, boxShadow: "var(--shadow-md, 0 8px 24px rgba(0,0,0,.18))" }}
    >
      <Toast message={state.message} tone={state.tone} icon={state.tone === "success" ? "check" : "alert"} />
    </div>
  ) : null

  return { show, node }
}
