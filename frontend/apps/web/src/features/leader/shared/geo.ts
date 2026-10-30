import type { BadgeTone } from "@nc/ui"
import type { GpsStatus } from "@nc/ui"

export type GpsCheckRow = {
  id: string
  visit_id: string
  status: string
  distance_m: number | null
  tolerance_m: number | null
  accuracy_m: number | null
  review_status: string
  review_note: string
  rtc_justification: string
  flags: string[]
  client_name: string
  rtc_name: string
  municipality: string
  site_name: string
  zone_name: string
  received_at: string
  position: { latitude: number; longitude: number } | null
  reference: { latitude: number; longitude: number } | null
}

export const REVIEW_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  INFORMACION_SOLICITADA: "Información solicitada",
  JUSTIFICADA: "Justificada",
  RECHAZADA: "Rechazada",
  NO_REQUERIDA: "No requerida",
}

export const GPS_FLAG_LABEL: Record<string, string> = {
  CLOCK_SKEW: "Reloj desviado",
  STALE_FIX: "Ubicación vieja",
  ACCURACY_TOO_PERFECT: "Precisión demasiado alta",
  SAME_POINT_REPEATED: "Mismo punto repetido",
  IMPOSSIBLE_SPEED: "Velocidad imposible",
}

export function gpsStatus(value: string): GpsStatus {
  if (value === "VERIFICADA" || value === "FUERA_DE_RANGO" || value === "PRECISION_BAJA" || value === "SIN_UBICACION" || value === "SIN_REFERENCIA") {
    return value
  }
  return "SIN_UBICACION"
}

export function reviewBadgeTone(reviewStatus: string): BadgeTone {
  if (reviewStatus === "JUSTIFICADA") return "success"
  if (reviewStatus === "RECHAZADA") return "danger"
  if (reviewStatus === "INFORMACION_SOLICITADA") return "warning"
  if (reviewStatus === "PENDIENTE") return "accent"
  return "neutral"
}

export function receivedLabel(iso: string) {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(iso))
}

export function accuracyLabel(m: number | null) {
  if (m == null) return "sin dato"
  return `${Math.round(m)} m`
}

export function canReview(reviewStatus: string) {
  return reviewStatus === "PENDIENTE" || reviewStatus === "INFORMACION_SOLICITADA"
}

export function osmDirections(
  reference: { latitude: number; longitude: number } | null,
  position: { latitude: number; longitude: number } | null,
) {
  if (!reference || !position) return ""
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${reference.latitude}%2C${reference.longitude}%3B${position.latitude}%2C${position.longitude}`
}
