import { Link, useOutletContext } from "react-router-dom"
import type { SessionUser } from "@nc/domain"
import { Badge, ComplianceMeter, Format } from "@nc/ui"

type OutletCtx = { user: SessionUser }

export function MisNumerosScreen() {
  const { user } = useOutletContext<OutletCtx>()
  const pipelineOn = Boolean(user.features.pipeline)
  const now = new Date()
  const month = new Intl.DateTimeFormat("es-CO", { month: "long", timeZone: "America/Bogota" }).format(now)
  const day = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const left = Math.max(1, daysInMonth - day)

  const sales = 31_200_000
  const budget = 34_000_000
  const exp = budget * (day / daysInMonth)
  const falta = budget - sales
  const proj = (sales / day) * daysInMonth
  const deals = 17
  const visitsM = 61
  const ticket = sales / deals
  const rate = deals / visitsM
  const needDeals = Math.ceil(falta / ticket)
  const needVisits = Math.ceil(needDeals / rate)

  return (
    <>
      <header className="nc-campo-head">
        <div className="nc-campo-eyebrow">
          {month.charAt(0).toUpperCase() + month.slice(1)} · quedan {left} días hábiles
        </div>
        <h1>Mis números</h1>
      </header>

      <section className="nc-campo-page">
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
              <span>{Format.percent((sales / budget) * 100)}</span>
            </div>
            <div style={{ display: "grid", gap: 2 }}>
              <span>Te falta</span>
              <span>{Format.money(falta)}</span>
            </div>
          </div>
          <div style={{ display: "grid", gap: 4, borderTop: "1px solid var(--hairline)", paddingTop: "var(--space-3)" }}>
            <Badge tone="warning" icon="alert">
              A este ritmo no llegas a la meta
            </Badge>
            <span style={{ font: "var(--text-body)", color: "var(--ink-secondary)" }}>
              Cierras en {Format.percent((proj / budget) * 100)} · te quedarían faltando {Format.money(budget - proj)}.
            </span>
          </div>
          <div
            className="nc-campo-stat-grid"
            style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", borderTop: "1px solid var(--hairline)", paddingTop: "var(--space-3)" }}
          >
            <div style={{ display: "grid", gap: 2 }}>
              <span>Vendes al día</span>
              <span>{Format.money(sales / day)}</span>
            </div>
            <div style={{ display: "grid", gap: 2 }}>
              <span>Necesitas al día</span>
              <span>{Format.money(falta / left)}</span>
              <span style={{ font: "var(--text-caption)", color: "var(--warning)" }}>
                {Format.percent((falta / left / (sales / day) - 1) * 100)} más
              </span>
            </div>
          </div>
        </section>

        <section className="nc-campo-forecast-card">
          <span style={{ font: "var(--text-label)" }}>Para llegar a la meta</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ font: "800 40px/44px var(--font-sans)", color: "var(--primary)", fontVariantNumeric: "tabular-nums" }}>
              {needVisits}
            </span>
            <span style={{ font: "var(--text-body-lg)" }}>
              citas por agendar · {Math.ceil(needVisits / left)} por día
            </span>
          </div>
          <div className="nc-campo-stat-grid">
            <div style={{ display: "grid", gap: 2 }}>
              <span style={{ color: "var(--ink-secondary)" }}>Ticket promedio</span>
              <span style={{ font: "var(--text-label)" }}>{Format.money(ticket)}</span>
            </div>
            <div style={{ display: "grid", gap: 2 }}>
              <span style={{ color: "var(--ink-secondary)" }}>Tasa de cierre</span>
              <span style={{ font: "var(--text-label)" }}>{Format.percent(rate * 100)}</span>
            </div>
            <div style={{ display: "grid", gap: 2 }}>
              <span style={{ color: "var(--ink-secondary)" }}>Negocios que faltan</span>
              <span style={{ font: "var(--text-label)" }}>{needDeals}</span>
            </div>
          </div>
        </section>

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
          <span style={{ font: "var(--text-subtitle)" }}>¿Te alcanza el forecast?</span>
          <span style={{ font: "var(--text-body)", color: "var(--ink-secondary)" }}>
            Placeholder hasta conectar forecast en vivo.
          </span>
        </section>

        {pipelineOn ? (
          <section style={{ display: "grid", gap: "var(--space-2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <h2 className="nc-campo-section-title" style={{ margin: 0 }}>
                Mis oportunidades
              </h2>
              <Link className="nc-text-link" to="/numeros/oportunidades">
                Ver listado
              </Link>
            </div>
            <p style={{ font: "var(--text-body)", color: "var(--ink-secondary)", margin: 0 }}>
              Consulta el embudo comercial y el valor en juego por cliente.
            </p>
          </section>
        ) : null}
      </section>
    </>
  )
}
