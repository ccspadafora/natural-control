import { useEffect, useState } from "react"
import { Link, useOutletContext } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Format } from "@nc/ui"

type OppRow = {
  id: string
  title: string
  client_name: string
  stage_name: string
  amount: string
}

type OutletCtx = { user: SessionUser }

export function OportunidadesScreen() {
  const { user } = useOutletContext<OutletCtx>()
  const enabled = Boolean(user.features.pipeline)
  const [rows, setRows] = useState<OppRow[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) return
    api<{ results: OppRow[] }>("/api/v1/pipeline/opportunities")
      .then((data) => setRows(data.results))
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar las oportunidades"))
      .finally(() => setLoading(false))
  }, [enabled])

  if (!enabled) {
    return (
      <>
        <header className="nc-campo-head">
          <Link className="nc-text-link" to="/numeros">
            ← Mis números
          </Link>
          <h1>Mis oportunidades</h1>
        </header>
        <section className="nc-campo-page">
          <p style={{ font: "var(--text-body)", color: "var(--ink-secondary)" }}>
            El embudo comercial aún no está activo en este entorno.
          </p>
        </section>
      </>
    )
  }

  return (
    <>
      <header className="nc-campo-head">
        <Link className="nc-text-link" to="/numeros">
          ← Mis números
        </Link>
        <h1>Mis oportunidades</h1>
      </header>
      <section className="nc-campo-page">
        {error ? <p className="nc-note">{error}</p> : null}
        {loading ? <p style={{ color: "var(--ink-secondary)" }}>Cargando…</p> : null}
        {!loading && rows.length === 0 ? (
          <p style={{ font: "var(--text-body)", color: "var(--ink-secondary)" }}>
            Aún no tienes oportunidades registradas. Cierra visitas con interés comercial para verlas aquí.
          </p>
        ) : null}
        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              padding: "12px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--hairline)",
              background: "var(--surface)",
            }}
          >
            <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 3 }}>
              <span style={{ font: "var(--text-label)" }}>{row.client_name}</span>
              <span style={{ font: "var(--text-caption)", color: "var(--ink-secondary)" }}>
                {row.title} · {row.stage_name}
              </span>
            </span>
            <span style={{ font: "var(--text-label)", fontVariantNumeric: "tabular-nums" }}>{Format.money(Number(row.amount))}</span>
          </div>
        ))}
      </section>
    </>
  )
}
