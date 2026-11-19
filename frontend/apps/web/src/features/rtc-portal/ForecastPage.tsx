import { useCallback, useEffect, useState, type KeyboardEvent } from "react"
import { Link } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge, ComplianceMeter, Format, StatTile } from "@nc/ui"
import { monthLong, type Forecast } from "../mgmt/shared/metrics"
import { useForecast } from "../mgmt/shared/useMetrics"
import { PortalPage } from "./PortalPage"
import { portalMonthEyebrow } from "./shared/format"
import { ForecastDealsSheet } from "./shared/ForecastDealsSheet"

type MyNumbers = {
  sales: number
  budget: number
  expected: number
  falta: number
  day: number
  days_in_month: number
}

export function ForecastPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [kpi, setKpi] = useState<MyNumbers | null>(null)
  const { data: forecast, error } = useForecast(4)
  const [dealsOpen, setDealsOpen] = useState(false)
  const [dealsProductId, setDealsProductId] = useState<string | undefined>()
  const [dealsHorizon, setDealsHorizon] = useState("all")

  useEffect(() => {
    api<MyNumbers>("/api/v1/metrics/my-numbers")
      .then(setKpi)
      .catch(() => setKpi(null))
  }, [])

  const openDeals = useCallback((opts?: { productId?: string; horizon?: string }) => {
    setDealsProductId(opts?.productId)
    setDealsHorizon(opts?.horizon ?? "all")
    setDealsOpen(true)
  }, [])

  const sales = kpi?.sales ?? 0
  const budget = kpi?.budget ?? 0
  const expected = kpi?.expected ?? 0
  const falta = kpi?.falta ?? Math.max(0, budget - sales)
  const day = kpi?.day ?? 1
  const daysInMonth = kpi?.days_in_month ?? 30
  const gap = forecast?.gap
  const left = gap?.days_left ?? Math.max(0, daysInMonth - day)
  const fcCom = forecast?.totals.committed ?? 0
  const fcProb = forecast?.totals.probable ?? 0
  const behind = expected > 0 && sales < expected
  const months = forecast?.by_month ?? []
  const projection = sales * (daysInMonth / Math.max(1, day))
  const rangeTitle =
    months.length > 1
      ? `${monthLong(months[0].month)} → ${monthLong(months[months.length - 1].month)}`
      : "Próximos meses"

  return (
    <PortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-page-head">
        <div className="nc-portal-hero">
          <span className="nc-portal-eyebrow">
            {portalMonthEyebrow()} · quedan {left} días
          </span>
          <h1>Mi forecast</h1>
        </div>
        <Link className="nc-btn nc-btn-secondary" to="/portal/programacion">
          Armar programación
        </Link>
      </header>

      {error ? <p className="nc-note">{error}</p> : null}

      <div className="nc-forecast-hero-metrics">
        <StatTile label="Ventas del mes" value={Format.money(sales)} caption={budget > 0 ? `Meta ${Format.money(budget)}` : "Sin meta"} onClick={() => openDeals()} />
        <StatTile label="Te falta" value={Format.money(falta)} caption={`Proyección al cierre ${Format.money(projection)}`} onClick={() => openDeals()} />
        <StatTile label="Forecast probable" value={forecast ? Format.money(fcProb) : "—"} caption="Potencial ponderado" onClick={() => openDeals()} />
        <StatTile
          label="Citas a agendar"
          value={gap ? String(gap.visits_needed) : "—"}
          caption={gap ? `Ticket ${Format.money(gap.ticket_avg)}` : "Sin historial aún"}
          onClick={() => openDeals()}
        />
      </div>

      <div className="nc-portal-split">
        <section className="nc-forecast-panel">
          <div className="nc-forecast-panel-head">
            <h2>Cumplimiento de la meta</h2>
            {expected > 0 ? (
              <Badge tone={behind ? "warning" : "success"} icon={behind ? "alert" : "check"}>
                {behind ? "Por debajo del ritmo" : "Al ritmo"}
              </Badge>
            ) : null}
          </div>
          <ComplianceMeter label="Ventas · cumplimiento a la fecha" value={sales} target={budget} expected={expected} />
          <div className="nc-forecast-stat-grid">
            <ClickableMetric label="Meta" value={Format.money(budget)} onActivate={() => openDeals()} />
            <ClickableMetric
              label="Avance"
              value={budget > 0 ? Format.percent((sales / budget) * 100) : "—"}
              onActivate={() => openDeals()}
            />
            <ClickableMetric label="Esperado a la fecha" value={Format.money(expected)} onActivate={() => openDeals()} />
          </div>
        </section>

        <section className="nc-forecast-panel nc-forecast-panel-clickable" role="button" tabIndex={0} onClick={() => openDeals()} onKeyDown={activateKey(openDeals)}>
          <div className="nc-forecast-panel-head">
            <h2>¿Te alcanza el forecast?</h2>
            {forecast ? <ReachBadge falta={falta} forecast={forecast} /> : null}
          </div>
          <div className="nc-forecast-bars">
            <ForecastBar label="Te falta" value={falta} max={Math.max(falta, fcProb, fcCom, 1)} tone="var(--ink-tertiary)" />
            <ForecastBar label="Comprometido" value={fcCom} max={Math.max(falta, fcProb, fcCom, 1)} tone="var(--primary)" />
            <ForecastBar label="Probable" value={fcProb} max={Math.max(falta, fcProb, fcCom, 1)} tone="var(--accent)" />
          </div>
          <p className="nc-portal-muted">Calculado con el potencial abierto de tus visitas.</p>
        </section>
      </div>

      <section className="nc-forecast-panel nc-forecast-panel-clickable" role="button" tabIndex={0} onClick={() => openDeals()} onKeyDown={activateKey(openDeals)}>
        <div className="nc-forecast-panel-head">
          <h2>Plan para cerrar la brecha</h2>
        </div>
        <div className="nc-forecast-stat-grid nc-forecast-stat-grid-4">
          <ClickableMetric label="Ticket promedio" value={gap ? Format.money(gap.ticket_avg) : "—"} onActivate={() => openDeals()} bare />
          <ClickableMetric label="Tasa de cierre" value={gap ? Format.percent(gap.close_rate * 100) : "—"} onActivate={() => openDeals()} bare />
          <ClickableMetric
            label="Negocios que faltan"
            value={gap && gap.ticket_avg > 0 ? String(Math.ceil(gap.falta / gap.ticket_avg)) : "—"}
            onActivate={() => openDeals()}
            bare
          />
          <ClickableMetric label="Citas a agendar" value={gap ? String(gap.visits_needed) : "—"} onActivate={() => openDeals()} highlight bare />
        </div>
      </section>

      <section className="nc-forecast-panel">
        <div className="nc-forecast-panel-head">
          <div>
            <h2>Pipeline por producto</h2>
            <p className="nc-portal-muted" style={{ margin: "4px 0 0" }}>
              {rangeTitle}
            </p>
          </div>
        </div>
        <div className="nc-forecast-hero-metrics nc-forecast-hero-metrics-3">
          <StatTile label="Optimista" value={forecast ? Format.money(forecast.totals.optimistic) : "—"} onClick={() => openDeals()} />
          <StatTile label="Probable" value={forecast ? Format.money(forecast.totals.probable) : "—"} onClick={() => openDeals()} />
          <StatTile label="Comprometido" value={forecast ? Format.money(forecast.totals.committed) : "—"} onClick={() => openDeals()} />
        </div>
        <div className="nc-table-wrap nc-forecast-table">
          <table className="nc-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th style={{ textAlign: "right" }}>Optimista</th>
                <th style={{ textAlign: "right" }}>Probable</th>
                <th style={{ textAlign: "right" }}>Comprometido</th>
              </tr>
            </thead>
            <tbody>
              {(forecast?.by_product ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="nc-empty">
                    Aún no tienes potencial abierto. Ciérralo al registrar productos en la visita.
                  </td>
                </tr>
              ) : (
                forecast!.by_product.map((row) => (
                  <tr
                    key={row.id}
                    className="nc-forecast-product-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => openDeals({ productId: row.id })}
                    onKeyDown={activateKey(() => openDeals({ productId: row.id }))}
                  >
                    <td>
                      <strong>{row.name}</strong>
                    </td>
                    <td style={{ textAlign: "right" }}>{Format.money(row.optimistic)}</td>
                    <td style={{ textAlign: "right" }}>{Format.money(row.probable)}</td>
                    <td style={{ textAlign: "right" }}>{Format.money(row.committed)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ForecastDealsSheet
        open={dealsOpen}
        onClose={() => setDealsOpen(false)}
        productId={dealsProductId}
        initialHorizon={dealsHorizon}
      />
    </PortalPage>
  )
}

function activateKey(fn: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      fn()
    }
  }
}

function ClickableMetric({
  label,
  value,
  onActivate,
  highlight,
  bare,
}: {
  label: string
  value: string
  onActivate: () => void
  highlight?: boolean
  bare?: boolean
}) {
  const cls = [bare ? "" : "", highlight ? "nc-forecast-highlight" : ""].filter(Boolean).join(" ")
  return (
    <div
      className={["nc-forecast-metric-hit", cls].filter(Boolean).join(" ")}
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={activateKey(onActivate)}
    >
      <span className="nc-portal-muted">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ReachBadge({ falta, forecast }: { falta: number; forecast: Forecast }) {
  if (falta <= 0) return <Badge tone="success" icon="check">Ya llegaste a la meta</Badge>
  if (forecast.totals.committed >= falta) return <Badge tone="success" icon="check">Te alcanza lo comprometido</Badge>
  if (forecast.totals.probable >= falta) return <Badge tone="warning" icon="alert">Te alcanza si cierras lo probable</Badge>
  return <Badge tone="danger" icon="alert">Aún no te alcanza</Badge>
}

function ForecastBar({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="nc-forecast-bar-row">
      <span className="nc-forecast-bar-label">{label}</span>
      <div className="nc-forecast-bar-track">
        <div className="nc-forecast-bar-fill" style={{ width: `${width}%`, background: tone }} />
      </div>
      <span className="nc-forecast-bar-value">{Format.money(value)}</span>
    </div>
  )
}