import { Format } from "../../format"
import { Icon } from "../core/Icon"

export type ComplianceMeterProps = {
  label: string
  value: number
  target: number
  expected?: number
  unit?: "money" | "number"
  thresholds?: { green: number; yellow: number }
  hint?: string
  className?: string
}

export function ComplianceMeter({
  label,
  value,
  target,
  expected,
  unit = "money",
  thresholds = { green: 90, yellow: 70 },
  hint,
  className = "",
}: ComplianceMeterProps) {
  const exp = expected ?? target
  const pct = exp > 0 ? (value / exp) * 100 : 0
  const tone = pct >= thresholds.green ? "green" : pct >= thresholds.yellow ? "yellow" : "red"
  const word = { green: "Al día", yellow: "Atento", red: "Atrasado" }[tone]
  const icon = { green: "check" as const, yellow: "alert" as const, red: "x" as const }[tone]
  const fmt = unit === "money" ? Format.money : Format.number
  const fill = Math.min(100, target > 0 ? (value / target) * 100 : 0)
  const mark = Math.min(100, target > 0 ? (exp / target) * 100 : 0)
  return (
    <div className={["nc-meter", className].filter(Boolean).join(" ")} role="group" aria-label={`${label}: ${Math.round(pct)} %, ${word}`}>
      <div className="nc-meter-head">
        <span className="nc-meter-label">{label}</span>
        <span className={`nc-meter-pct nc-tone-${tone}`}>
          <Icon name={icon} small />
          {Format.percent(pct)}
        </span>
      </div>
      <div className="nc-meter-track">
        <div className={`nc-meter-fill nc-fill-${tone}`} style={{ width: `${fill}%` }} />
        <div className="nc-meter-mark" style={{ left: `calc(${mark}% - 1px)` }} title="Meta a la fecha" />
      </div>
      <div className="nc-meter-foot">
        <span>
          <b style={{ color: "var(--ink)" }}>{word}</b> · {fmt(value)} de {fmt(target)}
        </span>
        {hint ? <span>{hint}</span> : null}
      </div>
    </div>
  )
}
