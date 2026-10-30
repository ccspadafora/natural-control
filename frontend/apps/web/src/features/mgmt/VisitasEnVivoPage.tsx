import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import type { SessionUser } from "@nc/domain"
import { Badge, Button, GpsCheck, PageHead, type BadgeTone, type GpsStatus } from "@nc/ui"
import { LeaderPortalPage } from "../leader/LeaderPortalPage"
import { visitClock } from "../rtc-portal/shared/format"
import { mgmtScopeWord } from "./shared/scope"
import { useMgmtVisits, visitPinPosition, type MgmtVisitRow } from "./shared/visits"

const STATUS_WORD: Record<string, string> = {
  PROGRAMADA: "Programada",
  EN_CURSO: "En curso",
}

function statusTone(status: string): BadgeTone {
  if (status === "EN_CURSO") return "primary"
  return "neutral"
}

function stubGps(row: MgmtVisitRow, index: number): GpsStatus | null {
  if (row.status === "PROGRAMADA") return null
  return index % 2 === 0 ? "VERIFICADA" : "FUERA_DE_RANGO"
}

function pinColor(status: string, gps: GpsStatus | null) {
  if (status === "PROGRAMADA") return "var(--primary)"
  if (gps === "VERIFICADA") return "var(--success-solid)"
  if (gps === "FUERA_DE_RANGO") return "var(--danger-solid)"
  if (gps === "PRECISION_BAJA") return "var(--warning-solid)"
  return "var(--primary)"
}

export function VisitasEnVivoPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const { rows, error, loading } = useMgmtVisits()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const canAssign = user.permissions.includes("visits.assign")

  const enriched = useMemo(
    () =>
      rows.map((row, index) => {
        const gps = stubGps(row, index)
        const pin = visitPinPosition(row.id, index)
        return { row, gps, pin, index }
      }),
    [rows],
  )

  const selected = enriched.find((e) => e.row.id === selectedId)

  const enCurso = rows.filter((r) => r.status === "EN_CURSO").length

  return (
    <LeaderPortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-page-head">
        <div className="nc-portal-hero">
          <span className="nc-portal-eyebrow">
            {rows.length} visitas · {enCurso} en curso · {mgmtScopeWord(user)}
          </span>
          <PageHead title="Consolidado de visitas" />
        </div>
        <span className="nc-portal-actions">
          <Button type="button" variant="secondary" disabled title="Próximo paso">
            Exportar a Excel
          </Button>
          {canAssign ? (
            <Link className="nc-btn nc-btn-primary" to="/consola/visitas/nueva">
              Asignar visita
            </Link>
          ) : null}
        </span>
      </header>

      {error ? <p className="nc-note">{error}</p> : null}
      {loading ? <p className="nc-portal-muted">Cargando visitas…</p> : null}

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
              {enriched.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="nc-empty">
                    No hay visitas abiertas.
                  </td>
                </tr>
              ) : (
                enriched.map(({ row, gps, index }) => (
                  <tr
                    key={row.id}
                    className={selectedId === row.id ? "is-selected" : ""}
                    onClick={() => setSelectedId(row.id)}
                  >
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
                    <td>{gps ? <GpsCheck status={gps} distanceM={18 + index * 5} /> : <span className="nc-portal-muted">—</span>}</td>
                    <td className="nc-mgmt-num">—</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="nc-mgmt-visitas-side">
          <div className="nc-mgmt-map-stub" aria-label="Mapa de visitas (stub)">
            {enriched.map(({ row, gps, pin }) => (
              <button
                key={row.id}
                type="button"
                className="nc-mgmt-map-pin"
                style={{ left: pin.left, top: pin.top, background: pinColor(row.status, gps) }}
                title={row.client_name}
                onClick={() => setSelectedId(row.id)}
              />
            ))}
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
                <h2>{selected.row.client_name}</h2>
                <Button type="button" variant="quiet" onClick={() => setSelectedId(null)}>
                  Cerrar
                </Button>
              </div>
              <p className="nc-portal-muted">
                {selected.row.municipality} · {selected.row.rtc_name} · {visitClock(selected.row.scheduled_start)}
              </p>
              <div className="nc-mgmt-detail-grid">
                <div>
                  <span className="nc-portal-muted">Motivo</span>
                  <span>{selected.row.reason || "—"}</span>
                </div>
                <div>
                  <span className="nc-portal-muted">Resultado</span>
                  <span>—</span>
                </div>
                <div>
                  <span className="nc-portal-muted">Potencial</span>
                  <span>—</span>
                </div>
                <div>
                  <span className="nc-portal-muted">Fotos</span>
                  <span>—</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="nc-portal-muted">Elige una visita en la tabla o el mapa para ver el detalle.</p>
          )}
        </div>
      </div>
    </LeaderPortalPage>
  )
}
