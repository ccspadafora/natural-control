import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button, Icon } from "@nc/ui"
import { getLastSyncAt, listPending, flushOutbox, isOfflineMode, useOutbox } from "../../offline"
import type { OutboxRow } from "../../offline/db"

function describeRow(row: OutboxRow) {
  if (row.path.includes("/clients")) return "Nuevo cliente"
  if (row.path.endsWith("/close")) return "Cierre de visita"
  if (row.path.endsWith("/not-done")) return "Visita no realizada"
  return `${row.method} ${row.path}`
}

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60_000)
  if (mins < 1) return "ahora"
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.round(mins / 60)
  return `hace ${hours} h`
}

export function SincronizacionScreen() {
  const navigate = useNavigate()
  const { pending, offline, syncing } = useOutbox()
  const [rows, setRows] = useState<OutboxRow[]>([])
  const [lastSync, setLastSync] = useState<string | null>(null)

  useEffect(() => {
    void listPending().then(setRows)
    void getLastSyncAt().then(setLastSync)
  }, [pending, syncing])

  async function syncNow() {
    if (isOfflineMode()) {
      window.alert("Sigues sin señal. Lo enviamos apenas vuelva.")
      return
    }
    await flushOutbox()
    setRows(await listPending())
    setLastSync(await getLastSyncAt())
  }

  const headline =
    pending === 0
      ? "0 registros pendientes"
      : `${pending} ${pending === 1 ? "registro pendiente" : "registros pendientes"}`

  return (
    <>
      <header className="nc-campo-head">
        <div className="nc-campo-head-row">
          <button
            type="button"
            className="nc-campo-link-row"
            style={{ width: 48, color: "var(--ink)" }}
            aria-label="Volver"
            onClick={() => navigate("/yo")}
          >
            <Icon name="chevronLeft" />
          </button>
          <div style={{ flex: 1 }}>
            <div className="nc-campo-eyebrow">{headline}</div>
            <h1 style={{ font: "var(--text-title)" }}>Sincronización</h1>
          </div>
        </div>
      </header>

      <section className="nc-campo-page">
        {lastSync ? (
          <p className="nc-kicker" style={{ marginBottom: "var(--space-4)" }}>
            Última sincronización: {ago(lastSync)}
          </p>
        ) : null}

        {pending === 0 ? (
          <p style={{ margin: "var(--space-8) 0", textAlign: "center", font: "var(--text-body-lg)", color: "var(--ink-secondary)" }}>
            Todo está sincronizado. Lo que registres sin señal aparecerá aquí.
          </p>
        ) : (
          <ul className="nc-campo-list" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {rows.map((row) => (
              <li
                key={row.client_uuid}
                style={{
                  display: "flex",
                  gap: "var(--space-3)",
                  alignItems: "flex-start",
                  padding: "var(--space-3) 0",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <Icon name="cloudOff" />
                <div style={{ flex: 1 }}>
                  <strong>{describeRow(row)}</strong>
                  <div className="nc-kicker">{ago(row.created_at)}</div>
                  {row.last_error ? <div className="nc-note">{row.last_error}</div> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="nc-campo-visit-footer">
        <Button size="lg" block icon="refresh" disabled={syncing || pending === 0} onClick={() => void syncNow()}>
          {syncing ? "Sincronizando…" : offline ? "Esperando señal…" : "Sincronizar ahora"}
        </Button>
      </div>
    </>
  )
}
