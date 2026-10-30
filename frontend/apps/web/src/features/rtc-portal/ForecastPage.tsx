import type { SessionUser } from "@nc/domain"
import { Badge, Button, ComplianceMeter, Format, StatTile } from "@nc/ui"
import { Link } from "react-router-dom"
import { PortalPage } from "./PortalPage"
import { portalMonthEyebrow } from "./shared/format"

const PRODUCTS = [
  { name: "Trichobiol WP", opt: "$ 18,2 M", prob: "$ 14,0 M", com: "$ 11,5 M" },
  { name: "Beauvebiol", opt: "$ 9,8 M", prob: "$ 7,2 M", com: "$ 6,1 M" },
  { name: "Metabiol", opt: "$ 6,4 M", prob: "$ 4,8 M", com: "$ 3,9 M" },
]

export function ForecastPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const now = new Date()
  const day = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const left = daysInMonth - day
  const sales = 31_200_000
  const budget = 34_000_000
  const expected = budget * (day / daysInMonth)
  const falta = budget - sales
  const fcCom = 11_500_000
  const fcProb = 14_000_000

  return (
    <PortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-hero">
        <span className="nc-portal-eyebrow">
          {portalMonthEyebrow()} · quedan {left} días
        </span>
        <h1>Mi forecast</h1>
      </header>

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
              <strong>{Format.percent((sales / budget) * 100)}</strong>
              <span className="nc-portal-muted">{Format.money(sales)}</span>
            </div>
            <div>
              <span className="nc-portal-muted">Te falta</span>
              <strong>{Format.money(falta)}</strong>
            </div>
          </div>
          <Badge tone="warning" icon="alert">
            Vas un poco atrás del ritmo
          </Badge>
          <p className="nc-portal-muted">
            Proyección al cierre: {Format.money(sales * (daysInMonth / day))}. A la fecha deberías llevar {Format.money(expected)}.
          </p>
        </section>

        <section className="nc-portal-card nc-portal-stack nc-portal-stack-tight">
          <h2>¿Te alcanza el forecast?</h2>
          <div className="nc-portal-forecast-bars">
            <ForecastBar label="Te falta" value={falta} max={falta} tone="var(--ink-secondary)" />
            <ForecastBar label="Comprometido" value={fcCom} max={falta} tone="var(--chart-1)" />
            <ForecastBar label="Probable" value={fcProb} max={falta} tone="var(--chart-3)" />
          </div>
          <Badge tone="warning" icon="alert">
            Te alcanza si cierras lo probable
          </Badge>
          <p className="nc-portal-muted">Oportunidades de horizonte corto que cierran antes de fin de mes.</p>
        </section>
      </div>

      <section className="nc-portal-card nc-portal-stack nc-portal-stack-tight">
        <h2>Cuántas citas necesitas para llegar</h2>
        <div className="nc-portal-kpi-row">
          <div>
            <span className="nc-portal-muted">Ticket promedio</span>
            <strong>{Format.money(2_800_000)}</strong>
          </div>
          <div>
            <span className="nc-portal-muted">Tasa de cierre de citas</span>
            <strong>38 %</strong>
          </div>
          <div>
            <span className="nc-portal-muted">Negocios que te faltan</span>
            <strong>1</strong>
          </div>
          <div className="nc-portal-highlight">
            <span className="nc-portal-muted">Citas que debes agendar</span>
            <strong>{Math.ceil(falta / 2_800_000 / 0.38)}</strong>
          </div>
        </div>
        <Link className="nc-btn nc-btn-secondary" to="/portal/programacion">
          Armar programación
        </Link>
      </section>

      <h2>Forecast de noviembre a febrero</h2>
      <div className="nc-portal-metrics">
        <StatTile label="Optimista" value="$ 38,4 M" />
        <StatTile label="Probable" value="$ 33,1 M" />
        <StatTile label="Comprometido" value="$ 29,6 M" />
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
            {PRODUCTS.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td style={{ textAlign: "right" }}>{row.opt}</td>
                <td style={{ textAlign: "right" }}>{row.prob}</td>
                <td style={{ textAlign: "right" }}>{row.com}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PortalPage>
  )
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
