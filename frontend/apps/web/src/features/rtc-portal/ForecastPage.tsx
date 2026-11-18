import { useEffect, useState } from "react"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge, ComplianceMeter, Format, StatTile } from "@nc/ui"
import { Link } from "react-router-dom"
import { monthLong, type Forecast } from "../mgmt/shared/metrics"
import { useForecast } from "../mgmt/shared/useMetrics"
import { PortalPage } from "./PortalPage"
import { portalMonthEyebrow } from "./shared/format"

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

  useEffect(() => {
    api<MyNumbers>("/api/v1/metrics/my-numbers")
      .then(setKpi)
      .catch(() => setKpi(null))
  }, [])

  const sales = kpi?.sales ?? 0
  const budget = kpi?.budget ?? 0
  const expected = kpi?.expected ?? 0
  const falta = kpi?.falta ?? Math.max(0, budget - sales)
  const day = kpi?.day ?? 1
  const daysInMonth = kpi?.days_in_month ?? 30
  const gap = forecast?.gap
  const left = gap?.days_left ?? daysInMonth - day
  const fcCom = forecast?.totals.committed ?? 0
  const fcProb = forecast?.totals.probable ?? 0
  const behind = expected > 0 && sales < expected
  const months = forecast?.by_month ?? []
  const rangeTitle =
    months.length > 1
      ? `Forecast de ${monthLong(months[0].month).toLowerCase()} a ${monthLong(months[months.length - 1].month).toLowerCase()}`
      : "Forecast de los próximos meses"

  return (
    <PortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-hero">
        <span className="nc-portal-eyebrow">
          {portalMonthEyebrow()} · quedan {left} días
        </span>
        <h1>Mi forecast</h1>
      </header>

      {error ? <p className="nc-note">{error}</p> : null}

      <div className="nc-portal-split">
        <section className="nc-portal-card nc-portal-stack nc-portal-stack-tight">
          <h2>Cumplimiento de la meta</h2>
          <ComplianceMeter label="Ventas · cumplimiento a la fecha" value={sales} target={budget} expected={expected} />
          <div className="nc-portal-kpi-row">
            <div>
              <span className="nc-portal-muted">Meta</span>
              <strong>{Format.money(budget)}</strong>
            </div>
            <div>
              <span className="nc-portal-muted">Llevas de la meta del mes</span>
              <strong>{budget > 0 ? Format.percent((sales / budget) * 100) : "—"}</strong>
              <span className="nc-portal-muted">{Format.money(sales)}</span>
            </div>
            <div>
              <span className="nc-portal-muted">Te falta</span>
              <strong>{Format.money(falta)}</strong>
            </div>
          </div>
          {expected > 0 ? (
            <Badge tone={behind ? "warning" : "success"} icon={behind ? "alert" : "check"}>
              {behind ? "Vas un poco atrás del ritmo" : "Vas al ritmo de la meta"}
            </Badge>
          ) : null}
          <p className="nc-portal-muted">
            Proyección al cierre: {Format.money(sales * (daysInMonth / Math.max(1, day)))}. A la fecha deberías llevar {Format.money(expected)}.
          </p>
        </section>

        <section className="nc-portal-card nc-portal-stack nc-portal-stack-tight">
          <h2>¿Te alcanza el forecast?</h2>
          <div className="nc-portal-forecast-bars">
            <ForecastBar label="Te falta" value={falta} max={falta} tone="var(--ink-secondary)" />
            <ForecastBar label="Comprometido" value={fcCom} max={falta} tone="var(--chart-1)" />
            <ForecastBar label="Probable" value={fcProb} max={falta} tone="var(--chart-3)" />
          </div>
          {forecast ? <ReachBadge falta={falta} forecast={forecast} /> : null}
          <p className="nc-portal-muted">Calculado con el potencial abierto de tus visitas.</p>
        </section>
      </div>

      <section className="nc-portal-card nc-portal-stack nc-portal-stack-tight">
        <h2>Cuántas citas necesitas para llegar</h2>
        <div className="nc-portal-kpi-row">
          <div>
            <span className="nc-portal-muted">Ticket promedio</span>
            <strong>{gap ? Format.money(gap.ticket_avg) : "—"}</strong>
          </div>
          <div>
            <span className="nc-portal-muted">Tasa de cierre de citas</span>
            <strong>{gap ? Format.percent(gap.close_rate * 100) : "—"}</strong>
          </div>
          <div>
            <span className="nc-portal-muted">Negocios que te faltan</span>
            <strong>{gap && gap.ticket_avg > 0 ? Math.ceil(gap.falta / gap.ticket_avg) : "—"}</strong>
          </div>
          <div className="nc-portal-highlight">
            <span className="nc-portal-muted">Citas que debes agendar</span>
            <strong>{gap ? gap.visits_needed : "—"}</strong>
          </div>
        </div>
        <Link className="nc-btn nc-btn-secondary" to="/portal/programacion">
          Armar programación
        </Link>
      </section>

      <h2>{rangeTitle}</h2>
      <div className="nc-portal-metrics">
        <StatTile label="Optimista" value={forecast ? Format.money(forecast.totals.optimistic) : "—"} />
        <StatTile label="Probable" value={forecast ? Format.money(forecast.totals.probable) : "—"} />
        <StatTile label="Comprometido" value={forecast ? Format.money(forecast.totals.committed) : "—"} />
      </div>

      <div className="nc-table-wrap">
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
                  Aún no tienes potencial abierto por producto.
                </td>
              </tr>
            ) : (
              forecast!.by_product.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td style={{ textAlign: "right" }}>{Format.money(row.optimistic)}</td>
                  <td style={{ textAlign: "right" }}>{Format.money(row.probable)}</td>
                  <td style={{ textAlign: "right" }}>{Format.money(row.committed)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PortalPage>
  )
}

function ReachBadge({ falta, forecast }: { falta: number; forecast: Forecast }) {
  if (falta <= 0) return <Badge tone="success" icon="check">Ya llegaste a la meta</Badge>
  if (forecast.totals.committed >= falta) return <Badge tone="success" icon="check">Te alcanza con lo comprometido</Badge>
  if (forecast.totals.probable >= falta) return <Badge tone="warning" icon="alert">Te alcanza si cierras lo probable</Badge>
  return <Badge tone="danger" icon="alert">Aún no te alcanza el forecast</Badge>
}

function ForecastBar({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="nc-portal-forecast-row">
      <span className="nc-portal-forecast-label">{label}</span>
      <div className="nc-portal-bar-track">
        <div className="nc-portal-bar-fill" style={{ width: `${width}%`, background: tone }} />
      </div>
      <span className="nc-portal-forecast-value">{Format.money(value)}</span>
    </div>
  )
}
