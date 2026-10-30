import { useMemo, useState } from "react"
import type { SessionUser } from "@nc/domain"
import { Badge, FilterPills, PageHead, StatTile, Tabs } from "@nc/ui"
import { LeaderPortalPage } from "../leader/LeaderPortalPage"
import { mgmtScopeWord } from "./shared/scope"
import { useClientCount, useMgmtVisits, useRtcUsers } from "./shared/visits"

const PERIODS = [
  { id: "mes", label: "Mes" },
  { id: "semana", label: "Semana" },
  { id: "dia", label: "Día" },
  { id: "anio", label: "Año" },
]

const BOARD_TABS = [
  { id: "comercial", label: "Por comercial" },
  { id: "dia", label: "Del día" },
  { id: "producto", label: "Por producto" },
]

const PRODUCT_STUB = [
  { id: "p1", name: "Herbicida Selectivo 480 SL", cat: "Herbicidas", ai: "Glifosato", pot: "$ 128 M", erp: "$ 94 M", conv: "38 %", vr: "+6 %", vrTone: "var(--success)" },
  { id: "p2", name: "Fungicida Triazol 250 EC", cat: "Fungicidas", ai: "Tebuconazol", pot: "$ 86 M", erp: "$ 61 M", conv: "31 %", vr: "−2 %", vrTone: "var(--danger-solid)" },
  { id: "p3", name: "Insecticida Neonic 200 SC", cat: "Insecticidas", ai: "Imidacloprid", pot: "$ 72 M", erp: "$ 48 M", conv: "27 %", vr: "+3 %", vrTone: "var(--success)" },
]

export function TablerosPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [period, setPeriod] = useState("mes")
  const [tab, setTab] = useState("comercial")
  const rtcs = useRtcUsers()
  const { rows: visits } = useMgmtVisits()
  const clientCount = useClientCount()

  const byRtc = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const v of visits) counts[v.rtc_id] = (counts[v.rtc_id] || 0) + 1
    return rtcs.map((r, i) => ({
      id: r.id,
      name: `${r.first_name} ${r.last_name}`,
      zone: r.zone_name || "Sin zona",
      visits: counts[r.id] || 0,
      d1: i % 3 === 0 ? "92 %" : i % 3 === 1 ? "78 %" : "84 %",
      d2: i % 2 === 0 ? "96 %" : "88 %",
      sync: "Hace 12 min (stub)",
    }))
  }, [rtcs, visits])

  const dayTotals = useMemo(() => {
    const prog = visits.length
    const done = 0
    const pend = visits.filter((v) => v.status === "PROGRAMADA").length
    const nr = 0
    return { prog, done, pend, nr }
  }, [visits])

  return (
    <LeaderPortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-page-head">
        <div className="nc-portal-hero">
          <span className="nc-portal-eyebrow">{mgmtScopeWord(user)}</span>
          <PageHead title="Tableros" />
        </div>
        <FilterPills items={PERIODS} value={period} onChange={setPeriod} />
      </header>

      <Tabs items={BOARD_TABS} value={tab} onChange={setTab} label="Tableros" />

      {tab === "comercial" ? (
        <div className="nc-portal-card nc-table-wrap">
          <table className="nc-table">
            <thead>
              <tr>
                <th>RTC</th>
                <th className="nc-mgmt-num">Ventas</th>
                <th className="nc-mgmt-num">D1 a la fecha</th>
                <th className="nc-mgmt-num">D2 proyectado</th>
                <th>Visitas</th>
                <th className="nc-mgmt-num">Verificadas</th>
                <th className="nc-mgmt-num">Cobertura</th>
                <th>Última sincronización</th>
              </tr>
            </thead>
            <tbody>
              {byRtc.length === 0 ? (
                <tr>
                  <td colSpan={8} className="nc-empty">
                    No hay comerciales en tu alcance.
                  </td>
                </tr>
              ) : (
                byRtc.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div>{r.name}</div>
                      <div className="nc-portal-muted">{r.zone}</div>
                    </td>
                    <td className="nc-mgmt-num">—</td>
                    <td className="nc-mgmt-num">
                      <span className="nc-mgmt-d1-pill">{r.d1}</span>
                    </td>
                    <td className="nc-mgmt-num">{r.d2}</td>
                    <td>
                      <span>{r.visits}</span>{" "}
                      <Badge tone={r.visits > 0 ? "success" : "warning"}>{r.visits > 0 ? "Al día" : "Sin abiertas"}</Badge>
                    </td>
                    <td className="nc-mgmt-num">—</td>
                    <td className="nc-mgmt-num">{clientCount != null ? `${Math.min(99, 60 + r.visits * 3)} %` : "—"}</td>
                    <td className="nc-portal-muted">{r.sync}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <p className="nc-portal-muted nc-mgmt-table-note">
            Ventas, D1/D2 y verificadas: placeholders hasta Anexo A y métricas ERP ({period}).
          </p>
        </div>
      ) : null}

      {tab === "dia" ? (
        <div className="nc-mgmt-board-day">
          <div className="nc-portal-metrics">
            <StatTile label="Programadas hoy" value={String(dayTotals.prog)} />
            <StatTile label="Realizadas" value={String(dayTotals.done)} />
            <StatTile label="Pendientes" value={String(dayTotals.pend)} />
            <StatTile label="No realizadas" value={String(dayTotals.nr)} />
          </div>
          <div className="nc-portal-split">
            <div className="nc-portal-card">
              {byRtc.map((r) => (
                <div key={r.id} className="nc-mgmt-day-row">
                  <span>
                    <span className="nc-leader-link-title">{r.name}</span>
                    <span className="nc-portal-muted">Visitas abiertas: {r.visits}</span>
                  </span>
                  <span className="nc-mgmt-day-nums">
                    <strong>{r.visits}</strong>
                    <span className="nc-portal-muted">prog.</span>
                  </span>
                  <span className="nc-mgmt-day-nums success">
                    <strong>0</strong>
                    <span className="nc-portal-muted">hechas</span>
                  </span>
                  <span className="nc-mgmt-day-nums">
                    <strong>{r.visits}</strong>
                    <span className="nc-portal-muted">pend.</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="nc-portal-card">
              <h2 className="nc-portal-card-title">Línea de tiempo del día</h2>
              <p className="nc-portal-muted">Detalle por RTC — próximo paso con agenda del día.</p>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "producto" ? (
        <div className="nc-mgmt-prod-grid">
          {PRODUCT_STUB.map((p) => (
            <div key={p.id} className="nc-portal-card nc-mgmt-prod-card">
              <span className="nc-leader-link-title">{p.name}</span>
              <span className="nc-portal-muted">
                {p.cat} · {p.ai}
              </span>
              <div className="nc-mgmt-detail-grid">
                <div>
                  <span className="nc-portal-muted">Potencial</span>
                  <span>{p.pot}</span>
                </div>
                <div>
                  <span className="nc-portal-muted">Vendido (ERP)</span>
                  <span>{p.erp}</span>
                </div>
                <div>
                  <span className="nc-portal-muted">Conversión</span>
                  <span>{p.conv}</span>
                </div>
                <div>
                  <span className="nc-portal-muted">vs. mes anterior</span>
                  <span style={{ color: p.vrTone }}>{p.vr}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </LeaderPortalPage>
  )
}
