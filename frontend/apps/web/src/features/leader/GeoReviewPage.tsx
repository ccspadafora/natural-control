import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge, Button, GpsCheck, PageHead, TextField } from "@nc/ui"
import { useToast } from "../shared/useToast"
import { GeoMap } from "./GeoMap"
import { LeaderPortalPage } from "./LeaderPortalPage"
import { LocationChangesPanel } from "./LocationChangesPanel"
import {
  accuracyLabel,
  canReview,
  GpsCheckRow,
  GPS_FLAG_LABEL,
  gpsStatus,
  osmDirections,
  receivedLabel,
  reviewBadgeTone,
  REVIEW_LABEL,
} from "./shared/geo"

type ReviewAction = "JUSTIFICADA" | "RECHAZADA" | "INFORMACION_SOLICITADA"

const CONFIRM: Record<ReviewAction, string> = {
  JUSTIFICADA:
    "¿Marcar esta discrepancia como justificada?\n\nLa justificación del comercial queda aceptada y el caso se cierra.",
  RECHAZADA:
    "¿Rechazar esta discrepancia?\n\nEl comercial verá que la justificación no fue aceptada. Debe quedar una nota clara.",
  INFORMACION_SOLICITADA:
    "¿Pedir más información al comercial?\n\nEl caso queda abierto hasta que complete o aclare la justificación.",
}

const DEFAULT_NOTE: Record<ReviewAction, string> = {
  JUSTIFICADA: "Justificación aceptada.",
  RECHAZADA: "La justificación no es suficiente. Debes registrar la visita en la sede o explicar mejor el motivo.",
  INFORMACION_SOLICITADA: "Necesitamos más detalle: ¿por qué te registraste lejos de la sede?",
}

const SUCCESS: Record<ReviewAction, string> = {
  JUSTIFICADA: "Discrepancia marcada como justificada.",
  RECHAZADA: "Discrepancia rechazada. El comercial verá tu nota.",
  INFORMACION_SOLICITADA: "Se pidió más información al comercial.",
}

export function GeoReviewPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const { checkId } = useParams()
  const navigate = useNavigate()
  const { show, node: toast } = useToast()
  const [row, setRow] = useState<GpsCheckRow | null>(null)
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [missing, setMissing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!checkId) {
      setMissing(true)
      setLoading(false)
      return
    }
    setLoading(true)
    setMissing(false)
    setError("")
    api<GpsCheckRow>(`/api/v1/gps-checks/${checkId}`)
      .then((data) => {
        setRow(data)
        if (data.review_note?.trim()) setNote(data.review_note.trim())
      })
      .catch((err) => {
        setMissing(true)
        setError(err instanceof Error ? err.message : "No se pudo cargar")
      })
      .finally(() => setLoading(false))
  }, [checkId])

  function ensureNote(action: ReviewAction): string | null {
    let finalNote = note.trim()
    if (finalNote.length >= 3) return finalNote
    const typed = window.prompt("Escribe una nota para el comercial (mínimo 3 caracteres):", DEFAULT_NOTE[action])
    if (typed == null) return null
    finalNote = typed.trim()
    if (finalNote.length < 3) {
      setError("La nota debe tener al menos 3 caracteres.")
      show("Escribe una nota más larga para el comercial.", "danger")
      document.getElementById("geo-review-note")?.focus()
      return null
    }
    setNote(finalNote)
    return finalNote
  }

  async function review(action: ReviewAction) {
    if (!row || busy) return
    if (!canReview(row.review_status)) {
      show("Esta discrepancia ya fue revisada.", "danger")
      return
    }
    if (!window.confirm(CONFIRM[action])) return

    const finalNote = ensureNote(action)
    if (!finalNote) return

    setBusy(true)
    setError("")
    try {
      const updated = await api<GpsCheckRow>(`/api/v1/gps-checks/${row.id}/review`, {
        method: "POST",
        body: JSON.stringify({ review_status: action, note: finalNote }),
      })
      setRow({ ...row, ...updated, review_status: action, review_note: finalNote })
      show(SUCCESS[action], "success")
      window.setTimeout(() => navigate("/consola/geo"), 900)
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo revisar"
      setError(message)
      show(message, "danger")
    } finally {
      setBusy(false)
    }
  }

  const map = row ? osmDirections(row.reference, row.position) : ""
  const reviewable = row ? canReview(row.review_status) : false

  return (
    <LeaderPortalPage user={user} onLogout={onLogout}>
      <PageHead
        title={row?.client_name || "Discrepancia"}
        description={
          row
            ? `${row.site_name || row.municipality} · ${row.rtc_name}${row.zone_name ? ` · ${row.zone_name}` : ""} · ${receivedLabel(row.received_at)} · precisión ${accuracyLabel(row.accuracy_m)}`
            : undefined
        }
        backHref="/consola/geo"
        backLabel="Discrepancias de GPS"
      />
      {loading ? <p className="nc-portal-muted">Cargando discrepancia…</p> : null}
      {error && !row ? <p className="nc-note">{error}</p> : null}
      {missing && !loading ? <p className="nc-note">No encontramos esa discrepancia.</p> : null}
      {row ? (
        <div className="nc-portal-card nc-geo-detail">
          <div className="nc-geo-detail-head">
            <div>
              <h2>
                {row.client_name} · {row.site_name || row.municipality}
              </h2>
              <p className="nc-portal-muted">
                {row.rtc_name}
                {row.zone_name ? ` · ${row.zone_name}` : ""} · {receivedLabel(row.received_at)} · precisión{" "}
                {accuracyLabel(row.accuracy_m)}
              </p>
            </div>
            <GpsCheck
              status={gpsStatus(row.status)}
              distanceM={row.distance_m ?? undefined}
              toleranceM={row.tolerance_m ?? undefined}
            />
          </div>

          <GeoMap
            reference={row.reference}
            position={row.position}
            toleranceM={row.tolerance_m}
            distanceM={row.distance_m}
          />

          {map ? (
            <a className="nc-text-link" href={map} target="_blank" rel="noreferrer">
              Ver punto real y sede en OpenStreetMap
            </a>
          ) : null}

          <div className="nc-geo-just">
            <span className="nc-portal-eyebrow">Justificación del comercial</span>
            {row.rtc_justification?.trim() ? (
              <p>«{row.rtc_justification.trim()}»</p>
            ) : (
              <p className="nc-portal-muted">Sin justificación todavía.</p>
            )}
          </div>

          {row.flags.length ? (
            <div className="nc-geo-flags">
              {row.flags.map((flag) => (
                <Badge key={flag} tone="warning" icon="alert">
                  {GPS_FLAG_LABEL[flag] || flag}
                </Badge>
              ))}
            </div>
          ) : null}

          {row.review_note && !reviewable ? (
            <p className="nc-case-note">
              <Badge tone={reviewBadgeTone(row.review_status)}>{REVIEW_LABEL[row.review_status] || row.review_status}</Badge>{" "}
              {row.review_note}
            </p>
          ) : null}

          {reviewable ? (
            <>
              <TextField
                id="geo-review-note"
                label="Nota para el comercial"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                helper="Obligatoria. Justificar, rechazar o pedir info deja rastro para el comercial."
                error={error && note.trim().length < 3 ? error : undefined}
              />
              {error ? <p className="nc-note">{error}</p> : null}
              <p className="nc-portal-muted nc-geo-review-help">
                <strong>Justificada</strong> acepta el caso · <strong>Rechazar</strong> no acepta la justificación ·{" "}
                <strong>Pedir más información</strong> deja el caso abierto.
              </p>
              <div className="nc-panel-actions">
                <Button type="button" disabled={busy} onClick={() => void review("JUSTIFICADA")}>
                  Marcar justificada
                </Button>
                <Button type="button" variant="secondary" disabled={busy} onClick={() => void review("RECHAZADA")}>
                  Rechazar
                </Button>
                <Button type="button" variant="quiet" disabled={busy} onClick={() => void review("INFORMACION_SOLICITADA")}>
                  Pedir más información
                </Button>
              </div>
            </>
          ) : (
            <p className="nc-portal-muted">
              Estado: {REVIEW_LABEL[row.review_status] || row.review_status}. Esta discrepancia ya no admite otra
              revisión desde aquí.
            </p>
          )}
        </div>
      ) : null}

      <LocationChangesPanel compact />
      {toast}
    </LeaderPortalPage>
  )
}
