import type { ReactNode } from "react"

export type PageHeadProps = {
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  actions?: ReactNode
  className?: string
}

export function PageHead({
  title,
  description,
  backHref,
  backLabel = "Volver",
  actions,
  className = "",
}: PageHeadProps) {
  return (
    <header className={["nc-page-head", className].filter(Boolean).join(" ")}>
      <div>
        {backHref ? (
          <a className="nc-back" href={backHref}>
            {backLabel}
          </a>
        ) : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions}
    </header>
  )
}
