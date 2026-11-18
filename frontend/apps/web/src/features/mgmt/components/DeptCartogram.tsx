import { DEPS, TILE_GAP, TILE_SIZE } from "../shared/departments"
import { d1FromPct, d1ToneToBg, pctLabel, type ZoneMetric } from "../shared/metrics"

type Props = {
  zones: ZoneMetric[]
  selectedZoneId: string
  onSelectZone: (id: string) => void
  showVisitLayer: boolean
}

function depZoneMap(zones: ZoneMetric[]) {
  const map: Record<string, string> = {}
  for (const z of zones) {
    for (const code of z.departments) map[code] = z.id
  }
  return map
}

export function DeptCartogram({ zones, selectedZoneId, onSelectZone, showVisitLayer }: Props) {
  const depZone = depZoneMap(zones)
  const byId = Object.fromEntries(zones.map((z) => [z.id, z]))

  return (
    <div className="nc-mgmt-cartogram-wrap">
      <div
        className="nc-mgmt-cartogram"
        style={{
          width: 5 * (TILE_SIZE + TILE_GAP),
          height: 8 * (TILE_SIZE + TILE_GAP),
        }}
      >
        {DEPS.map((dep) => {
          const zid = depZone[dep.code]
          const zone = zid ? byId[zid] : undefined
          const d1 = zone ? d1FromPct(zone.d1_pct) : null
          const active = zid === selectedZoneId
          return (
            <button
              key={dep.code}
              type="button"
              title={dep.name}
              className={["nc-mgmt-dep-tile", zone ? "is-zone" : "is-empty", active ? "is-active" : ""].filter(Boolean).join(" ")}
              style={{
                left: dep.col * (TILE_SIZE + TILE_GAP),
                top: dep.row * (TILE_SIZE + TILE_GAP),
                background: d1 ? d1ToneToBg(d1.tone) : "var(--surface-sunken)",
              }}
              disabled={!zone}
              onClick={() => zone && onSelectZone(zone.id)}
            >
              <span className="nc-mgmt-dep-code">{dep.code}</span>
              <span className="nc-mgmt-dep-d1">{d1?.label ?? (zone ? "—" : "Sin zona")}</span>
              {showVisitLayer && zone ? (
                <span className="nc-portal-muted nc-mgmt-dep-visits">vis. {pctLabel(zone.visits_pct)}</span>
              ) : null}
            </button>
          )
        })}
      </div>
      <div className="nc-mgmt-cartogram-legend">
        <span>
          <i className="nc-mgmt-swatch success" /> Al día
        </span>
        <span>
          <i className="nc-mgmt-swatch warning" /> Atento
        </span>
        <span>
          <i className="nc-mgmt-swatch danger" /> Atrasado
        </span>
      </div>
    </div>
  )
}
