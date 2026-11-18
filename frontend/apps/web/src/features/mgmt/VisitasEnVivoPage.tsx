import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge, Button, Format, GpsCheck, Icon, PageHead, TOAST, type BadgeTone } from "@nc/ui"
import { LeaderPortalPage } from "../leader/LeaderPortalPage"
import { gpsStatus, REVIEW_LABEL } from "../leader/shared/geo"
import { visitClock } from "../rtc-portal/shared/format"
import { projectPoints } from "./shared/metrics"
import { mgmtScopeWord } from "./shared/scope"
import { useExport, useLiveVisits } from "./shared/useMetrics"
import { useToast } from "../shared/useToast"

const STATUS_WORD: Record<string, string> = {
  PROGRAMADA: "Programada",
  EN_CURSO: "En curso",
  REALIZADA: "Realizada",
  NO_REALIZADA: "No realizada",
}

const RESULT_WORD: Record<string, string> = {
  PEDIDO_CONFIRMADO: "Pedido confirmado",
  COTIZACION_SOLICITADA: "Cotización solicitada",
  SEGUIMIENTO_PROGRAMADO: "Seguimiento programado",
  SIN_INTERES: "Sin interés",
  OTRO: "Otro",
}

type VisitDetail = {
  id: string
  notes: string
  agreements: string
  not_done_reason: string
  products: { id: string; name: string; kind: string; total_value: string }[]
  photos: { id: string; url: string; thumbnail: string }[]
}

function statusTone(status: string): BadgeTone {
  if (status === "EN_CURSO") return "primary"
  if (status === "REALIZADA") return "success"
  if (status === "NO_REALIZADA") return "warning"
  return "neutral"
}

function pinColor(status: string, gps: string | undefined) {
  if (gps === "VERIFICADA") return "var(--success-solid)"
  if (gps === "FUERA_DE_RANGO") return "var(--danger-solid)"
  if (gps === "PRECISION_BAJA") return "var(--warning-solid)"
  return status === "PROGRAMADA" || status === "EN_CURSO" ? "var(--primary)" : "var(--ink-tertiary)"
}

function money(n: number) {
  return n > 0 ? Format.money(n) : "—"
}

export function VisitasEnVivoPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const { data, error, loading } = useLiveVisits()
  const exporter = useExport()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<VisitDetail | null>(null)
  const canAssign = user.permissions.includes("visits.assign")
  const canExport = user.permissions.includes("visits.export")

  async function exportVisits() {
    if (!canExport) {
      toast.show("Tu perfil aún no tiene la exportación habilitada. Pídesela a tu administrador.", "warning")
      return
    }
    toast.show("Generando el archivo…", "neutral")
    const ok = await exporter.start("VISITS_XLSX")
    toast.show(ok ? TOAST.exportReady : TOAST.genericError, ok ? "success" : "danger")
  }

  const rows = data?.results ?? []
  const pins = useMemo(() => {
    const projected = projectPoints(rows)
    // Sin coordenadas del backend: reparte los pines de forma estable para que el mapa nunca quede vacío.
    rows.forEach((row, i) => {
      if (projected.has(row.id)) return
      const seed = Array.from(row.id).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 997, 7 + i)
      projected.set(row.id, { left: `${12 + (seed % 76)}%`, top: `${14 + ((seed * 7) % 62)}%` })
    })
    return projected
  }, [rows])
  const toast = useToast()
  const selected = rows.find((r) => r.id === selectedId)

  useEffect(() => {
    setDetail(null)
    if (!selectedId) return
    let alive = true
    api<VisitDetail>(`/api/v1/visits/${selectedId}`)
      .then((res) => {
        if (alive) setDetail(res)
      })
      .catch(() => {
        if (alive) setDetail(null)
      })
    return () => {
      alive = false
    }
  }, [selectedId])

  return (
    <LeaderPortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-page-head">
        <div className="nc-portal-hero">
          <span className="nc-portal-eyebrow">
            {data?.summary.total ?? 0} visitas · {data?.summary.en_curso ?? 0} en curso · {mgmtScopeWord(user)}
          </span>
          <PageHead title="Consolidado de visitas" />
        </div>
        <span className="nc-portal-actions">
          <Button type="button" variant="secondary" disabled={exporter.busy} onClick={() => void exportVisits()}>
            {exporter.busy ? "Generando…" : "Exportar a Excel"}
          </Button>
          {canAssign ? (
            <Link className="nc-btn nc-btn-primary" to="/consola/visitas/nueva">
              Asignar visita
            </Link>
          ) : null}
        </span>
      </header>

      {error ? <p className="nc-note">{error}</p> : null}
      {exporter.error ? <p className="nc-note">{exporter.error}</p> : null}
      {loading && !data ? <p className="nc-portal-muted">Cargando visitas…</p> : null}

      <div className="nc-mgmt-visitas-layout">
        <div className="nc-portal-card nc-table-wrap">
          <table className="nc-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Cliente · RTC</th>
                <th>Estado</th>
                <th>GPS</th>
                <th className="nc-mgmt-num">Concretado</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="nc-empty">
                    No hay visitas para hoy.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className={selectedId === row.id ? "is-selected" : ""}
                    style={row.status === "EN_CURSO" && selectedId !== row.id ? { background: "var(--primary-tint)" } : undefined}
                    onClick={() => setSelectedId(row.id)}>
                    <td>{visitClock(row.scheduled_start)}</td>
                    <td>
                      <div>{row.client_name}</div>
                      <div className="nc-portal-muted">
                        {row.rtc_name} · {row.municipality}
                      </div>
                    </td>
                    <td>
                      <Badge tone={statusTone(row.status)}>{STATUS_WORD[row.status] || row.status}</Badge>
                    </td>
                    <td>
                      {row.gps ? (
                        <GpsCheck status={gpsStatus(row.gps.status)} distanceM={row.gps.distance_m ?? undefined} />
                      ) : (
                        <span className="nc-portal-muted">—</span>
                      )}
                    </td>
                    <td className="nc-mgmt-num">{money(row.concretado)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="nc-mgmt-visitas-side">
          <div className="nc-mgmt-map-stub" aria-label="Mapa de visitas">
            {rows.map((row) => {
              const pin = pins.get(row.id)
              if (!pin) return null
              return (
                <button
                  key={row.id}
                  type="button"
                  className="nc-mgmt-map-pin"
                  style={{
                    left: pin.left,
                    top: pin.top,
                    background: pinColor(row.status, row.gps?.status),
                    ...(selectedId === row.id ? { boxShadow: "0 0 0 3px var(--primary-tint)", zIndex: 2 } : null),
                  }}
                  title={row.client_name}
                  onClick={() => setSelectedId(row.id)}
                />
              )
            })}
            <div className="nc-mgmt-map-legend">
              <span>
                <i className="nc-mgmt-pin-dot success" /> Verificada
              </span>
              <span>
                <i className="nc-mgmt-pin-dot danger" /> Fuera de rango
              </span>
              <span>
                <i className="nc-mgmt-pin-dot warning" /> Precisión baja
              </span>
              <span>
                <i className="nc-mgmt-pin-dot primary" /> Programada
              </span>
            </div>
          </div>

          {selected ? (
            <div className="nc-portal-card nc-mgmt-visit-detail">
              <div className="nc-portal-card-head">
                <h2>{selected.client_name}</h2>
                <Button type="button" variant="quiet" onClick={() => setSelectedId(null)}>
                  Cerrar
                </Button>
              </div>
              <p className="nc-portal-muted">
                {[selected.site, selected.municipality, selected.rtc_name, visitClock(selected.scheduled_start)].filter(Boolean).join(" · ")}
              </p>
              {selected.gps ? (
                <p>
                  <GpsCheck status={gpsStatus(selected.gps.status)} distanceM={selected.gps.distance_m ?? undefined} />{" "}
                  <span className="nc-portal-muted">{REVIEW_LABEL[selected.gps.review_status] ?? ""}</span>
                </p>
              ) : null}
              <div className="nc-mgmt-detail-grid">
                <div>
                  <span className="nc-portal-muted">Motivo</span>
                  <span>{selected.reason || "—"}</span>
                </div>
                <div>
                  <span className="nc-portal-muted">Resultado</span>
                  <span>{RESULT_WORD[selected.result] || "—"}</span>
                </div>
                <div>
                  <span className="nc-portal-muted">Potencial</span>
                  <span>{money(selected.potencial)}</span>
                </div>
                <div>
                  <span className="nc-portal-muted">Concretado</span>
                  <span>{money(selected.concretado)}</span>
                </div>
                <div>
                  <span className="nc-portal-muted">Fotos</span>
                  <span>{selected.photos}</span>
                </div>
              </div>
              {detail ? (
                <>
                  {detail.products.length > 0 ? (
                    <ul className="nc-portal-history">
                      {detail.products.map((p) => (
                        <li key={p.id}>
                          <span className="nc-portal-task-title">{p.name}</span>
                          <span className="nc-portal-muted">
                            {p.kind === "CONCRETADO" ? "Concretado" : "Potencial"} · {Format.money(Number(p.total_value))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {detail.notes ? <p className="nc-portal-muted">Notas: {detail.notes}</p> : null}
                  {detail.agreements ? <p className="nc-portal-muted">Acuerdos: {detail.agreements}</p> : null}
                  {detail.not_done_reason ? <p className="nc-portal-muted">No se realizó: {detail.not_done_reason}</p> : null}
                </>
              ) : null}
            </div>
          ) : (
            <p className="nc-portal-muted">
              <Icon name="pin" small /> Elige una visita en la tabla o el mapa para ver el detalle.
            </p>
          )}
        </div>
      </div>
      {toast.node}
    </LeaderPortalPage>
  )
}
