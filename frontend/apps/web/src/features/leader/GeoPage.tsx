import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { api, openStream } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge, GpsCheck, PageHead } from "@nc/ui"
import { LeaderPortalPage } from "./LeaderPortalPage"
import {
  GpsCheckRow,
  gpsStatus,
  receivedLabel,
  reviewBadgeTone,
  REVIEW_LABEL,
} from "./shared/geo"

export function GeoPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<GpsCheckRow[]>([])
  const [pending, setPending] = useState(0)
  const [error, setError] = useState("")

  function load() {
    api<{ results: GpsCheckRow[]; pending: number }>("/api/v1/gps-checks")
      .then((data) => {
        setRows(data.results)
        setPending(data.pending)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar"))
  }

  useEffect(() => {
    load()
    const stop = openStream((message) => {
      if (message.type === "gps.discrepancy" || message.type === "visit.closed") load()
    })
    const timer = window.setInterval(load, 30000)
    return () => {
      stop()
      window.clearInterval(timer)
    }
  }, [])

  const pendingLine =
    pending === 0
      ? "Sin discrepancias pendientes de revisión."
      : pending === 1
        ? "1 discrepancia pendiente de revisión."
        : `${pending} discrepancias pendientes de revisión.`

  return (
    <LeaderPortalPage user={user} onLogout={onLogout}>
      <span className="nc-portal-eyebrow">{pendingLine}</span>
      <PageHead title="Discrepancias de GPS" />
      {error ? <p className="nc-note">{error}</p> : null}
      <div className="nc-geo-layout">
        <div className="nc-geo-list nc-portal-card">
          {rows.length === 0 ? (
            <p className="nc-portal-muted nc-geo-empty">No hay discrepancias en tu alcance.</p>
          ) : (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                className="nc-geo-row"
                onClick={() => navigate(`/consola/geo/${row.id}`)}
              >
                <div className="nc-geo-row-head">
                  <span className="nc-geo-row-title">{row.client_name}</span>
                  <Badge tone={reviewBadgeTone(row.review_status)}>{REVIEW_LABEL[row.review_status] || row.review_status}</Badge>
                </div>
                <span className="nc-portal-muted">
                  {row.rtc_name} · {receivedLabel(row.received_at)}
                </span>
                <GpsCheck status={gpsStatus(row.status)} distanceM={row.distance_m ?? undefined} toleranceM={row.tolerance_m ?? undefined} />
              </button>
            ))
          )}
        </div>
        <aside className="nc-geo-aside">
          <div className="nc-portal-card nc-geo-loc-stub">
            <h2 className="nc-portal-card-title">Cambios de ubicación por aprobar</h2>
            <p className="nc-portal-muted">
              Cuando exista la API de solicitudes de cambio de sede, las verás aquí para aprobar o rechazar.
            </p>
            <p className="nc-note">
              {/* TODO: LocationChangeRequest — listar pendientes y acciones aprobar/rechazar (HU 2.5). */}
              Backend pendiente: <code>LocationChangeRequest</code>.
            </p>
          </div>
          {rows[0] ? (
            <p className="nc-portal-muted">
              <Link to={`/consola/geo/${rows[0].id}`}>Abrir el primer caso</Link>
            </p>
          ) : null}
        </aside>
      </div>
    </LeaderPortalPage>
  )
}
