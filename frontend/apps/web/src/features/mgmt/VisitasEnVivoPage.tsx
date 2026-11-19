import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge, Button, FilterPills, Format, GpsCheck, PageHead, TOAST, type BadgeTone } from "@nc/ui"
import { LeaderPortalPage } from "../leader/LeaderPortalPage"
import { gpsStatus, REVIEW_LABEL } from "../leader/shared/geo"
import { lateAgo, visitClock } from "../rtc-portal/shared/format"
import { mapsUrl } from "../rtc-portal/shared/maps"
import { LiveVisitsMap } from "./components/LiveVisitsMap"
import { mgmtScopeWord } from "./shared/scope"
import { useExport, useLiveVisits } from "./shared/useMetrics"
import { useToast } from "../shared/useToast"

const STATUS_WORD: Record<string, string> = {
  PROGRAMADA: "Programada",
  EN_CURSO: "En curso",
  REALIZADA: "Realizada",
  NO_REALIZADA: "No realizada",
  ATRASADA: "Atrasada",
}

const RESULT_WORD: Record<string, string> = {
  PEDIDO_CONFIRMADO: "Pedido confirmado",
  COTIZACION_SOLICITADA: "Cotización solicitada",
  SEGUIMIENTO_PROGRAMADO: "Seguimiento programado",
  SIN_INTERES: "Sin interés",
  OTRO: "Otro",
}

type BoardFilter = "todas" | "atrasadas" | "en_curso" | "programadas" | "realizadas"

type VisitDetail = {
  id: string
  notes: string
  agreements: string
  not_done_reason: string
  products: { id: string; name: string; kind: string; total_value: string }[]
  photos: { id: string; url: string; thumbnail: string }[]
}

function statusTone(status: string, late?: boolean): BadgeTone {
  if (late || status === "ATRASADA") return "warning"
  if (status === "EN_CURSO") return "accent"
  if (status === "REALIZADA") return "success"
  if (status === "NO_REALIZADA") return "neutral"
  return "primary"
}

function pinColor(row: { status: string; late?: boolean; gps?: { status: string } | null }) {
  if (row.late) return "#e35d5d"
  if (row.gps?.status === "VERIFICADA") return "#3dbf7a"
  if (row.gps?.status === "FUERA_DE_RANGO") return "#e35d5d"
  if (row.gps?.status === "PRECISION_BAJA") return "#d4a017"
  if (row.status === "EN_CURSO") return "#f0a202"
  return row.status === "PROGRAMADA" ? "#4c8dff" : "#8a93a6"
}

function money(n: number) {
  return n > 0 ? Format.money(n) : "—"
}

function isLate(row: { late?: boolean; status: string; scheduled_start: string | null }) {
  if (row.late) return true
  return row.status === "PROGRAMADA" && !!row.scheduled_start && new Date(row.scheduled_start).getTime() < Date.now()
}

export function VisitasEnVivoPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [params, setParams] = useSearchParams()
  const initial = (params.get("filtro") as BoardFilter) || "atrasadas"
  const [filter, setFilter] = useState<BoardFilter>(
    ["todas", "atrasadas", "en_curso", "programadas", "realizadas"].includes(initial) ? initial : "atrasadas",
  )
  const { data, error, loading } = useLiveVisits()
  const exporter = useExport()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<VisitDetail | null>(null)
  const canAssign = user.permissions.includes("visits.assign")
  const canExport = user.permissions.includes("visits.export")
  const toast = useToast()

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
  const summary = data?.summary

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const late = isLate(row)
      if (filter === "atrasadas") return late
      if (filter === "en_curso") return row.status === "EN_CURSO"
      if (filter === "programadas") return row.status === "PROGRAMADA" && !late
      if (filter === "realizadas") return row.status === "REALIZADA" || row.status === "NO_REALIZADA"
      return true
    })
  }, [rows, filter])

  const mapVisits = useMemo(
    () =>
      filtered.map((row) => ({
        id: row.id,
        client_name: row.client_name,
        status: row.status,
        late: isLate(row),
        gps: row.gps,
        position: row.position,
      })),
    [filtered],
  )

  const selected = filtered.find((r) => r.id === selectedId) ?? rows.find((r) => r.id === selectedId) ?? null

  useEffect(() => {
    if (selectedId && !filtered.some((r) => r.id === selectedId) && !rows.some((r) => r.id === selectedId)) {
      setSelectedId(null)
    }
  }, [filtered, rows, selectedId])

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

  function changeFilter(id: string) {
    const next = id as BoardFilter
    setFilter(next)
    setSelectedId(null)
    setParams(next === "todas" ? {} : { filtro: next }, { replace: true })
  }

  const atrasadasN = summary?.atrasadas ?? rows.filter((r) => isLate(r)).length
  const enCursoN = summary?.en_curso ?? rows.filter((r) => r.status === "EN_CURSO").length
  const programadasN = summary?.programadas ?? rows.filter((r) => r.status === "PROGRAMADA" && !isLate(r)).length
  const realizadasN = (summary?.realizadas ?? 0) + (summary?.no_realizadas ?? 0)
  const withCoords = mapVisits.filter((v) => v.position).length

  const directions = selected
    ? mapsUrl({
        latitude: selected.position?.latitude,
        longitude: selected.position?.longitude,
        site: selected.site,
        municipality: selected.municipality,
      })
    : null

  return (
    <LeaderPortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-page-head">
        <div className="nc-portal-hero">
          <span className="nc-portal-eyebrow">Centro de mando · {mgmtScopeWord(user)} · actualiza en vivo</span>
          <PageHead title="Visitas en vivo" />
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

      {atrasadasN > 0 ? (
        <div className="nc-portal-reschedule-alert" role="alert">
          <strong>
            {atrasadasN} visita{atrasadasN === 1 ? "" : "s"} atrasada{atrasadasN === 1 ? "" : "s"}
          </strong>
          <span className="nc-portal-muted">Prioriza reprogramar o cerrar brechas ahora.</span>
        </div>
      ) : null}

      <FilterPills
        items={[
          { id: "atrasadas", label: `Atrasadas (${atrasadasN})` },
          { id: "en_curso", label: `En curso (${enCursoN})` },
          { id: "programadas", label: `Programadas (${programadasN})` },
          { id: "realizadas", label: `Cerradas (${realizadasN})` },
          { id: "todas", label: `Todas (${summary?.total ?? rows.length})` },
        ]}
        value={filter}
        onChange={changeFilter}
      />

      {error ? <p className="nc-note">{error}</p> : null}
      {exporter.error ? <p className="nc-note">{exporter.error}</p> : null}
      {loading && !data ? <p className="nc-portal-muted">Cargando visitas…</p> : null}

      <section className="nc-mgmt-live-board">
        <div className="nc-mgmt-live-map-panel">
          <div className="nc-mgmt-live-map-head">
            <h2>Mapa</h2>
            <span className="nc-portal-muted">
              {withCoords} ubicaci{withCoords === 1 ? "ón" : "ones"} · GPS o sede del cliente
            </span>
          </div>
          <LiveVisitsMap
            visits={mapVisits}
            selectedId={selectedId}
            onSelect={setSelectedId}
            pinColor={(v) => pinColor(v)}
          />
        </div>

        <div className="nc-mgmt-live-work">
          <div className="nc-portal-card nc-table-wrap nc-mgmt-live-table">
            <table className="nc-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Atraso</th>
                  <th>Cliente · RTC</th>
                  <th>Estado</th>
                  <th>GPS</th>
                  <th className="nc-mgmt-num">Concretado</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} className="nc-empty">
                      No hay visitas en este filtro.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => {
                    const late = isLate(row)
                    const overdue = late ? lateAgo(row.scheduled_start, row.late_minutes) : null
                    return (
                      <tr
                        key={row.id}
                        className={[
                          "nc-mgmt-cmd-row",
                          selectedId === row.id ? "is-selected" : "",
                          late ? "is-late" : "",
                          row.status === "EN_CURSO" ? "is-live" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setSelectedId(row.id)}
                      >
                        <td>{visitClock(row.scheduled_start)}</td>
                        <td>
                          {overdue ? <span className="nc-mgmt-cmd-late">{overdue}</span> : <span className="nc-portal-muted">—</span>}
                        </td>
                        <td>
                          <div>{row.client_name}</div>
                          <div className="nc-portal-muted">
                            {row.rtc_name} · {row.municipality}
                            {!row.position ? " · sin mapa" : ""}
                          </div>
                        </td>
                        <td>
                          <Badge tone={statusTone(row.status, late)}>
                            {late ? "Atrasada" : STATUS_WORD[row.status] || row.status}
                          </Badge>
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
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <aside className="nc-portal-card nc-mgmt-live-detail">
            {selected ? (
              <>
                <div className="nc-portal-card-head">
                  <div>
                    <h2>{selected.client_name}</h2>
                    <p className="nc-portal-muted">
                      {[selected.site, selected.municipality, selected.rtc_name, visitClock(selected.scheduled_start)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Button type="button" variant="quiet" onClick={() => setSelectedId(null)}>
                    Cerrar
                  </Button>
                </div>
                {isLate(selected) ? (
                  <p className="nc-mgmt-cmd-late">{lateAgo(selected.scheduled_start, selected.late_minutes)}</p>
                ) : null}
                <div className="nc-portal-actions-row" style={{ justifyContent: "flex-start" }}>
                  {directions ? (
                    <Button type="button" variant="secondary" onClick={() => window.open(directions, "_blank", "noopener,noreferrer")}>
                      Cómo llegar
                    </Button>
                  ) : null}
                  {canAssign ? (
                    <Link className="nc-btn nc-btn-outline" to={`/consola/visitas/${selected.id}`}>
                      Reasignar
                    </Link>
                  ) : null}
                </div>
                {selected.gps ? (
                  <p>
                    <GpsCheck status={gpsStatus(selected.gps.status)} distanceM={selected.gps.distance_m ?? undefined} />{" "}
                    <span className="nc-portal-muted">{REVIEW_LABEL[selected.gps.review_status] ?? ""}</span>
                  </p>
                ) : (
                  <p className="nc-portal-muted">
                    {selected.position ? "Ubicación de la sede (sin GPS de cierre)." : "Esta visita no tiene coordenadas."}
                  </p>
                )}
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
                    {detail.photos?.length ? (
                      <div className="nc-visita-photo-grid">
                        {detail.photos.map((ph) => (
                          <img key={ph.id} src={ph.thumbnail || ph.url} alt="" />
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : (
              <div className="nc-mgmt-live-detail-empty">
                <h2>Detalle</h2>
                <p className="nc-portal-muted">Elige una visita en el mapa o en la tabla para ver GPS, potencial y acciones.</p>
              </div>
            )}
          </aside>
        </div>
      </section>
      {toast.node}
    </LeaderPortalPage>
  )
}
