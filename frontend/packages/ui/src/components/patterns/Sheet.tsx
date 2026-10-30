import type { ReactNode } from "react"

export type SheetProps = {
  open: boolean
  title: string
  children: ReactNode
  onClose?: () => void
  className?: string
}

export function Sheet({ open, title, children, onClose, className = "" }: SheetProps) {
  if (!open) return null
  return (
    <>
      <button type="button" className="nc-scrim" aria-label="Cerrar panel" onClick={onClose} />
      <aside className={["nc-panel", "nc-side", "is-open", className].filter(Boolean).join(" ")} role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </aside>
    </>
  )
}
