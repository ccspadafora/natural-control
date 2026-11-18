import { useMemo, useState } from "react"
import type { SessionUser } from "@nc/domain"
import { ComplianceMeter, Format, GpsCheck, PageHead, StatTile, Tabs } from "@nc/ui"
import { LeaderPortalPage } from "../leader/LeaderPortalPage"
import { gpsStatus } from "../leader/shared/geo"
import { greeting, portalMonthEyebrow, visitClock } from "../rtc-portal/shared/format"
import { AccumulatedSalesChart } from "./components/AccumulatedSalesChart"
import { AttentionCardsToday, AttentionListCompact } from "./components/AttentionList"
import { ZoneComplianceBars } from "./components/ZoneComplianceBars"
import { attentionCases, moneyShort, pctLabel, zoneBarRows } from "./shared/metrics"
import { mgmtScopeWord } from "./shared/scope"
import { useLiveVisits, useTeamMetrics, useZoneMetrics } from "./shared/useMetrics"

const HOME_TABS = [
  { id: "mes", label: "A · Mes" },
  { id: "dia", label: "B · Día" },
]

const FEED_RANK: Record<string, number> = { EN_CURSO: 0, REALIZADA: 1, PROGRAMADA: 2 }

export function MgmtInicioPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [homeTab, setHomeTab] = useState("mes")
  const { data: team, error } = useTeamMetrics("mes")
  const { zones } = useZoneMetrics()
  const { data: live } = useLiveVisits()

  const attention = useMemo(() => attentionCases(team?.attention), [team])
  const zoneRows = useMemo(() => zoneBarRows(zones), [zones])
  const totals = team?.totals

  const liveFeed = useMemo(() => {
    const open = (live?.results ?? [])
      .filter((v) => v.status in FEED_RANK)
      .sort((a, b) => FEED_RANK[a.status] - FEED_RANK[b.status] || (b.scheduled_start ?? "").localeCompare(a.scheduled_start ?? ""))
      .slice(0, 6)
    return open.map((v) => ({
      id: v.id,
      client: v.client_name,
      rtcName: v.rtc_name,
      mun: v.municipality,
      res: v.reason || "—",
      t: visitClock(v.scheduled_start),
      gps: v.gps ? gpsStatus(v.gps.status) : null,
      dist: v.gps?.distance_m ?? undefined,
      rowBg: v.status === "EN_CURSO" ? "var(--primary-tint)" : "transparent",
    }))
  }, [live])

  const salesPace = totals && totals.expected > 0 ? totals.sales / totals.expected : null
  const projection = totals && team && team.day > 0 ? totals.sales * (team.days_in_month / team.day) : null

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

      {error ? <p className="nc-note">{error}</p> : null}

      <div className="nc-portal-metrics">
        <StatTile
          label="Ventas del mes"
          value={totals ? Format.money(totals.sales) : "—"}
          delta={salesPace != null ? `${Math.round(salesPace * 100)} % de lo esperado a la fecha` : undefined}
          deltaDirection={salesPace == null ? "flat" : salesPace >= 1 ? "up" : "down"}
          deltaGood={salesPace == null || salesPace >= 1}
          caption={totals && totals.budget > 0 ? `Meta ${Format.money(totals.budget)}` : "Sin meta cargada"}
        />
        <StatTile label="Forecast probable" value={totals ? moneyShort(totals.forecast_probable) : "—"} caption="Potencial ponderado" />
        <StatTile
          label="Visitas realizadas"
          value={totals ? Format.number(totals.visits_done) : "—"}
          caption={totals && totals.visits_target > 0 ? `Meta del mes: ${Format.number(totals.visits_target)}` : "Mes en curso"}
        />
        <StatTile label="Verificadas por GPS" value={pctLabel(totals?.gps_verified_pct)} caption="Geolocalización" />
      </div>

      {homeTab === "mes" ? (
        <>
          <div className="nc-portal-split">
            <AccumulatedSalesChart
              projection={projection}
              sales={totals?.sales ?? 0}
              budget={totals?.budget ?? 0}
              day={team?.day ?? 1}
              daysInMonth={team?.days_in_month ?? 30}
            />
            <AttentionListCompact items={attention} />
          </div>
          <ZoneComplianceBars zones={zoneRows} />
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
            {(team?.rtcs ?? []).map((r) => (
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
                    {v.gps ? <GpsCheck status={v.gps} distanceM={v.dist} /> : null}
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
