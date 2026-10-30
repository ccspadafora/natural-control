import { Format } from "../../format"
import { Icon } from "../core/Icon"

export type GpsStatus =
  | "VERIFICADA"
  | "FUERA_DE_RANGO"
  | "PRECISION_BAJA"
  | "SIN_UBICACION"
  | "SIN_REFERENCIA"

const MAP: Record<GpsStatus, { cls: string; icon: "check" | "x" | "alert" | "pinOff"; word: string }> = {
  VERIFICADA: { cls: "ok", icon: "check", word: "Verificada" },
  FUERA_DE_RANGO: { cls: "bad", icon: "x", word: "Discrepancia" },
  PRECISION_BAJA: { cls: "warn", icon: "alert", word: "Precisión baja" },
  SIN_UBICACION: { cls: "none", icon: "pinOff", word: "Sin ubicación" },
  SIN_REFERENCIA: { cls: "none", icon: "pinOff", word: "Sede sin ubicación" },
}

export type GpsCheckProps = {
  status: GpsStatus
  distanceM?: number
  toleranceM?: number
  preliminary?: boolean
  className?: string
}

export function GpsCheck({ status, distanceM, toleranceM, preliminary, className = "" }: GpsCheckProps) {
  const s = MAP[status] ?? MAP.SIN_UBICACION
  const showDist = distanceM != null && (status === "VERIFICADA" || status === "FUERA_DE_RANGO")
  const title = toleranceM != null ? `Tolerancia: ${Math.round(toleranceM)} m` : undefined
  return (
    <span
      className={["nc-gps", `nc-gps-${s.cls}`, preliminary ? "nc-gps-pre" : "", className].filter(Boolean).join(" ")}
      title={title}
    >
      <span className="nc-gps-dot">
        <Icon name={s.icon} small />
      </span>
      <span>
        {preliminary ? "Preliminar · " : ""}
        {s.word}
      </span>
      {showDist ? <span className="nc-gps-dist">· {Format.distance(distanceM)}</span> : null}
    </span>
  )
}
