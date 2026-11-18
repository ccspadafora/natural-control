import { useEffect, useState } from "react"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { ConsoleShell } from "../../admin"

type Props = {
  user: SessionUser
  onLogout: () => void
  title: string
  lede: string
  fetchPath: string
  emptyTitle: string
  emptyBody: string
}

function rowLabel(row: Record<string, unknown>): string {
  const candidate = row.title ?? row.name ?? row.client_name ?? row.id
  return candidate != null ? String(candidate) : "Registro"
}

export function BacklogStubPage({ user, onLogout, title, lede, fetchPath, emptyTitle, emptyBody }: Props) {
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let alive = true
    setRows(null)
    setError("")
    api<{ results: Record<string, unknown>[] }>(fetchPath)
      .then((data) => {
        if (alive) setRows(data.results)
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : "No se pudo cargar")
      })
    return () => {
      alive = false
    }
  }, [fetchPath])

  return (
    <ConsoleShell user={user} onLogout={onLogout} title={title} lede={lede}>
      {error ? <p className="nc-note">{error}</p> : null}
      {rows === null && !error ? <p className="nc-portal-muted">Cargando…</p> : null}
      {rows && rows.length === 0 ? (
        <section className="nc-portal-card">
          <h2>{emptyTitle}</h2>
          <p className="nc-portal-muted">{emptyBody}</p>
        </section>
      ) : null}
      {rows && rows.length > 0 ? (
        <ul className="nc-portal-list">
          {rows.map((row, index) => (
            <li key={String(row.id ?? index)}>{rowLabel(row)}</li>
          ))}
        </ul>
      ) : null}
    </ConsoleShell>
  )
}