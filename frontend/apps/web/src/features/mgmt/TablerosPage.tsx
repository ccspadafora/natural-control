import { useEffect, useMemo, useState } from "react"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge, Button, ComplianceMeter, Format, FilterPills, PageHead, Sheet, StatTile, Tabs } from "@nc/ui"
import { LeaderPortalPage } from "../leader/LeaderPortalPage"
import { CommercialCharts, ProductCharts } from "./components/BoardCharts"
import { d1FromPct, d1ToneToBg, moneyShort, pctLabel, syncAgo, type Period, type TeamProduct, type TeamRtc } from "./shared/metrics"
import { mgmtScopeWord } from "./shared/scope"
import { useTeamMetrics } from "./shared/useMetrics"

const PERIODS: { id: Period; label: string }[] = [
  { id: "mes", label: "Mes" },
  { id: "semana", label: "Semana" },
  { id: "dia", label: "Día" },
  { id: "anio", label: "Año" },
]

const PERIOD_CAPTION: Record<Period, string> = {
  mes: "Mes en curso",
  semana: "Semana en curso (lun–hoy)",
  dia: "Solo hoy",
  anio: "Año en curso",
}

const BOARD_TABS = [
  { id: "comercial", label: "Por comercial" },
  { id: "dia", label: "Del día" },
  { id: "producto", label: "Por producto" },
]

type RtcDetail = {
  daily: { date: string; prog: number; done: number }[]
  results: { label: string; pct: number; count: number }[]
  effectiveness_pct: number | null
}

type ProductDetail = {
  zones: { zone: string; potential: number; concretado: number }[]
  top_sellers: { name: string; concretado: number }[]
}

function RtcSheet({ rtc, onClose }: { rtc: TeamRtc | null; onClose: () => void }) {
  const [detail, setDetail] = useState<RtcDetail | null>(null)
  useEffect(() => {
    if (!rtc) return
    setDetail(null)
    api<RtcDetail>(`/api/v1/metrics/rtcs/${rtc.id}/detail`)
      .then(setDetail)
      .catch(() => setDetail({ daily: [], results: [], effectiveness_pct: null }))
  }, [rtc?.id])
  if (!rtc) return null
  const d1 = d1FromPct(rtc.d1_pct)
  const daily = detail?.daily ?? []
  const maxProg = Math.max(...daily.map((d) => d.prog), 1)
  return (
    <Sheet open title={rtc.name} onClose={onClose} className="nc-sheet">
      <span className="nc-portal-muted">{rtc.zone || "Sin zona"}</span>
      <span className="nc-portal-actions">
        <Badge tone={d1.tone === "success" ? "success" : d1.tone === "danger" ? "danger" : "warning"}>D1 {d1.label}</Badge>
        <Badge tone="neutral">Última sincronización · {syncAgo(rtc.last_sync_at)}</Badge>
      </span>
      <ComplianceMeter label="Ventas · D1" value={rtc.sales} target={rtc.budget} expected={rtc.expected} />
      <div className="nc-portal-metrics">
        <StatTile label="D2 proyectado al cierre" value={pctLabel(rtc.d2_pct)} caption="Sobre la meta del período" />
        <StatTile label="Cobertura de cartera" value={pctLabel(rtc.coverage_pct)} caption="Clientes visitados en 30 días" />
        <StatTile label="Efectividad de visitas" value={pctLabel(detail?.effectiveness_pct ?? null)} caption="Visitas con resultado comercial" />
        <StatTile label="Verificadas por GPS" value={pctLabel(rtc.verified_pct)} caption="Geolocalización" />
      </div>
      <div className="nc-sheet-section">
        <h3>Visitas por día · últimas 2 semanas</h3>
        <span className="nc-portal-muted">Barra llena: realizadas · fondo: programadas</span>
        {daily.length === 0 ? (
          <p className="nc-portal-muted">Sin visitas en el período.</p>
        ) : (
          <div className="nc-sheet-bars" aria-hidden>
            {daily.map((d) => (
              <span key={d.date} className="nc-sheet-bar" style={{ height: `${(d.prog / maxProg) * 100}%` }}>
                <span style={{ height: `${d.prog > 0 ? (d.done / d.prog) * 100 : 0}%` }} />
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="nc-sheet-section">
        <h3>Resultado de las visitas</h3>
        {(detail?.results ?? []).length === 0 ? (
          <p className="nc-portal-muted">Sin resultados registrados este mes.</p>
        ) : (
          detail!.results.map((row) => (
            <div key={row.label} className="nc-sheet-row">
              <span>{row.label}</span>
              <strong>{row.pct} %</strong>
            </div>
          ))
        )}
      </div>
      <Button type="button" variant="secondary" onClick={onClose}>
        Cerrar
      </Button>
    </Sheet>
  )
}

function ProductSheet({ product, onClose }: { product: TeamProduct | null; onClose: () => void }) {
  const [detail, setDetail] = useState<ProductDetail | null>(null)
  useEffect(() => {
    if (!product) return
    setDetail(null)
    api<ProductDetail>(`/api/v1/metrics/products/${product.id}/detail`)
      .then(setDetail)
      .catch(() => setDetail({ zones: [], top_sellers: [] }))
  }, [product?.id])
  if (!product) return null
  return (
    <Sheet open title={product.name} onClose={onClose} className="nc-sheet">
      <span className="nc-portal-muted">{[product.category, product.active_ingredient].filter(Boolean).join(" · ") || "—"}</span>
      <div className="nc-portal-metrics">
        <StatTile label="Potencial" value={moneyShort(product.potential)} />
        <StatTile label="Concretado" value={moneyShort(product.concretado)} />
        <StatTile label="Conversión" value={pctLabel(product.conversion)} />
      </div>
      <div className="nc-sheet-section">
        <h3>Potencial y venta por zona</h3>
        {(detail?.zones ?? []).length === 0 ? (
          <p className="nc-portal-muted">Sin datos por zona.</p>
        ) : (
          detail!.zones.map((z) => (
            <div key={z.zone} className="nc-sheet-row">
              <span>{z.zone}</span>
              <span className="nc-portal-muted">
                Potencial {moneyShort(z.potential)} · Venta {moneyShort(z.concretado)}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="nc-sheet-section">
        <h3>Quién más lo vende</h3>
        {(detail?.top_sellers ?? []).length === 0 ? (
          <p className="nc-portal-muted">Sin ventas concretadas.</p>
        ) : (
          detail!.top_sellers.map((s) => (
            <div key={s.name} className="nc-sheet-row">
              <span>{s.name}</span>
              <strong>{moneyShort(Math.round(s.concretado))}</strong>
            </div>
          ))
        )}
      </div>
      <Button type="button" variant="secondary" onClick={onClose}>
        Cerrar
      </Button>
    </Sheet>
  )
}

function conversionTone(pct: number | null): "success" | "warning" | "danger" | "neutral" {
  if (pct == null) return "neutral"
  if (pct >= 40) return "success"
  if (pct >= 15) return "warning"
  return "danger"
}

export function TablerosPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const [period, setPeriod] = useState<Period>("mes")
  const [tab, setTab] = useState("comercial")
  const [rtcId, setRtcId] = useState<string | null>(null)
  const [productId, setProductId] = useState<string | null>(null)
  const { data, error, loading } = useTeamMetrics(period)
  const rtcs = data?.rtcs ?? []
  const products = data?.products ?? []
  const selectedRtc = rtcs.find((r) => r.id === rtcId) ?? null
  const selectedProduct = products.find((p) => p.id === productId) ?? null

  const dayTotals = useMemo(
    () =>
      rtcs.reduce(
        (acc, r) => ({
          prog: acc.prog + r.day.programadas,
          done: acc.done + r.day.realizadas,
          pend: acc.pend + r.day.pendientes,
          nr: acc.nr + r.day.no_realizadas,
        }),
        { prog: 0, done: 0, pend: 0, nr: 0 },
      ),
    [rtcs],
  )

  const periodDays = data?.days_in_month ?? 30
  const periodDay = data?.day ?? 1

  return (
    <LeaderPortalPage user={user} onLogout={onLogout}>
      <header className="nc-portal-page-head">
        <div className="nc-portal-hero">
          <span className="nc-portal-eyebrow">
            {mgmtScopeWord(user)} · {PERIOD_CAPTION[period]}
          </span>
          <PageHead title="Tableros" />
        </div>
        <FilterPills items={PERIODS} value={period} onChange={(id) => setPeriod(id as Period)} />
      </header>

      <Tabs items={BOARD_TABS} value={tab} onChange={setTab} label="Tableros" />

      {error ? <p className="nc-note">{error}</p> : null}
      {loading && !data ? <p className="nc-portal-muted">Cargando tableros…</p> : null}

      {data ? (
        <div className="nc-portal-metrics">
          <StatTile label="Ventas del período" value={moneyShort(data.totals.sales)} caption={PERIOD_CAPTION[period]} />
          <StatTile
            label="Meta prorrateada"
            value={moneyShort(data.totals.budget)}
            caption={`Esperado a hoy ${moneyShort(data.totals.expected)}`}
          />
          <StatTile
            label="Visitas"
            value={`${data.totals.visits_done}${data.totals.visits_target ? ` / ${data.totals.visits_target}` : ""}`}
            caption="Realizadas vs meta del período"
          />
          <StatTile label="GPS verificado" value={pctLabel(data.totals.gps_verified_pct)} caption="Cierres con GPS ok" />
        </div>
      ) : null}

      {tab === "comercial" ? (
        <div className="nc-mgmt-board-stack">
          <CommercialCharts rtcs={rtcs} />
          <div className="nc-portal-card nc-table-wrap nc-mgmt-table-click">
            <div className="nc-mgmt-board-table-head">
              <h2 className="nc-portal-card-title">Detalle por comercial</h2>
              <p className="nc-portal-muted">Haz clic en una fila para abrir el desglose.</p>
            </div>
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
                {rtcs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="nc-empty">
                      No hay comerciales en tu alcance.
                    </td>
                  </tr>
                ) : (
                  rtcs.map((r) => {
                    const d1 = d1FromPct(r.d1_pct)
                    const onPace = r.visits_target > 0 && r.visits_done >= r.visits_target * (periodDay / periodDays)
                    return (
                      <tr key={r.id} tabIndex={0} onClick={() => setRtcId(r.id)} onKeyDown={(e) => e.key === "Enter" && setRtcId(r.id)}>
                        <td>
                          <div>{r.name}</div>
                          <div className="nc-portal-muted">{r.zone || "Sin zona"}</div>
                        </td>
                        <td className="nc-mgmt-num">{Format.money(r.sales)}</td>
                        <td className="nc-mgmt-num">
                          <span className="nc-mgmt-d1-pill" style={{ background: d1ToneToBg(d1.tone) }}>
                            {d1.label}
                          </span>
                        </td>
                        <td className="nc-mgmt-num">{pctLabel(r.d2_pct)}</td>
                        <td>
                          <span>
                            {r.visits_done}
                            {r.visits_target > 0 ? ` / ${r.visits_target}` : ""}
                          </span>{" "}
                          <Badge tone={r.visits_target === 0 ? "neutral" : onPace ? "success" : "warning"}>
                            {r.visits_target === 0 ? "Sin meta" : onPace ? "Al día" : "Atrasada"}
                          </Badge>
                        </td>
                        <td className="nc-mgmt-num">{pctLabel(r.verified_pct)}</td>
                        <td className="nc-mgmt-num">{pctLabel(r.coverage_pct)}</td>
                        <td className="nc-portal-muted">{syncAgo(r.last_sync_at)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
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
              {rtcs.length === 0 ? <p className="nc-portal-muted">No hay comerciales en tu alcance.</p> : null}
              {rtcs.map((r) => (
                <div
                  key={r.id}
                  className="nc-mgmt-day-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => setRtcId(r.id)}
                  onKeyDown={(e) => e.key === "Enter" && setRtcId(r.id)}
                >
                  <span>
                    <span className="nc-leader-link-title">{r.name}</span>
                    <span className="nc-portal-muted">No realizadas: {r.day.no_realizadas}</span>
                  </span>
                  <span className="nc-mgmt-day-nums">
                    <strong>{r.day.programadas}</strong>
                    <span className="nc-portal-muted">prog.</span>
                  </span>
                  <span className="nc-mgmt-day-nums success">
                    <strong>{r.day.realizadas}</strong>
                    <span className="nc-portal-muted">hechas</span>
                  </span>
                  <span className="nc-mgmt-day-nums">
                    <strong>{r.day.pendientes}</strong>
                    <span className="nc-portal-muted">pend.</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="nc-portal-card">
              <h2 className="nc-portal-card-title">Detalle del día</h2>
              <p className="nc-portal-muted">Revisa cada visita, con su GPS y lo concretado, en Visitas en vivo.</p>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "producto" ? (
        <div className="nc-mgmt-board-stack">
          <ProductCharts products={products} />
          <div className="nc-mgmt-prod-grid">
            {products.length === 0 ? <p className="nc-portal-muted">Aún no hay productos con potencial en este período.</p> : null}
            {products.map((p) => {
              const conv = p.conversion ?? 0
              const max = Math.max(p.potential, p.concretado, 1)
              return (
                <div
                  key={p.id}
                  className="nc-portal-card nc-mgmt-prod-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => setProductId(p.id)}
                  onKeyDown={(e) => e.key === "Enter" && setProductId(p.id)}
                >
                  <div className="nc-mgmt-prod-card-head">
                    <span className="nc-leader-link-title">{p.name}</span>
                    <Badge tone={conversionTone(p.conversion)}>{pctLabel(p.conversion)}</Badge>
                  </div>
                  <span className="nc-portal-muted">{[p.category, p.active_ingredient].filter(Boolean).join(" · ") || "—"}</span>
                  <div className="nc-mgmt-prod-bars" aria-hidden>
                    <div className="nc-mgmt-prod-bar-row">
                      <span>Potencial</span>
                      <strong>{moneyShort(p.potential)}</strong>
                    </div>
                    <div className="nc-mgmt-prod-track">
                      <span className="nc-mgmt-prod-fill is-potential" style={{ width: `${(p.potential / max) * 100}%` }} />
                    </div>
                    <div className="nc-mgmt-prod-bar-row">
                      <span>Concretado</span>
                      <strong>{moneyShort(p.concretado)}</strong>
                    </div>
                    <div className="nc-mgmt-prod-track">
                      <span className="nc-mgmt-prod-fill is-sold" style={{ width: `${(p.concretado / max) * 100}%` }} />
                    </div>
                    <div className="nc-mgmt-prod-bar-row">
                      <span>Conversión</span>
                      <strong>{pctLabel(p.conversion)}</strong>
                    </div>
                    <div className="nc-mgmt-prod-track">
                      <span className="nc-mgmt-prod-fill is-conv" style={{ width: `${Math.min(100, conv)}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
      <RtcSheet rtc={selectedRtc} onClose={() => setRtcId(null)} />
      <ProductSheet product={selectedProduct} onClose={() => setProductId(null)} />
    </LeaderPortalPage>
  )
}
