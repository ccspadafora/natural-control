import type { ReactNode } from "react"
import { Icon, type IconName } from "../core/Icon"

export type ToastTone = "neutral" | "success" | "warning" | "danger"

export type ToastProps = {
  message: ReactNode
  tone?: ToastTone
  icon?: IconName
  className?: string
}

const toneClass: Record<ToastTone, string> = {
  neutral: "nc-note",
  success: "nc-ok",
  warning: "nc-note",
  danger: "nc-field-help",
}

export function Toast({ message, tone = "neutral", icon, className = "" }: ToastProps) {
  return (
    <div className={[toneClass[tone], className].filter(Boolean).join(" ")} role="status">
      {icon ? <Icon name={icon} small /> : null}
      {message}
    </div>
  )
}
