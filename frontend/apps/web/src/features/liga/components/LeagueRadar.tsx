import { ATTR } from "../shared/leagueData"
import { RADAR_AXES, RADAR_RINGS, axisLine, radarPoints } from "../shared/radar"

export function LeagueRadar({
  valuesA,
  valuesB,
  labelA,
  labelB,
}: {
  valuesA: number[]
  valuesB: number[]
  labelA: string
  labelB: string
}) {
  const radarA = radarPoints(valuesA, 150, 140, 110)
  const radarB = radarPoints(valuesB, 150, 140, 110)

  return (
    <section className="nc-portal-card nc-portal-radar nc-liga-radar">
      <svg viewBox="0 0 300 290" role="img" aria-label="Radar de atributos">
        {RADAR_RINGS.map((pts) => (
          <polygon key={pts} points={pts} fill="none" stroke="var(--hairline)" />
        ))}
        {ATTR.map((_, i) => {
          const line = axisLine(i, 150, 140, 110)
          const axis = RADAR_AXES[i]
          return (
            <g key={axis.k}>
              <line x1={150} y1={140} x2={line.x2} y2={line.y2} stroke="var(--hairline)" />
              <text x={axis.lx} y={axis.ly} textAnchor="middle" style={{ font: "700 12px var(--font-sans)", fill: "var(--ink-secondary)" }}>
                {axis.k}
              </text>
            </g>
          )
        })}
        <polygon points={radarB} fill="none" stroke="var(--chart-5)" strokeWidth={2} strokeDasharray="5 4" />
        <polygon points={radarA} fill="var(--primary-tint)" fillOpacity={0.6} stroke="var(--chart-1)" strokeWidth={2.5} />
      </svg>
      <div className="nc-liga-radar-legend">
        <span>
          <span className="nc-liga-legend-line solid" /> {labelA}
        </span>
        <span>
          <span className="nc-liga-legend-line dashed" /> {labelB}
        </span>
      </div>
    </section>
  )
}
