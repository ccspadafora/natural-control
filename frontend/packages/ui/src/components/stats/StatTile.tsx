import type { KeyboardEvent } from "react"
import { Icon } from "../core/Icon"

export type StatTileProps = {
  label: string
  value: string
  delta?: string
  deltaDirection?: "up" | "down" | "flat"
  deltaGood?: boolean
  caption?: string
  className?: string
  onClick?: () => void
}

export function StatTile({
  label,
  value,
  delta,
  deltaDirection = "flat",
  deltaGood = true,
  caption,
  className = "",
  onClick,
}: StatTileProps) {
  const good = deltaDirection === "flat" ? null : deltaDirection === "up" === deltaGood
  const cls = good === null ? "flat" : good ? "up" : "down"
  const icon = { up: "arrowUp" as const, down: "arrowDown" as const, flat: "minus" as const }[deltaDirection]
  const clickable = Boolean(onClick)
  const onKeyDown = clickable
    ? (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.()
        }
      }
    : undefined
  return (
    <div
      className={["nc-stat", clickable ? "nc-stat-clickable" : "", className].filter(Boolean).join(" ")}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
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
