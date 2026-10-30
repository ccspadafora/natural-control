import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge, Button, GpsCheck, PageHead, TextField } from "@nc/ui"
import { LeaderPortalPage } from "./LeaderPortalPage"
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

export function GeoReviewPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const { checkId } = useParams()
  const navigate = useNavigate()
  const [row, setRow] = useState<GpsCheckRow | null>(null)
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [missing, setMissing] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ results: GpsCheckRow[] }>("/api/v1/gps-checks")
      .then((data) => {
        const found = data.results.find((item) => item.id === checkId)
        if (!found) setMissing(true)
        else setRow(found)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar"))
  }, [checkId])

  async function review(reviewStatus: string) {
    if (!row) return
    if (note.trim().length < 3) {
      setError("Escribe una nota para la revisión.")
      return
    }
    setBusy(true)
    setError("")
    try {
      await api(`/api/v1/gps-checks/${row.id}/review`, {
        method: "POST",
        body: JSON.stringify({ review_status: reviewStatus, note: note.trim() }),
      })
      navigate("/consola/geo")
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo revisar")
    } finally {
      setBusy(false)
    }
  }

  const map = row ? osmDirections(row.reference, row.position) : ""

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
      {error ? <p className="nc-note">{error}</p> : null}
      {missing ? <p className="nc-note">No encontramos esa discrepancia.</p> : null}
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

          <div className="nc-geo-map" aria-hidden="true">
            {row.reference ? (
              <>
                <span className="nc-geo-map-tolerance" style={{ width: 120, height: 120, margin: "-60px 0 0 -60px" }} />
                <span className="nc-geo-map-ref" title="Sede registrada" />
                <span className="nc-geo-map-ref-label">Sede registrada</span>
              </>
            ) : null}
            {row.position ? <span className="nc-geo-map-real" title="Dónde se registró" /> : null}
            {!row.position ? <span className="nc-geo-map-nogps">Sin ubicación del dispositivo</span> : null}
            <span className="nc-geo-map-legend">
              Círculo: tolerancia de la zona ·{" "}
              <span className="nc-geo-map-legend-dot" /> Dónde se registró
            </span>
          </div>

          {map ? (
            <a className="nc-text-link" href={map} target="_blank" rel="noreferrer">
              Ver punto real y sede en el mapa
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

          {row.review_note ? (
            <p className="nc-case-note">
              <Badge tone={reviewBadgeTone(row.review_status)}>{REVIEW_LABEL[row.review_status] || row.review_status}</Badge>{" "}
              {row.review_note}
            </p>
          ) : null}

          {canReview(row.review_status) ? (
            <>
              <TextField label="Nota para el comercial" value={note} onChange={(event) => setNote(event.target.value)} />
              <div className="nc-panel-actions">
                <Button type="button" disabled={busy} onClick={() => review("JUSTIFICADA")}>
                  Marcar justificada
                </Button>
                <Button type="button" variant="secondary" disabled={busy} onClick={() => review("RECHAZADA")}>
                  Rechazar
                </Button>
                <Button type="button" variant="quiet" disabled={busy} onClick={() => review("INFORMACION_SOLICITADA")}>
                  Pedir más información
                </Button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="nc-portal-card nc-geo-loc-stub nc-geo-loc-stub--detail">
        <h2 className="nc-portal-card-title">Cambios de ubicación por aprobar</h2>
        <p className="nc-portal-muted">Próximamente: solicitudes de cambio de sede del equipo.</p>
      </div>
    </LeaderPortalPage>
  )
}
