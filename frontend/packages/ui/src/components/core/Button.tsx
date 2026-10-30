import type { ButtonHTMLAttributes } from "react"
import { Icon, type IconName } from "./Icon"

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "quiet" | "danger"
  size?: "md" | "lg"
  block?: boolean
  icon?: IconName
}

export function Button({
  variant = "primary",
  size = "md",
  block,
  icon,
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  const cls = [
    "nc-btn",
    `nc-btn-${variant}`,
    size === "lg" ? "nc-btn-lg" : "",
    block ? "nc-btn-block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ")
  return (
    <button type={type} className={cls} {...rest}>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  )
}
