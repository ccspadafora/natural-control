import { useEffect, useState } from "react"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge } from "@nc/ui"
import { ConsoleShell } from "../../admin"

type Props = {
  user: SessionUser
  onLogout: () => void
  title: string
  lede: string
  feature?: "pipeline" | "whatsapp" | "automation" | "erp" | "ai_reports"
  fetchPath: string
  emptyTitle: string
  emptyBody: string
}

export function BacklogStubPage({ user, onLogout, title, lede, feature, fetchPath, emptyTitle, emptyBody }: Props) {
  const enabled = feature ? Boolean(user.features[feature]) : true
  const [count, setCount] = useState<number | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!enabled) return
    api<{ results: unknown[] }>(fetchPath)
      .then((data) => setCount(data.results.length))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar"))
  }, [enabled, fetchPath])

  return (
    <ConsoleShell user={user} onLogout={onLogout} title={title} lede={lede}>
      {!enabled ? (
        <div className="nc-portal-banner" role="status">
          <Badge tone="neutral">Próximamente</Badge>
          <span className="nc-portal-banner-text">
            Esta función está apagada en este entorno. Actívala en Parámetros cuando esté lista la integración.
          </span>
        </div>
      ) : null}
      {error ? <p className="nc-note">{error}</p> : null}
      {enabled && count === 0 ? (
        <section className="nc-portal-card">
          <h2>{emptyTitle}</h2>
          <p className="nc-portal-muted">{emptyBody}</p>
        </section>
      ) : null}
      {enabled && count !== null && count > 0 ? (
        <p className="nc-portal-muted">{count} registro(s) — la vista completa llegará en la siguiente fase.</p>
      ) : null}
    </ConsoleShell>
  )
}
