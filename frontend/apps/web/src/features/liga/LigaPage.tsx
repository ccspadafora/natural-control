import { useEffect, useMemo, useState } from "react"
import type { SessionUser } from "@nc/domain"
import { Button, FilterPills, Icon, PageHead, Tabs, TOAST } from "@nc/ui"
import { LeaderPortalPage } from "../leader/LeaderPortalPage"
import { isGerencia } from "../mgmt/shared/roles"
import { mgmtScopeWord } from "../mgmt/shared/scope"
import { LeagueRadar } from "./components/LeagueRadar"
import { PlayerCard } from "./components/PlayerCard"
import { ATTR, attrCompareTable, mapPlayer, periodEyebrow, type LeagueRtc } from "./shared/leagueMap"
import { useExport } from "../mgmt/shared/useMetrics"
import { useLeagueBoard } from "./shared/useLeague"
import { useToast } from "../shared/useToast"

const LIGA_TABS = [
  { id: "liga", label: "Liga" },
  { id: "carta", label: "Carta" },
  { id: "campo", label: "Campo" },
  { id: "cara", label: "Comparar" },
]

export function LigaPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [tab, setTab] = useState("liga")
  const [zoneFilter, setZoneFilter] = useState("all")
  const [selectedId, setSelectedId] = useState<string>("")
  const [cmpA, setCmpA] = useState("")
  const [cmpB, setCmpB] = useState("zona")
  const toast = useToast()
  const exporter = useExport()

  const { data, error, loading } = useLeagueBoard(zoneFilter)

  const players = useMemo(() => (data?.results || []).map((r) => mapPlayer(r, r.pos)), [data])
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])) as Record<string, LeagueRtc>, [players])
  const graded = useMemo(() => players.filter((p) => p.a), [players])

  useEffect(() => {
    if (!players.length) return
    if (!selectedId || !byId[selectedId]) setSelectedId(players[0].id)
    if (!cmpA || !byId[cmpA]) setCmpA(graded[0]?.id || players[0].id)
  }, [players, byId, selectedId, cmpA, graded])

  const zonePills = useMemo(() => {
    const nationalLabel = isGerencia(user.role) ? "Nacional" : "Mi equipo"
    const base = [{ id: "all", label: nationalLabel }]
    const zones = data?.zones || []
    return base.concat(zones.map((z) => ({ id: z.id, label: z.name })))
  }, [user.role, data])

  const day = data?.day || 1
  const days = data?.days_in_month || 31
  const cartaRtc = byId[selectedId] || players[0]
  const cmpRtc = byId[cmpA] || graded[0] || players[0]

  const zoneAvgFor = (rtc: LeagueRtc | undefined) => {
    if (!rtc || !data) return [0, 0, 0, 0, 0, 0]
    const peers = players.filter((p) => p.z === rtc.z && p.a)
    if (!peers.length) return [0, 0, 0, 0, 0, 0]
    return ATTR.map((_, i) => Math.round(peers.reduce((t, r) => t + (r.a?.[i] || 0), 0) / peers.length))
  }

  const cartaCompareVals = cartaRtc ? zoneAvgFor(cartaRtc) : [0, 0, 0, 0, 0, 0]
  const cmpBVals =
    cmpB === "zona" ? zoneAvgFor(cmpRtc) : byId[cmpB]?.a || [0, 0, 0, 0, 0, 0]
  const cmpBName = cmpB === "zona" ? `Promedio ${cmpRtc?.zoneName || ""}` : byId[cmpB]?.name || "—"

  const attrTable = useMemo(
    () => (cartaRtc ? attrCompareTable(cartaRtc, cartaCompareVals, `Promedio ${cartaRtc.zoneName}`, day, days) : []),
    [cartaRtc, cartaCompareVals, day, days],
  )
  const cmpAttrTable = useMemo(
    () => (cmpRtc ? attrCompareTable(cmpRtc, cmpBVals, cmpBName, day, days) : []),
    [cmpRtc, cmpBVals, cmpBName, day, days],
  )

  const pitchRows = useMemo(() => {
    const pitch = (data?.ideal_pitch || []).map((p) => ({
      k: p.k,
      n: p.n,
      name: p.name,
      value: p.value,
      zone: p.zone,
      border: p.tier_border,
      bg: p.tier_bg,
    }))
    return [pitch.slice(0, 1), pitch.slice(1, 3), pitch.slice(3, 6)]
  }, [data])

  function openCarta(rtc: LeagueRtc) {
    setSelectedId(rtc.id)
    setTab("carta")
  }

  return (
    <LeaderPortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-page-head">
        <div className="nc-portal-hero">
          <span className="nc-portal-eyebrow">
            {data ? periodEyebrow(data.period_start, data.day) : "Liga de RTC"}
          </span>
          <PageHead title="Liga de RTC" description={mgmtScopeWord(user)} />
        </div>
        <Tabs items={LIGA_TABS} value={tab} onChange={setTab} label="Liga" />
      </header>

      {error ? <p className="nc-portal-muted">{error}</p> : null}
      {loading && !data ? <p className="nc-portal-muted">Cargando liga…</p> : null}

      {tab === "liga" && data ? (
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
                  {players.map((row) => (
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
                  {data.badges.map((b) => (
                    <li key={b.code}>
                      <span className="nc-liga-badge-name">{b.title}</span>
                      <span>
                        {b.name} <span className="nc-portal-muted">· {b.reason}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="nc-portal-card">
                <h2>Tercio inferior · qué trabajar</h2>
                <ul className="nc-liga-bottom">
                  {data.bottom_third.map((b) => (
                    <li key={b.user_id}>
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

      {tab === "carta" && cartaRtc ? (
        <div className="nc-portal-stack">
          <FilterPills
            items={graded.map((o) => ({ id: o.id, label: o.name }))}
            value={selectedId}
            onChange={setSelectedId}
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
          {pitchRows.map((row, idx) => (
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

      {tab === "cara" && cmpRtc ? (
        <div className="nc-portal-stack">
          <div className="nc-liga-compare-bar">
            <label className="nc-liga-select-wrap">
              <span className="nc-portal-muted">Comercial</span>
              <select className="nc-liga-select" value={cmpA} onChange={(e) => setCmpA(e.target.value)}>
                {graded.map((o) => (
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
                {graded
                  .filter((o) => o.id !== cmpA)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="nc-liga-compare-spacer" />
            <Button
              type="button"
              variant="secondary"
              disabled={exporter.busy}
              onClick={() => {
                void (async () => {
                  toast.show("Generando el PDF…", "neutral")
                  const ok = await exporter.start("LEAGUE_PDF", {
                    zone: zoneFilter === "all" ? null : zoneFilter,
                    compare_a_name: cmpRtc?.name,
                    compare_b_name: cmpBName,
                    attr_rows: cmpAttrTable,
                  })
                  toast.show(ok ? TOAST.exportReady : TOAST.genericError, ok ? "success" : "danger")
                })()
              }}
            >
              {exporter.busy ? "Generando…" : "Exportar PDF"}
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
      {toast.node}
    </LeaderPortalPage>
  )
}

function FormIcon({ form }: { form: "up" | "flat" | "down" }) {
  if (form === "up") return <Icon name="arrowUp" small />
  if (form === "down") return <Icon name="arrowDown" small />
  return <Icon name="minus" small />
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
