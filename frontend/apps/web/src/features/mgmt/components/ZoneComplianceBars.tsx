import type { ZoneBarRow } from "../shared/placeholderData"

export function ZoneComplianceBars({ zones }: { zones: ZoneBarRow[] }) {
  return (
    <div className="nc-portal-card nc-mgmt-zone-bars">
      <div className="nc-portal-card-head">
        <h2>Zonas · cumplimiento a la fecha</h2>
        <span className="nc-portal-muted">Misma escala · la marca es el 100 % de la meta a la fecha</span>
      </div>
      {zones.map((z) => (
        <div key={z.id} className="nc-mgmt-zone-row">
          <span className="nc-mgmt-zone-label">
            {z.name}
            <br />
            <span className="nc-portal-muted">
              {z.rtcCount} RTC · {z.salesLabel}
            </span>
          </span>
          <div className="nc-mgmt-zone-bar-stack">
            <div className="nc-mgmt-zone-bar-track nc-mgmt-zone-bar-track--lg">
              <div className="nc-mgmt-zone-bar-fill" style={{ width: `${z.salesPct}%`, background: z.salesColor }} />
              <div className="nc-mgmt-zone-marker" aria-hidden />
            </div>
            <div className="nc-mgmt-zone-bar-track">
              <div className="nc-mgmt-zone-bar-fill" style={{ width: `${z.visitsPct}%`, background: "var(--chart-5)" }} />
            </div>
          </div>
          <span className="nc-mgmt-zone-kpi">
            {z.d1Label}
            <br />
            <span className="nc-portal-muted">vis. {z.visitsLabel}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
