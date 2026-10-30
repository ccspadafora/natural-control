/** Stub SVG — ventas acumuladas vs meta (prototipo Inicio A·Mes). */
export function AccumulatedSalesChart() {
  const ideal = "48,200 120,165 200,130 280,95 360,60 440,48 520,48 600,48"
  const actual = "48,200 120,178 200,152 280,118 360,88 440,72 520,68 580,65"
  const proj = "580,65 620,58"
  return (
    <div className="nc-mgmt-chart-card">
      <div className="nc-portal-card-head">
        <h2>Ventas acumuladas frente a la meta</h2>
        <span className="nc-portal-muted">Proyección al cierre: $ 1,42 MM (ilustrativo)</span>
      </div>
      <svg viewBox="0 0 640 230" className="nc-mgmt-chart-svg" role="img" aria-label="Ventas acumuladas del mes">
        <line x1="48" x2="620" y1="48" y2="48" stroke="var(--hairline)" />
        <line x1="48" x2="620" y1="124" y2="124" stroke="var(--hairline)" />
        <line x1="48" x2="620" y1="200" y2="200" stroke="var(--border-control)" />
        <text x="44" y="48" textAnchor="end" dominantBaseline="middle" className="nc-mgmt-chart-axis">
          100 %
        </text>
        <text x="44" y="124" textAnchor="end" dominantBaseline="middle" className="nc-mgmt-chart-axis">
          50 %
        </text>
        <text x="48" y="220" className="nc-mgmt-chart-axis">
          1 oct.
        </text>
        <text x="620" y="220" textAnchor="end" className="nc-mgmt-chart-axis">
          31 oct.
        </text>
        <polyline points={ideal} fill="none" stroke="var(--ink-tertiary)" strokeWidth="2" strokeDasharray="2 5" />
        <polyline points={actual} fill="none" stroke="var(--chart-1)" strokeWidth="3" strokeLinejoin="round" />
        <polyline points={proj} fill="none" stroke="var(--chart-1)" strokeWidth="2" strokeDasharray="6 5" />
        <circle cx="580" cy="65" r="5" fill="var(--chart-1)" />
        <circle cx="620" cy="58" r="5" fill="var(--surface)" stroke="var(--chart-1)" strokeWidth="2" />
      </svg>
      <div className="nc-mgmt-chart-legend">
        <span>
          <i className="nc-mgmt-legend-line solid" /> Ventas reales
        </span>
        <span>
          <i className="nc-mgmt-legend-line dash" /> Proyección ($ 1,42 MM)
        </span>
        <span>
          <i className="nc-mgmt-legend-line ideal" /> Línea ideal de la meta
        </span>
      </div>
    </div>
  )
}
