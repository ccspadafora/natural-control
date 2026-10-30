import { useMemo, useState } from "react"
import ReactECharts from "echarts-for-react"
import type { SessionUser } from "@nc/domain"
import { Button, PageHead, StatTile, Tabs } from "@nc/ui"
import { LeaderPortalPage } from "../leader/LeaderPortalPage"
import { mgmtScopeWord } from "./shared/scope"
import { useRtcUsers } from "./shared/visits"

const FC_TABS = [
  { id: "rtc", label: "Por RTC" },
  { id: "producto", label: "Por producto" },
]

const MONTHS = ["Nov.", "Dic.", "Ene.", "Feb."]

export function ForecastPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [fcTab, setFcTab] = useState("rtc")
  const rtcs = useRtcUsers()

  const chartOption = useMemo(
    () => ({
      grid: { left: 8, right: 8, top: 24, bottom: 28, containLabel: true },
      tooltip: { trigger: "axis" },
      xAxis: { type: "category", data: MONTHS },
      yAxis: { type: "value", show: false },
      series: [
        { name: "Corto (0–30 d)", type: "bar", stack: "f", data: [42, 38, 35, 40], itemStyle: { color: "var(--chart-1)" } },
        { name: "Mediano (31–90)", type: "bar", stack: "f", data: [28, 30, 26, 22], itemStyle: { color: "var(--chart-3)" } },
        { name: "Largo (+90)", type: "bar", stack: "f", data: [18, 20, 16, 14], itemStyle: { color: "var(--chart-5)" } },
      ],
    }),
    [],
  )

  const rtcRows = useMemo(
    () =>
      rtcs.map((r, i) => ({
        name: `${r.first_name} ${r.last_name}`,
        zone: r.zone_name || "Sin zona",
        acc: `${72 + (i % 5) * 3} %`,
        opt: "$ 12,4 M",
        prob: "$ 9,8 M",
        com: "$ 7,2 M",
      })),
    [rtcs],
  )

  const prodRows = [
    { name: "Herbicida Selectivo 480 SL", opt: "$ 18,2 M", prob: "$ 14,1 M", com: "$ 10,6 M" },
    { name: "Fungicida Triazol 250 EC", opt: "$ 11,5 M", prob: "$ 8,9 M", com: "$ 6,4 M" },
    { name: "Insecticida Neonic 200 SC", opt: "$ 9,1 M", prob: "$ 7,2 M", com: "$ 5,1 M" },
  ]

  return (
    <LeaderPortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-page-head">
        <div className="nc-portal-hero">
          <span className="nc-portal-eyebrow">Noviembre 2026 a febrero 2027 · {mgmtScopeWord(user)}</span>
          <PageHead title="Forecast" />
        </div>
        <Button type="button" variant="secondary" disabled title="Próximo paso">
          Exportar a Excel
        </Button>
      </header>

      <div className="nc-portal-metrics">
        <StatTile label="Optimista" value="$ 1,68 MM" caption="Todo el potencial abierto" />
        <StatTile label="Probable" value="$ 1,31 MM" caption="Ponderado por conversión histórica" />
        <StatTile label="Comprometido" value="$ 980 M" caption="Cotizado o con pedido verbal" />
      </div>

      <div className="nc-portal-split">
        <div className="nc-portal-card">
          <h2 className="nc-portal-card-title">Por mes y horizonte</h2>
          <ReactECharts option={chartOption} style={{ height: 300 }} opts={{ renderer: "svg" }} />
          <div className="nc-mgmt-chart-legend">
            <span>
              <i className="nc-mgmt-swatch chart1" /> Corto (0–30 días)
            </span>
            <span>
              <i className="nc-mgmt-swatch chart3" /> Mediano (31–90)
            </span>
            <span>
              <i className="nc-mgmt-swatch chart5" /> Largo (+90)
            </span>
          </div>
        </div>

        <div className="nc-mgmt-forecast-side">
          <Tabs items={FC_TABS} value={fcTab} onChange={setFcTab} label="Forecast" />
          <div className="nc-portal-card nc-table-wrap">
            <table className="nc-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th className="nc-mgmt-num">Optimista</th>
                  <th className="nc-mgmt-num">Probable</th>
                  <th className="nc-mgmt-num">Comprometido</th>
                </tr>
              </thead>
              <tbody>
                {(fcTab === "rtc" ? rtcRows : prodRows).map((row) => (
                  <tr key={row.name}>
                    <td>
                      <div>{row.name}</div>
                      {"zone" in row ? <div className="nc-portal-muted">{row.zone} · acierto histórico {row.acc}</div> : null}
                    </td>
                    <td className="nc-mgmt-num">{row.opt}</td>
                    <td className="nc-mgmt-num">{row.prob}</td>
                    <td className="nc-mgmt-num">{row.com}</td>
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
