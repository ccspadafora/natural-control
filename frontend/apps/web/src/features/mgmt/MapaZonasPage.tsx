import { useMemo, useState } from "react"
import type { SessionUser } from "@nc/domain"
import { Badge, Button, PageHead, type BadgeTone } from "@nc/ui"
import { LeaderPortalPage } from "../leader/LeaderPortalPage"
import { DeptCartogram } from "./components/DeptCartogram"
import { placeholderMapZones, type MapZoneSummary } from "./shared/placeholderData"

function toneBadge(tone: MapZoneSummary["tone"]): BadgeTone {
  if (tone === "success") return "success"
  if (tone === "warning") return "warning"
  return "danger"
}

function toneWord(tone: MapZoneSummary["tone"]) {
  if (tone === "success") return "Al día"
  if (tone === "warning") return "Atento"
  return "Atrasado"
}

export function MapaZonasPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const zones = useMemo(() => placeholderMapZones(), [])
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "")
  const [showLayer, setShowLayer] = useState(false)
  const selected = zones.find((z) => z.id === zoneId) ?? zones[0]

  return (
    <LeaderPortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-page-head">
        <div className="nc-portal-hero">
          <span className="nc-portal-eyebrow">Cumplimiento D1 por departamento</span>
          <PageHead title="Mapa de zonas" />
        </div>
        <Button type="button" variant="secondary" onClick={() => setShowLayer((v) => !v)}>
          {showLayer ? "Ocultar visitas en mapa" : "Mostrar visitas en mapa"}
        </Button>
      </header>

      <div className="nc-mgmt-mapa-layout">
        <DeptCartogram zones={zones} selectedZoneId={zoneId} onSelectZone={setZoneId} showVisitLayer={showLayer} />

        <div className="nc-mgmt-mapa-side">
          {selected ? (
            <div className="nc-portal-card">
              <div className="nc-portal-card-head">
                <div>
                  <h2>{selected.name}</h2>
                  <p className="nc-portal-muted">
                    Líder {selected.leader} · {selected.rtcCount} RTC · {selected.munCount} municipios
                  </p>
                </div>
                <Badge tone={toneBadge(selected.tone)}>{toneWord(selected.tone)}</Badge>
              </div>
              <div className="nc-mgmt-zone-kpi-grid">
                <div>
                  <span className="nc-portal-muted">Ventas</span>
                  <strong>{selected.salesLabel}</strong>
                </div>
                <div>
                  <span className="nc-portal-muted">D1 · D2</span>
                  <strong>
                    {selected.d1Label} · {selected.d2Label}
                  </strong>
                </div>
                <div>
                  <span className="nc-portal-muted">Visitas a la fecha</span>
                  <strong>{selected.visitsLabel}</strong>
                </div>
                <div>
                  <span className="nc-portal-muted">Cobertura</span>
                  <strong>{selected.cobLabel}</strong>
                </div>
              </div>
            </div>
          ) : null}

          <div className="nc-portal-card nc-table-wrap">
            <table className="nc-table">
              <thead>
                <tr>
                  <th>Zona</th>
                  <th className="nc-mgmt-num">D1</th>
                  <th className="nc-mgmt-num">Visitas</th>
                  <th className="nc-mgmt-num">Cobertura</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => (
                  <tr key={z.id} className={z.id === zoneId ? "is-selected" : ""} onClick={() => setZoneId(z.id)}>
                    <td>{z.name}</td>
                    <td className="nc-mgmt-num">{z.d1Label}</td>
                    <td className="nc-mgmt-num">{z.visitsLabel}</td>
                    <td className="nc-mgmt-num">{z.cobLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </LeaderPortalPage>
  )
}
