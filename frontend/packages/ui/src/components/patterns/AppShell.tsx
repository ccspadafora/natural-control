import type { ReactNode } from "react"

export type AppShellProps = {
  header?: ReactNode
  sidebar?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}

/** Contenedor base de aplicación (stub para patrones Consola/Campo). */
export function AppShell({ header, sidebar, children, footer, className = "" }: AppShellProps) {
  if (sidebar) {
    return (
      <div className={["nc-desk", className].filter(Boolean).join(" ")}>
        <aside className="nc-side">{sidebar}</aside>
        <div className="nc-desk-main">
          {header}
          <main className="nc-page">{children}</main>
        </div>
        {footer}
      </div>
    )
  }
  return (
    <div className={["nc-shell", className].filter(Boolean).join(" ")}>
      {header ? <header className="nc-top">{header}</header> : null}
      <main className="nc-main">{children}</main>
      {footer}
    </div>
  )
}
