import { moneyShort } from "../shared/metrics"

type Point = { day: number; salesPct: number; idealPct: number }

type Props = {
  projection?: number | null
  sales?: number
  budget?: number
  day?: number
  daysInMonth?: number
}

/** Curva real a partir de ventas/meta del mes (acumulado lineal hasta el día actual). */
export function AccumulatedSalesChart({ projection, sales = 0, budget = 0, day = 1, daysInMonth = 30 }: Props) {
  const projectionLabel = projection != null ? moneyShort(projection) : "—"
  const points: Point[] = []
  const salesPct = budget > 0 ? Math.min(120, (100 * sales) / budget) : 0
  for (let d = 1; d <= daysInMonth; d++) {
    const idealPct = (100 * d) / daysInMonth
    const actualPct = d <= day ? (salesPct * d) / Math.max(day, 1) : salesPct
    points.push({ day: d, salesPct: d <= day ? actualPct : NaN, idealPct })
  }
  const W = 640
  const H = 230
  const padL = 48
  const padR = 20
  const padT = 48
  const padB = 30
  const innerW = W - padL - padR
  const innerH = H - padT - padB - 20

  function xy(d: number, pct: number) {
    const x = padL + ((d - 1) / Math.max(daysInMonth - 1, 1)) * innerW
    const y = padT + innerH * (1 - Math.min(pct, 120) / 120)
    return `${x},${y}`
  }

  const ideal = points.map((p) => xy(p.day, p.idealPct)).join(" ")
  const actualPts = points.filter((p) => !Number.isNaN(p.salesPct))
  const actual = actualPts.map((p) => xy(p.day, p.salesPct)).join(" ")
  const last = actualPts[actualPts.length - 1]
  const projEnd = projection != null && budget > 0 ? Math.min(120, (100 * projection) / budget) : last?.salesPct ?? 0
  const projLine = last ? `${xy(last.day, last.salesPct)} ${xy(daysInMonth, projEnd)}` : ""

  return (
    <div className="nc-mgmt-chart-card">
      <div className="nc-portal-card-head">
        <h2>Ventas acumuladas frente a la meta</h2>
        <span className="nc-portal-muted">Proyección al cierre: {projectionLabel}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="nc-mgmt-chart-svg" role="img" aria-label="Ventas acumuladas del mes">
        <line x1={padL} x2={W - padR} y1={padT} y2={padT} stroke="var(--hairline)" />
        <line x1={padL} x2={W - padR} y1={padT + innerH / 2} y2={padT + innerH / 2} stroke="var(--hairline)" />
        <line x1={padL} x2={W - padR} y1={padT + innerH} y2={padT + innerH} stroke="var(--border-control)" />
        <text x={padL - 4} y={padT} textAnchor="end" dominantBaseline="middle" className="nc-mgmt-chart-axis">
          100 %
        </text>
        <text x={padL - 4} y={padT + innerH / 2} textAnchor="end" dominantBaseline="middle" className="nc-mgmt-chart-axis">
          50 %
        </text>
        <text x={padL} y={H - 8} className="nc-mgmt-chart-axis">
          Día 1
        </text>
        <text x={W - padR} y={H - 8} textAnchor="end" className="nc-mgmt-chart-axis">
          Día {daysInMonth}
        </text>
        <polyline points={ideal} fill="none" stroke="var(--ink-tertiary)" strokeWidth="2" strokeDasharray="2 5" />
        {actual ? <polyline points={actual} fill="none" stroke="var(--chart-1)" strokeWidth="3" strokeLinejoin="round" /> : null}
        {projLine ? <polyline points={projLine} fill="none" stroke="var(--chart-1)" strokeWidth="2" strokeDasharray="6 5" /> : null}
      </svg>
      <div className="nc-mgmt-chart-legend">
        <span>
          <i className="nc-mgmt-legend-line solid" /> Ventas ({moneyShort(sales)})
        </span>
        <span>
          <i className="nc-mgmt-legend-line dash" /> Proyección ({projectionLabel})
        </span>
        <span>
          <i className="nc-mgmt-legend-line ideal" /> Línea ideal de la meta
        </span>
      </div>
    </div>
  )
}
