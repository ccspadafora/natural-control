import type { ReactNode } from "react"
import { Icon, type IconName } from "./Icon"

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger" | "accent"

export type BadgeProps = {
  tone?: BadgeTone
  icon?: IconName
  children: ReactNode
  className?: string
}

export function Badge({ tone = "neutral", icon, children, className = "" }: BadgeProps) {
  return (
    <span className={["nc-badge", `nc-badge-${tone}`, className].filter(Boolean).join(" ")}>
      {icon ? <Icon name={icon} small /> : <span className="nc-badge-dot" />}
      {children}
    </span>
  )
}
