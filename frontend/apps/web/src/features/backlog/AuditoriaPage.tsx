import { useEffect, useState } from "react"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { ConsoleShell } from "../../admin"

type AuditRow = {
  id: number
  at: string
  action: string
  entity_type: string
  actor_email: string | null
}

type AuditPage = { next: string | null; results: AuditRow[] }

export function AuditoriaPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [rows, setRows] = useState<AuditRow[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    api<AuditPage>("/api/v1/audit/logs")
      .then((data) => setRows(data.results))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar"))
  }, [])

  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title="Bitácora de auditoría"
      lede="Lectura de cambios sensibles — exportación en una fase posterior."
    >
      {error ? <p className="nc-note">{error}</p> : null}
      {rows && rows.length === 0 ? (
        <section className="nc-portal-card">
          <h2>Sin eventos todavía</h2>
          <p className="nc-portal-muted">
            Los cambios en parámetros, catálogo y usuarios aparecerán aquí conforme se registren en producción.
          </p>
        </section>
      ) : null}
      {rows && rows.length > 0 ? (
        <ul className="nc-portal-list">
          {rows.map((row) => (
            <li key={row.id}>
              <span className="nc-portal-muted">{row.at}</span> · {row.action} · {row.entity_type}
              {row.actor_email ? ` · ${row.actor_email}` : null}
            </li>
          ))}
        </ul>
      ) : null}
    </ConsoleShell>
  )
}
