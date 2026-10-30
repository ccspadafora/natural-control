import { useMemo, useState } from "react"
import type { SessionUser } from "@nc/domain"
import { Button, FilterPills, Icon, PageHead, Tabs } from "@nc/ui"
import { LeaderPortalPage } from "../leader/LeaderPortalPage"
import { isGerencia } from "../mgmt/shared/roles"
import { mgmtScopeWord } from "../mgmt/shared/scope"
import { LeagueRadar } from "./components/LeagueRadar"
import { PlayerCard } from "./components/PlayerCard"
import {
  LEAGUE_BADGES,
  LEAGUE_BY_ID,
  LEAGUE_RTCS,
  LEAGUE_ZONES,
  attrCompareTable,
  bottomThird,
  compareOptions,
  leaderZoneScope,
  pitchRows,
  rankedLeague,
  zoneAverageAttrs,
  type LeagueRtc,
} from "./shared/leagueData"

const LIGA_TABS = [
  { id: "liga", label: "Liga" },
  { id: "carta", label: "Carta" },
  { id: "campo", label: "Campo" },
  { id: "cara", label: "Comparar" },
]

export function LigaPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [tab, setTab] = useState("liga")
  const [zoneFilter, setZoneFilter] = useState("all")
  const [selectedRtcId, setSelectedRtcId] = useState("cr")
  const [cmpA, setCmpA] = useState("cr")
  const [cmpB, setCmpB] = useState("zona")

  const scopeRtcIds = useMemo(() => {
    if (isGerencia(user.role)) return undefined
    const zones = new Set(leaderZoneScope())
    return new Set(LEAGUE_RTCS.filter((r) => zones.has(r.z)).map((r) => r.id))
  }, [user.role])

  const zonePills = useMemo(() => {
    const nationalLabel = isGerencia(user.role) ? "Nacional" : "Mi equipo"
    const base = [{ id: "all", label: nationalLabel }]
    const zones = isGerencia(user.role) ? LEAGUE_ZONES : LEAGUE_ZONES.filter((z) => leaderZoneScope().includes(z.id))
    return base.concat(zones.map((z) => ({ id: z.id, label: z.name })))
  }, [user.role])

  const leagueRows = useMemo(() => rankedLeague(scopeRtcIds, zoneFilter), [scopeRtcIds, zoneFilter])
  const bottom = useMemo(() => bottomThird(leagueRows), [leagueRows])

  const cartaRtc = LEAGUE_BY_ID[selectedRtcId] || LEAGUE_RTCS[0]
  const cmpRtc = LEAGUE_BY_ID[cmpA] || LEAGUE_RTCS[0]
  const cmpBVals = cmpB === "zona" ? zoneAverageAttrs(cmpA) : LEAGUE_BY_ID[cmpB]?.a || [0, 0, 0, 0, 0, 0]
  const cmpBName = cmpB === "zona" ? `Promedio ${cmpRtc.zoneName}` : LEAGUE_BY_ID[cmpB]?.name || "—"

  const cartaCompareVals = zoneAverageAttrs(cartaRtc.id)
  const attrTable = useMemo(
    () => attrCompareTable(cartaRtc, cartaCompareVals, `Promedio ${cartaRtc.zoneName}`),
    [cartaRtc],
  )
  const cmpAttrTable = useMemo(
    () => attrCompareTable(cmpRtc, cmpBVals, cmpBName),
    [cmpRtc, cmpBVals, cmpBName],
  )

  function openCarta(rtc: LeagueRtc) {
    setSelectedRtcId(rtc.id)
    setTab("carta")
  }

  return (
    <LeaderPortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-page-head">
        <div className="nc-portal-hero">
          <span className="nc-portal-eyebrow">Octubre 2026 · GEN de 0 a 99</span>
          <PageHead title="Liga de RTC" description={mgmtScopeWord(user)} />
        </div>
        <Tabs items={LIGA_TABS} value={tab} onChange={setTab} label="Liga" />
      </header>

      {tab === "liga" ? (
        <div className="nc-portal-stack">
          <FilterPills items={zonePills} value={zoneFilter} onChange={setZoneFilter} />
          <div className="nc-liga-layout">
            <div className="nc-portal-card nc-table-wrap">
              <table className="nc-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>RTC</th>
                    <th className="nc-mgmt-num">GEN</th>
                    <th className="nc-mgmt-num">VEN</th>
                    <th className="nc-mgmt-num">CON</th>
                    <th className="nc-mgmt-num">ACT</th>
                    <th className="nc-mgmt-num">COB</th>
                    <th>Forma</th>
                  </tr>
                </thead>
                <tbody>
                  {leagueRows.map((row) => (
                    <tr key={row.id} className="nc-liga-row" onClick={() => openCarta(row)}>
                      <td>
                        <div className="nc-liga-pos">
                          <span>{row.pos}</span>
                          <span className="nc-portal-muted" style={{ color: row.chgFg }}>
                            {row.chgLabel}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="nc-liga-rtc-cell">
                          <span className="nc-liga-tier-bar" style={{ background: row.tierBorder }} />
                          <div>
                            <div>{row.name}</div>
                            <span className="nc-portal-muted">
                              {row.zoneName} · {row.tierName}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="nc-mgmt-num">
                        <strong className="nc-liga-gen">{row.genLabel}</strong>
                      </td>
                      <td className="nc-mgmt-num">{row.ven}</td>
                      <td className="nc-mgmt-num">{row.con}</td>
                      <td className="nc-mgmt-num">{row.act}</td>
                      <td className="nc-mgmt-num">{row.cobA}</td>
                      <td>
                        <span className="nc-liga-form" style={{ color: row.formFg }}>
                          <FormIcon form={row.form} /> {row.formWord}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="nc-portal-stack-tight">
              <section className="nc-portal-card">
                <h2>Insignias del mes</h2>
                <ul className="nc-liga-badges">
                  {LEAGUE_BADGES.map((b) => (
                    <li key={b.badge}>
                      <span className="nc-liga-badge-name">{b.badge}</span>
                      <span>
                        {b.name} <span className="nc-portal-muted">· {b.why}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="nc-portal-card">
                <h2>Tercio inferior · qué trabajar</h2>
                <ul className="nc-liga-bottom">
                  {bottom.map((b) => (
                    <li key={b.name}>
                      <strong>
                        {b.name} · {b.attr} {b.value}
                      </strong>
                      <span className="nc-portal-muted">{b.action}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "carta" ? (
        <div className="nc-portal-stack">
          <FilterPills
            items={compareOptions().map((o) => ({ id: o.id, label: o.name }))}
            value={selectedRtcId}
            onChange={setSelectedRtcId}
          />
          <div className="nc-portal-split">
            <PlayerCard rtc={cartaRtc} />
            <LeagueRadar
              valuesA={cartaRtc.a || [0, 0, 0, 0, 0, 0]}
              valuesB={cartaCompareVals}
              labelA={cartaRtc.name}
              labelB={`Promedio ${cartaRtc.zoneName}`}
            />
          </div>
          <AttrTable rows={attrTable} colA={cartaRtc.name} colB={`Promedio ${cartaRtc.zoneName}`} />
        </div>
      ) : null}

      {tab === "campo" ? (
        <div className="nc-liga-pitch">
          <span className="nc-portal-eyebrow">Once ideal · el mejor en cada atributo</span>
          {pitchRows().map((row, idx) => (
            <div key={idx} className="nc-liga-pitch-row">
              {row.map((p) => (
                <div key={p.k} className="nc-liga-pitch-card" style={{ borderColor: p.border, background: p.bg }}>
                  <span className="nc-portal-eyebrow">{p.k}</span>
                  <span className="nc-liga-pitch-value">{p.value}</span>
                  <span className="nc-liga-pitch-name">{p.name}</span>
                  <span className="nc-portal-muted">{p.zone}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      {tab === "cara" ? (
        <div className="nc-portal-stack">
          <div className="nc-liga-compare-bar">
            <label className="nc-liga-select-wrap">
              <span className="nc-portal-muted">Comercial</span>
              <select className="nc-liga-select" value={cmpA} onChange={(e) => setCmpA(e.target.value)}>
                {compareOptions().map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            <span className="nc-portal-muted">contra</span>
            <label className="nc-liga-select-wrap">
              <span className="nc-portal-muted">Referencia</span>
              <select className="nc-liga-select" value={cmpB} onChange={(e) => setCmpB(e.target.value)}>
                <option value="zona">Promedio de su zona</option>
                {compareOptions()
                  .filter((o) => o.id !== cmpA)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="nc-liga-compare-spacer" />
            <Button type="button" variant="secondary" disabled title="Disponible cuando el backend genere PDFs">
              Exportar PDF
            </Button>
          </div>
          <div className="nc-portal-split">
            <PlayerCard rtc={cmpRtc} />
            <LeagueRadar
              valuesA={cmpRtc.a || [0, 0, 0, 0, 0, 0]}
              valuesB={cmpBVals}
              labelA={cmpRtc.name}
              labelB={cmpBName}
            />
          </div>
          <AttrTable rows={cmpAttrTable} colA={cmpRtc.name} colB={cmpBName} />
        </div>
      ) : null}
    </LeaderPortalPage>
  )
}

function FormIcon({ form }: { form: "up" | "flat" | "down" }) {
  if (form === "up") return <Icon name="arrowUp" size={14} />
  if (form === "down") return <Icon name="arrowDown" size={14} />
  return <Icon name="minus" size={14} />
}

function AttrTable({
  rows,
  colA,
  colB,
}: {
  rows: ReturnType<typeof attrCompareTable>
  colA: string
  colB: string
}) {
  return (
    <div className="nc-portal-card nc-table-wrap">
      <table className="nc-table">
        <thead>
          <tr>
            <th>Atributo</th>
            <th className="nc-mgmt-num">{colA}</th>
            <th className="nc-mgmt-num">{colB}</th>
            <th className="nc-mgmt-num">Dif.</th>
            <th>Indicadores</th>
            <th>Para subir</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.k}>
              <td>
                <span>{row.k}</span> <span className="nc-portal-muted">{row.n}</span>
              </td>
              <td className="nc-mgmt-num">
                <strong>{row.a}</strong>
              </td>
              <td className="nc-mgmt-num">{row.b}</td>
              <td className="nc-mgmt-num" style={{ color: row.diffFg }}>
                {row.diff}
              </td>
              <td className="nc-portal-mono">{row.indicators}</td>
              <td className="nc-portal-muted">{row.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
