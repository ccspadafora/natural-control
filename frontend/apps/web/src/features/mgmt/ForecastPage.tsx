import { useMemo, useState } from "react"
import ReactECharts from "echarts-for-react"
import type { SessionUser } from "@nc/domain"
import { Button, Format, PageHead, StatTile, Tabs } from "@nc/ui"
import { LeaderPortalPage } from "../leader/LeaderPortalPage"
import { monthLong, monthShort, moneyShort, type ForecastLine, type ForecastRtc } from "./shared/metrics"
import { mgmtScopeWord } from "./shared/scope"
import { useExport, useForecast } from "./shared/useMetrics"

const FC_TABS = [
  { id: "rtc", label: "Por RTC" },
  { id: "producto", label: "Por producto" },
]

export function ForecastPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [fcTab, setFcTab] = useState("rtc")
  const { data, error, loading } = useForecast(4)
  const exporter = useExport()
  const canExport = user.permissions.includes("forecast.view")

  const months = data?.by_month ?? []
  const range = months.length > 0 ? `${monthLong(months[0].month)} a ${monthLong(months[months.length - 1].month)}` : "Próximos meses"

  const chartOption = useMemo(
    () => ({
      grid: { left: 8, right: 8, top: 24, bottom: 28, containLabel: true },
      tooltip: { trigger: "axis", valueFormatter: (v: number) => Format.money(v) },
      xAxis: { type: "category", data: months.map((m) => monthShort(m.month)) },
      yAxis: { type: "value", show: false },
      series: [
        { name: "Corto (0–30 d)", type: "bar", stack: "f", data: months.map((m) => m.corto), itemStyle: { color: "var(--chart-1)" } },
        { name: "Mediano (31–90)", type: "bar", stack: "f", data: months.map((m) => m.mediano), itemStyle: { color: "var(--chart-3)" } },
        { name: "Largo (+90)", type: "bar", stack: "f", data: months.map((m) => m.largo), itemStyle: { color: "var(--chart-5)" } },
      ],
    }),
    [months],
  )

  const rtcRows: ForecastRtc[] = data?.by_rtc ?? []
  const productRows: ForecastLine[] = data?.by_product ?? []
  const rows: Array<ForecastLine | ForecastRtc> = fcTab === "rtc" ? rtcRows : productRows

  return (
    <LeaderPortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-page-head">
        <div className="nc-portal-hero">
          <span className="nc-portal-eyebrow">
            {range} · {mgmtScopeWord(user)}
          </span>
          <PageHead title="Forecast" />
        </div>
        {canExport ? (
          <Button type="button" variant="secondary" disabled={exporter.busy} onClick={() => void exporter.start("FORECAST_XLSX")}>
            {exporter.busy ? "Generando…" : "Exportar a Excel"}
          </Button>
        ) : null}
      </header>

      {error ? <p className="nc-note">{error}</p> : null}
      {exporter.error ? <p className="nc-note">{exporter.error}</p> : null}
      {loading && !data ? <p className="nc-portal-muted">Cargando forecast…</p> : null}

      <div className="nc-portal-metrics">
        <StatTile label="Optimista" value={data ? moneyShort(data.totals.optimistic) : "—"} caption="Todo el potencial abierto" />
        <StatTile label="Probable" value={data ? moneyShort(data.totals.probable) : "—"} caption="Ponderado por conversión histórica" />
        <StatTile label="Comprometido" value={data ? moneyShort(data.totals.committed) : "—"} caption="Cotizado o con pedido verbal" />
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
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="nc-empty">
                      Sin potencial abierto.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const isRtc = "zone" in row
                    return (
                      <tr key={row.id}>
                        <td>
                          <div>{row.name}</div>
                          {isRtc ? (
                            <div className="nc-portal-muted">
                              {row.zone || "Sin zona"}
                              {row.hit_rate != null ? ` · acierto histórico ${Format.percent(row.hit_rate)}` : ""}
                            </div>
                          ) : null}
                        </td>
                        <td className="nc-mgmt-num">{moneyShort(row.optimistic)}</td>
                        <td className="nc-mgmt-num">{moneyShort(row.probable)}</td>
                        <td className="nc-mgmt-num">{moneyShort(row.committed)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </LeaderPortalPage>
  )
}
