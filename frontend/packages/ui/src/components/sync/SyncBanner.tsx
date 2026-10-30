import { Button } from "../core/Button"
import { Icon } from "../core/Icon"

export type SyncBannerState = "offline" | "syncing" | "error"

export type SyncBannerProps = {
  state: SyncBannerState
  pending: number
  onRetry?: () => void
  className?: string
}

export function SyncBanner({ state, pending, onRetry, className = "" }: SyncBannerProps) {
  const n = `${pending} ${pending === 1 ? "registro" : "registros"}`
  const text = {
    offline: `Sin conexión · ${n} ${pending === 1 ? "pendiente" : "pendientes"}`,
    syncing: `Sincronizando ${n}…`,
    error: (pending === 1 ? "No se pudo enviar " : "No se pudieron enviar ") + n,
  }[state]
  const icon = { offline: "cloudOff" as const, syncing: "refresh" as const, error: "alert" as const }[state]
  return (
    <div className={["nc-sync", `nc-sync-${state}`, className].filter(Boolean).join(" ")} role="status" aria-live="polite">
      <Icon name={icon} className={state === "syncing" ? "nc-spin" : ""} />
      <span className="nc-sync-text">{text}</span>
      {state === "error" ? (
        <Button variant="outline" onClick={onRetry}>
          Ver pendientes
        </Button>
      ) : null}
    </div>
  )
}
