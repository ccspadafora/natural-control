import { useState } from "react"
import type { SessionUser } from "@nc/domain"
import { Badge, Button, Format, PageHead, type BadgeTone } from "@nc/ui"
import { LeaderPortalPage } from "../leader/LeaderPortalPage"
import { DeptCartogram } from "./components/DeptCartogram"
import { pctLabel, type ZoneMetric } from "./shared/metrics"
import { useZoneMetrics } from "./shared/useMetrics"

function toneBadge(tone: ZoneMetric["tone"]): BadgeTone {
  if (tone === "success") return "success"
  if (tone === "warning") return "warning"
  return "danger"
}

function toneWord(tone: ZoneMetric["tone"]) {
  if (tone === "success") return "Al día"
  if (tone === "warning") return "Atento"
  return "Atrasado"
}

export function MapaZonasPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const { zones, error, loading } = useZoneMetrics()
  const [zoneId, setZoneId] = useState("")
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

      {error ? <p className="nc-note">{error}</p> : null}
      {loading && zones.length === 0 ? <p className="nc-portal-muted">Cargando zonas…</p> : null}

      <div className="nc-mgmt-mapa-layout">
        <DeptCartogram zones={zones} selectedZoneId={selected?.id ?? ""} onSelectZone={setZoneId} showVisitLayer={showLayer} />

        <div className="nc-mgmt-mapa-side">
          {selected ? (
            <div className="nc-portal-card">
              <div className="nc-portal-card-head">
                <div>
                  <h2>{selected.name}</h2>
                  <p className="nc-portal-muted">
                    {selected.leader ? `Líder ${selected.leader}` : "Sin líder"} · {selected.rtc_count} RTC · {selected.municipality_count} municipios
                  </p>
                </div>
                <Badge tone={toneBadge(selected.tone)}>{toneWord(selected.tone)}</Badge>
              </div>
              <div className="nc-mgmt-zone-kpi-grid">
                <div>
                  <span className="nc-portal-muted">Ventas</span>
                  <strong>{Format.money(selected.sales)}</strong>
                </div>
                <div>
                  <span className="nc-portal-muted">D1 · D2</span>
                  <strong>
                    {pctLabel(selected.d1_pct)} · {pctLabel(selected.d2_pct)}
                  </strong>
                </div>
                <div>
                  <span className="nc-portal-muted">Visitas a la fecha</span>
                  <strong>{pctLabel(selected.visits_pct)}</strong>
                </div>
                <div>
                  <span className="nc-portal-muted">Cobertura</span>
                  <strong>{pctLabel(selected.coverage_pct)}</strong>
                </div>
              </div>
            </div>
          ) : null}

          <div className="nc-portal-card">
            <div className="nc-portal-card-head">
              <h2>Ranking por zona</h2>
            </div>
            <div className="nc-mgmt-zone-rank" role="list">
              {zones.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  role="listitem"
                  className={`nc-mgmt-zone-rank-row${z.id === selected?.id ? " is-selected" : ""}`}
                  onClick={() => setZoneId(z.id)}
                >
                  <span>{z.name}</span>
                  <span>{pctLabel(z.d1_pct)}</span>
                  <span>{pctLabel(z.visits_pct)}</span>
                  <span>{pctLabel(z.coverage_pct)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </LeaderPortalPage>
  )
}
