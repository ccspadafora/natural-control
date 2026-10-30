import { useMemo, useState } from "react"
import type { SessionUser } from "@nc/domain"
import { ComplianceMeter, GpsCheck, PageHead, StatTile, Tabs, type GpsStatus } from "@nc/ui"
import { LeaderPortalPage } from "../leader/LeaderPortalPage"
import { greeting, portalMonthEyebrow, visitClock } from "../rtc-portal/shared/format"
import { AccumulatedSalesChart } from "./components/AccumulatedSalesChart"
import { AttentionCardsToday, AttentionListCompact } from "./components/AttentionList"
import { ZoneComplianceBars } from "./components/ZoneComplianceBars"
import { placeholderAttention, placeholderRtcs, placeholderZones } from "./shared/placeholderData"
import { mgmtScopeWord } from "./shared/scope"
import { useMgmtVisits } from "./shared/visits"

const HOME_TABS = [
  { id: "mes", label: "A · Mes" },
  { id: "dia", label: "B · Día" },
]

export function MgmtInicioPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [homeTab, setHomeTab] = useState("mes")
  const attention = useMemo(() => placeholderAttention(), [])
  const zones = useMemo(() => placeholderZones(), [])
  const rtcs = useMemo(() => placeholderRtcs(), [])
  const { rows: visits } = useMgmtVisits()

  const liveFeed = useMemo(() => {
    const open = visits.filter((v) => v.status === "EN_CURSO" || v.status === "PROGRAMADA").slice(0, 6)
    return open.map((v, i) => ({
      id: v.id,
      client: v.client_name,
      rtcName: v.rtc_name,
      mun: v.municipality,
      res: v.reason || "—",
      t: visitClock(v.scheduled_start),
      gps: (i % 3 === 0 ? "VERIFICADA" : i % 3 === 1 ? "PRECISION_BAJA" : "FUERA_DE_RANGO") as GpsStatus,
      dist: 12 + i * 7,
      rowBg: v.status === "EN_CURSO" ? "var(--primary-tint)" : "transparent",
    }))
  }, [visits])

  const visitCount = visits.length
  const enCurso = visits.filter((v) => v.status === "EN_CURSO").length

  return (
    <LeaderPortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-page-head">
        <div className="nc-portal-hero">
          <span className="nc-portal-eyebrow">
            {portalMonthEyebrow()} · {mgmtScopeWord(user)}
          </span>
          <PageHead title={greeting(user.first_name)} />
        </div>
        <Tabs items={HOME_TABS} value={homeTab} onChange={setHomeTab} label="Diseño del inicio" />
      </header>

      <div className="nc-portal-metrics">
        <StatTile label="Ventas del mes" value="—" delta="+4 pts vs. sep." deltaDirection="up" caption="Conecta ERP · próximo paso" />
        <StatTile label="Forecast probable" value="—" delta="+9 % vs. sep." deltaDirection="up" caption="Noviembre a febrero" />
        <StatTile
          label="Visitas realizadas"
          value={visitCount > 0 ? String(visitCount) : "—"}
          delta={visitCount > 0 ? undefined : undefined}
          caption={visitCount > 0 ? `${enCurso} en curso ahora` : "Mes en curso · API visitas"}
        />
        <StatTile label="Verificadas por GPS" value="—" delta="−1 pt vs. sep." deltaDirection="down" deltaGood={false} caption="Geolocalización" />
      </div>

      {homeTab === "mes" ? (
        <>
          <div className="nc-portal-split">
            <AccumulatedSalesChart />
            <AttentionListCompact items={attention} />
          </div>
          <ZoneComplianceBars zones={zones} />
        </>
      ) : null}

      {homeTab === "dia" ? (
        <div className="nc-mgmt-day-layout">
          <section className="nc-mgmt-day-col">
            <h2 className="nc-mgmt-section-title">Para resolver hoy</h2>
            <AttentionCardsToday items={attention} />
          </section>
          <section className="nc-mgmt-day-col">
            <h2 className="nc-mgmt-section-title">Cumplimiento por RTC</h2>
            {rtcs.map((r) => (
              <ComplianceMeter key={r.id} label={r.name} value={r.sales} target={r.budget} expected={r.expected} />
            ))}
          </section>
          <section className="nc-mgmt-day-col">
            <h2 className="nc-mgmt-section-title">En la calle ahora</h2>
            <div className="nc-portal-card nc-mgmt-live-feed">
              {liveFeed.length === 0 ? (
                <p className="nc-portal-muted">No hay visitas programadas o en curso.</p>
              ) : (
                liveFeed.map((v) => (
                  <div key={v.id} className="nc-mgmt-live-row" style={{ background: v.rowBg }}>
                    <div className="nc-mgmt-live-head">
                      <span className="nc-leader-link-title">{v.client}</span>
                      <span className="nc-portal-muted">{v.t}</span>
                    </div>
                    <span className="nc-portal-muted">
                      {v.rtcName} · {v.mun} · {v.res}
                    </span>
                    <GpsCheck status={v.gps} distanceM={v.dist} />
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}

    </LeaderPortalPage>
  )
}
