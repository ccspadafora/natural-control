import { useEffect, useState } from "react"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { ConsoleShell } from "../../admin"

type ErpStatus = { enabled: boolean; last_run: string | null }

export function ErpPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [status, setStatus] = useState<ErpStatus | null>(null)
  const [unmatched, setUnmatched] = useState<Record<string, unknown>[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let alive = true
    setStatus(null)
    setUnmatched(null)
    setError("")
    Promise.all([
      api<ErpStatus>("/api/v1/erp/status"),
      api<{ results: Record<string, unknown>[] }>("/api/v1/erp/unmatched"),
    ])
      .then(([statusData, unmatchedData]) => {
        if (!alive) return
        setStatus(statusData)
        setUnmatched(unmatchedData.results)
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : "No se pudo cargar")
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title="Conciliación ERP"
      lede="Ventas y cartera del ERP frente al CRM."
    >
      {error ? <p className="nc-note">{error}</p> : null}
      {status === null && unmatched === null && !error ? <p className="nc-portal-muted">Cargando…</p> : null}
      {status ? (
        <section className="nc-portal-card">
          <h2>Estado del conector</h2>
          <p className="nc-portal-muted">
            {status.enabled ? "Integración habilitada" : "Integración deshabilitada"} · última corrida:{" "}
            {status.last_run ?? "Sin ejecuciones registradas"}
          </p>
        </section>
      ) : null}
      {unmatched && unmatched.length === 0 ? (
        <section className="nc-portal-card">
          <h2>Sin registros sin conciliar</h2>
          <p className="nc-portal-muted">Cuando el conector reporte diferencias entre ERP y CRM, aparecerán aquí.</p>
        </section>
      ) : null}
      {unmatched && unmatched.length > 0 ? (
        <ul className="nc-portal-list">
          {unmatched.map((row, index) => (
            <li key={String(row.id ?? index)}>{String(row.id ?? "Registro sin conciliar")}</li>
          ))}
        </ul>
      ) : null}
    </ConsoleShell>
  )
}