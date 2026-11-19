import { useMemo } from "react"
import ReactECharts from "echarts-for-react"
import { Format } from "@nc/ui"
import { moneyShort, type TeamProduct, type TeamRtc } from "../shared/metrics"

const AXIS = "#9aa6b8"
const SPLIT = "rgba(255,255,255,0.06)"

function shortName(name: string, max = 16) {
  const clean = name.trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1)}…`
}

export function CommercialCharts({ rtcs }: { rtcs: TeamRtc[] }) {
  const ranked = useMemo(() => [...rtcs].sort((a, b) => b.sales - a.sales).slice(0, 10), [rtcs])
  const withSales = ranked.filter((r) => r.sales > 0)
  const withD1 = ranked.filter((r) => r.d1_pct != null)

  const salesOption = useMemo(
    () => ({
      color: ["#4c8dff"],
      grid: { left: 8, right: 28, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v: number) => Format.money(v),
      },
      xAxis: {
        type: "value",
        axisLabel: { color: AXIS, formatter: (v: number) => moneyShort(v) },
        splitLine: { lineStyle: { color: SPLIT } },
        axisLine: { show: false },
      },
      yAxis: {
        type: "category",
        data: withSales.map((r) => shortName(r.name)).reverse(),
        axisLabel: { color: AXIS },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          type: "bar",
          data: withSales.map((r) => r.sales).reverse(),
          barMaxWidth: 18,
          itemStyle: { borderRadius: [0, 6, 6, 0], color: "#4c8dff" },
          label: {
            show: true,
            position: "right",
            color: AXIS,
            formatter: ({ value }: { value: number }) => moneyShort(value),
          },
        },
      ],
    }),
    [withSales],
  )

  const d1Option = useMemo(
    () => ({
      color: ["#3dd68c", "#f0a202", "#f07178"],
      grid: { left: 8, right: 28, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v: number) => `${v} %`,
      },
      xAxis: {
        type: "value",
        max: (extent: { max: number }) => Math.max(120, Math.ceil(extent.max / 10) * 10),
        axisLabel: { color: AXIS, formatter: (v: number) => `${v}%` },
        splitLine: { lineStyle: { color: SPLIT } },
        axisLine: { show: false },
      },
      yAxis: {
        type: "category",
        data: withD1.map((r) => shortName(r.name)).reverse(),
        axisLabel: { color: AXIS },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          type: "bar",
          data: withD1
            .map((r) => {
              const v = r.d1_pct ?? 0
              const color = v >= 85 ? "#3dd68c" : v >= 70 ? "#f0a202" : "#f07178"
              return { value: v, itemStyle: { color, borderRadius: [0, 6, 6, 0] } }
            })
            .reverse(),
          barMaxWidth: 18,
          markLine: {
            silent: true,
            symbol: "none",
            label: { formatter: "85%", color: AXIS },
            lineStyle: { color: "#3dd68c", type: "dashed" },
            data: [{ xAxis: 85 }],
          },
          label: {
            show: true,
            position: "right",
            color: AXIS,
            formatter: ({ value }: { value: number }) => `${value}%`,
          },
        },
      ],
    }),
    [withD1],
  )

  if (rtcs.length === 0) return null

  return (
    <div className="nc-mgmt-board-charts">
      <div className="nc-portal-card">
        <h2 className="nc-portal-card-title">Ventas por comercial</h2>
        <p className="nc-portal-muted">Quién está aportando más venta concretada en el período.</p>
        {withSales.length === 0 ? (
          <p className="nc-portal-muted">Sin ventas concretadas en este período.</p>
        ) : (
          <ReactECharts option={salesOption} style={{ height: Math.max(220, withSales.length * 36) }} opts={{ renderer: "svg" }} />
        )}
      </div>
      <div className="nc-portal-card">
        <h2 className="nc-portal-card-title">Ritmo D1 vs meta</h2>
        <p className="nc-portal-muted">100 % = al día con la meta prorrateada. Línea en 85 %.</p>
        {withD1.length === 0 ? (
          <p className="nc-portal-muted">Sin meta o sin datos de ritmo en este período.</p>
        ) : (
          <ReactECharts option={d1Option} style={{ height: Math.max(220, withD1.length * 36) }} opts={{ renderer: "svg" }} />
        )}
      </div>
    </div>
  )
}

export function ProductCharts({ products }: { products: TeamProduct[] }) {
  const ranked = useMemo(() => [...products].sort((a, b) => b.potential - a.potential).slice(0, 8), [products])

  const mixOption = useMemo(
    () => ({
      color: ["#7aa2f7", "#3dd68c"],
      legend: { top: 0, textStyle: { color: AXIS } },
      grid: { left: 8, right: 16, top: 36, bottom: 8, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v: number) => Format.money(v),
      },
      xAxis: {
        type: "category",
        data: ranked.map((p) => shortName(p.name, 12)),
        axisLabel: { color: AXIS, interval: 0, rotate: ranked.length > 5 ? 25 : 0 },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: SPLIT } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: AXIS, formatter: (v: number) => moneyShort(v) },
        splitLine: { lineStyle: { color: SPLIT } },
        axisLine: { show: false },
      },
      series: [
        {
          name: "Potencial",
          type: "bar",
          data: ranked.map((p) => p.potential),
          barMaxWidth: 22,
          itemStyle: { borderRadius: [6, 6, 0, 0], color: "#7aa2f7" },
        },
        {
          name: "Concretado",
          type: "bar",
          data: ranked.map((p) => p.concretado),
          barMaxWidth: 22,
          itemStyle: { borderRadius: [6, 6, 0, 0], color: "#3dd68c" },
        },
      ],
    }),
    [ranked],
  )

  const conversionOption = useMemo(
    () => ({
      grid: { left: 8, right: 28, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        valueFormatter: (v: number) => `${v} %`,
      },
      xAxis: {
        type: "value",
        max: 100,
        axisLabel: { color: AXIS, formatter: (v: number) => `${v}%` },
        splitLine: { lineStyle: { color: SPLIT } },
        axisLine: { show: false },
      },
      yAxis: {
        type: "category",
        data: ranked.map((p) => shortName(p.name, 14)).reverse(),
        axisLabel: { color: AXIS },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          type: "bar",
          data: ranked
            .map((p) => {
              const v = p.conversion ?? 0
              const color = v >= 40 ? "#3dd68c" : v >= 15 ? "#f0a202" : "#f07178"
              return { value: v, itemStyle: { color, borderRadius: [0, 6, 6, 0] } }
            })
            .reverse(),
          barMaxWidth: 16,
          label: {
            show: true,
            position: "right",
            color: AXIS,
            formatter: ({ value }: { value: number }) => `${value}%`,
          },
        },
      ],
    }),
    [ranked],
  )

  if (products.length === 0) return null

  return (
    <div className="nc-mgmt-board-charts">
      <div className="nc-portal-card">
        <h2 className="nc-portal-card-title">Potencial vs concretado</h2>
        <p className="nc-portal-muted">Dónde hay pipeline abierto y qué ya se cerró.</p>
        <ReactECharts option={mixOption} style={{ height: 300 }} opts={{ renderer: "svg" }} />
      </div>
      <div className="nc-portal-card">
        <h2 className="nc-portal-card-title">Conversión por producto</h2>
        <p className="nc-portal-muted">% del potencial que ya se concretó en el período.</p>
        <ReactECharts option={conversionOption} style={{ height: Math.max(240, ranked.length * 34) }} opts={{ renderer: "svg" }} />
      </div>
    </div>
  )
}
