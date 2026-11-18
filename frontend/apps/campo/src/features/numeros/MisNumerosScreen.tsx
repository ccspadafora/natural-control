import { useEffect, useState } from "react"
import { Link, useOutletContext } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { Badge, ComplianceMeter, Format } from "@nc/ui"

type OutletCtx = { user: SessionUser }

type MyNumbers = {
  sales: number
  budget: number
  expected: number
  falta: number
  visits_done: number
  visits_target: number
  deals: number
  day: number
  days_in_month: number
}

export function MisNumerosScreen() {
  const { user } = useOutletContext<OutletCtx>()
  const pipelineOn = Boolean(user.features.pipeline)
  const [data, setData] = useState<MyNumbers | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    api<MyNumbers>("/api/v1/metrics/my-numbers")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudieron cargar los números"))
  }, [])

  const now = new Date()
  const month = new Intl.DateTimeFormat("es-CO", { month: "long", timeZone: "America/Bogota" }).format(now)
  const day = data?.day ?? now.getDate()
  const daysInMonth = data?.days_in_month ?? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const left = Math.max(1, daysInMonth - day)

  const sales = data?.sales ?? 0
  const budget = data?.budget ?? 0
  const exp = data?.expected ?? (budget * day) / daysInMonth
  const falta = data?.falta ?? Math.max(0, budget - sales)
  const proj = day > 0 ? (sales / day) * daysInMonth : 0
  const deals = data?.deals || 1
  const visitsM = data?.visits_done || 1
  const ticket = sales / deals
  const rate = deals / visitsM
  const needDeals = ticket > 0 ? Math.ceil(falta / ticket) : 0
  const needVisits = rate > 0 ? Math.ceil(needDeals / rate) : 0

  return (
    <>
      <header className="nc-campo-head">
        <div className="nc-campo-eyebrow">
          {month.charAt(0).toUpperCase() + month.slice(1)} · quedan {left} días hábiles
        </div>
        <h1>Mis números</h1>
      </header>

      <section className="nc-campo-page">
        {error ? <p className="nc-note">{error}</p> : null}
        {!data && !error ? <p className="nc-kicker">Cargando…</p> : null}

        <ComplianceMeter label="Ventas · cumplimiento a la fecha" value={sales} target={budget} expected={exp} />

        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-4)",
            display: "grid",
            gap: "var(--space-3)",
          }}
        >
          <div className="nc-campo-stat-grid">
            <div style={{ display: "grid", gap: 2 }}>
              <span>Meta</span>
              <span>{Format.money(budget)}</span>
            </div>
            <div style={{ display: "grid", gap: 2 }}>
              <span>Llevas</span>
              <span>{budget ? Format.percent((sales / budget) * 100) : "—"}</span>
            </div>
            <div style={{ display: "grid", gap: 2 }}>
              <span>Te falta</span>
              <span>{Format.money(falta)}</span>
            </div>
          </div>
          <div style={{ display: "grid", gap: 4, borderTop: "1px solid var(--hairline)", paddingTop: "var(--space-3)" }}>
            <Badge tone={proj >= budget ? "success" : "warning"} icon="alert">
              {proj >= budget ? "Vas en ritmo de meta" : "A este ritmo no llegas a la meta"}
            </Badge>
            <span style={{ font: "var(--text-body)", color: "var(--ink-secondary)" }}>
              Cierras en {budget ? Format.percent((proj / budget) * 100) : "—"}
              {proj < budget ? ` · te quedarían faltando ${Format.money(budget - proj)}.` : "."}
            </span>
          </div>
          <div
            className="nc-campo-stat-grid"
            style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", borderTop: "1px solid var(--hairline)", paddingTop: "var(--space-3)" }}
          >
            <div style={{ display: "grid", gap: 2 }}>
              <span>Vendes al día</span>
              <span>{Format.money(day ? sales / day : 0)}</span>
            </div>
            <div style={{ display: "grid", gap: 2 }}>
              <span>Necesitas al día</span>
              <span>{Format.money(left ? falta / left : 0)}</span>
            </div>
          </div>
        </section>

        <section style={{ display: "grid", gap: "var(--space-2)" }}>
          <h2 className="nc-campo-section-title">Para llegar a la meta</h2>
          <p className="nc-campo-section-meta" style={{ margin: 0 }}>
            {needDeals} pedidos más · ~{needVisits} visitas · ticket {Format.money(ticket)}
          </p>
          <div className="nc-campo-stat-grid">
            <div style={{ display: "grid", gap: 2 }}>
              <span>Visitas del mes</span>
              <span>
                {visitsM}
                {data?.visits_target ? ` / ${data.visits_target}` : ""}
              </span>
            </div>
            <div style={{ display: "grid", gap: 2 }}>
              <span>Pedidos</span>
              <span>{deals}</span>
            </div>
          </div>
        </section>

        {pipelineOn ? (
          <Link to="/numeros/oportunidades" className="nc-campo-link-row">
            Ver oportunidades
          </Link>
        ) : null}
      </section>
    </>
  )
}
