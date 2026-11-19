import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "@nc/api"
import { Badge, FilterPills, Format, Sheet } from "@nc/ui"
import type { ForecastDeals } from "../../mgmt/shared/metrics"

const HORIZON_FILTERS = [
  { id: "all", label: "Todos" },
  { id: "CORTO", label: "Corto" },
  { id: "MEDIANO", label: "Mediano" },
  { id: "LARGO", label: "Largo" },
]

const HORIZON_LABEL: Record<string, string> = {
  CORTO: "Corto",
  MEDIANO: "Mediano",
  LARGO: "Largo",
}

const HORIZON_TONE: Record<string, "success" | "warning" | "accent"> = {
  CORTO: "success",
  MEDIANO: "warning",
  LARGO: "accent",
}

function shortDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short" })
}

export type ForecastDealsSheetProps = {
  open: boolean
  onClose: () => void
  productId?: string
  initialHorizon?: string
}

export function ForecastDealsSheet({ open, onClose, productId, initialHorizon = "all" }: ForecastDealsSheetProps) {
  const [data, setData] = useState<ForecastDeals | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [horizon, setHorizon] = useState(initialHorizon)

  useEffect(() => {
    if (!open) return
    setHorizon(initialHorizon)
  }, [open, initialHorizon])

  useEffect(() => {
    if (!open) return
    setData(null)
    setError(null)
    const qs = productId ? `?product_id=${encodeURIComponent(productId)}` : ""
    api<ForecastDeals>(`/api/v1/forecast/deals${qs}`)
      .then(setData)
      .catch(() => setError("No pudimos cargar el detalle del pipeline."))
  }, [open, productId])

  const rows = useMemo(() => {
    if (!data) return []
    if (horizon === "all") return data.deals
    return data.deals.filter((d) => d.horizon === horizon)
  }, [data, horizon])

  if (!open) return null

  const gap = data?.summary.gap
  const totals = data?.summary.totals
  const falta = gap?.falta ?? 0
  const coverProb = falta > 0 && totals ? totals.probable : 0
  const coverPct = falta > 0 && totals ? Math.min(100, (totals.probable / falta) * 100) : 0

  return (
    <Sheet open title="Proyección de ventas" onClose={onClose} className="nc-sheet nc-forecast-panel-drawer">
      {error ? <p className="nc-note">{error}</p> : null}
      {!data && !error ? <p className="nc-portal-muted">Cargando oportunidades…</p> : null}

      {data ? (
        <>
          <div className="nc-forecast-deals-summary">
            {falta > 0 ? (
              <p>
                Estas líneas suman <strong>{Format.money(coverProb)}</strong> probable frente a{" "}
                <strong>{Format.money(falta)}</strong> que te falta ({Format.percent(coverPct)} del hueco).
              </p>
            ) : (
              <p>Ya alcanzaste la meta del mes. El pipeline abierto es upside adicional.</p>
            )}
            {data.summary.tips.length > 0 ? (
              <ul className="nc-forecast-deals-tips">
                {data.summary.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            ) : null}
          </div>

          <FilterPills items={HORIZON_FILTERS} value={horizon} onChange={setHorizon} />

          <div className="nc-forecast-deals-list" role="list">
            {rows.length === 0 ? (
              <p className="nc-portal-muted">No hay potencial abierto con este filtro.</p>
            ) : (
              rows.map((row) => (
                <article key={row.id} className="nc-forecast-deal-row" role="listitem">
                  <div className="nc-forecast-deal-main">
                    <strong>{row.client_name}</strong>
                    <span className="nc-portal-muted">
                      {row.product_name}
                      {row.municipality ? ` · ${row.municipality}` : ""}
                    </span>
                  </div>
                  <div className="nc-forecast-deal-meta">
                    <span>{Format.money(row.total_value)}</span>
                    {row.horizon ? (
                      <Badge tone={HORIZON_TONE[row.horizon] ?? "neutral"}>{HORIZON_LABEL[row.horizon] ?? row.horizon}</Badge>
                    ) : null}
                    <span className="nc-portal-muted">
                      {row.expected_date ? `Cierre ${shortDate(row.expected_date)}` : "Sin fecha"}
                    </span>
                  </div>
                  <div className="nc-forecast-deal-actions">
                    <Link className="nc-text-link" to={`/portal/clientes/${row.client_id}`}>
                      Ver cliente
                    </Link>
                    <Link className="nc-text-link" to={`/portal/visitas/${row.visit_id}`}>
                      Ver visita
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </>
      ) : null}
    </Sheet>
  )
}