import { Icon } from "../core/Icon"

export type StatTileProps = {
  label: string
  value: string
  delta?: string
  deltaDirection?: "up" | "down" | "flat"
  deltaGood?: boolean
  caption?: string
  className?: string
}

export function StatTile({
  label,
  value,
  delta,
  deltaDirection = "flat",
  deltaGood = true,
  caption,
  className = "",
}: StatTileProps) {
  const good = deltaDirection === "flat" ? null : deltaDirection === "up" === deltaGood
  const cls = good === null ? "flat" : good ? "up" : "down"
  const icon = { up: "arrowUp" as const, down: "arrowDown" as const, flat: "minus" as const }[deltaDirection]
  return (
    <div className={["nc-stat", className].filter(Boolean).join(" ")}>
      <span className="nc-stat-label">{label}</span>
      <span className="nc-stat-value">{value}</span>
      {delta ? (
        <span className={`nc-stat-delta nc-stat-delta-${cls}`}>
          <Icon name={icon} small />
          {delta}
        </span>
      ) : null}
      {caption ? <span className="nc-stat-caption">{caption}</span> : null}
    </div>
  )
}
