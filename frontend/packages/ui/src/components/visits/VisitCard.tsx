import type { GpsCheckProps } from "../gps/GpsCheck"
import { GpsCheck } from "../gps/GpsCheck"
import { Badge } from "../core/Badge"
import { Icon } from "../core/Icon"

export type VisitStatus =
  | "PROGRAMADA"
  | "EN_CURSO"
  | "REALIZADA"
  | "NO_REALIZADA"
  | "CANCELADA"
  | "ATRASADA"

const ST: Record<VisitStatus, ["neutral" | "primary" | "accent" | "success" | "warning", string]> = {
  PROGRAMADA: ["primary", "Programada"],
  EN_CURSO: ["accent", "En curso"],
  REALIZADA: ["success", "Realizada"],
  NO_REALIZADA: ["neutral", "No realizada"],
  CANCELADA: ["neutral", "Cancelada"],
  ATRASADA: ["warning", "Atrasada"],
}

export type VisitCardProps = {
  client: string
  site?: string
  municipality?: string
  time?: string
  duration?: string
  status?: VisitStatus
  reason?: string
  gps?: Pick<GpsCheckProps, "status" | "distanceM" | "toleranceM" | "preliminary">
  pending?: boolean
  onClick?: () => void
  className?: string
}

export function VisitCard({
  client,
  site,
  municipality,
  time = "—",
  duration,
  status = "PROGRAMADA",
  reason,
  gps,
  pending,
  onClick,
  className = "",
}: VisitCardProps) {
  const [tone, word] = ST[status] ?? ST.PROGRAMADA
  const meta = [site, municipality].filter(Boolean).join(" · ")
  return (
    <button type="button" className={["nc-visit", className].filter(Boolean).join(" ")} onClick={onClick}>
      <div className="nc-visit-time">
        {time}
        {duration ? <small>{duration}</small> : null}
      </div>
      <div className="nc-visit-body">
        <p className="nc-visit-title">{client}</p>
        {meta ? (
          <div className="nc-visit-meta">
            <Icon name="pin" small />
            {meta}
          </div>
        ) : null}
        <div className="nc-visit-foot">
          <Badge tone={tone}>{word}</Badge>
          {reason ? <Badge>{reason}</Badge> : null}
          {gps ? <GpsCheck {...gps} /> : null}
          {pending ? (
            <span className="nc-visit-pending">
              <Icon name="cloudOff" small />
              Sin sincronizar
            </span>
          ) : null}
        </div>
      </div>
    </button>
  )
}
