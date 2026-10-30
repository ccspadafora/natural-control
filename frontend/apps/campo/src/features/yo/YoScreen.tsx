import { Link, useNavigate, useOutletContext } from "react-router-dom"
import type { SessionUser } from "@nc/domain"
import { applyTheme, Badge, Icon, readTheme, type NcTheme } from "@nc/ui"
import { planNotice, type Current } from "../../programacion"
import { useEffect, useState } from "react"
import { api } from "@nc/api"

const ATTRS = [
  ["VEN", 90],
  ["CON", 86],
  ["ACT", 88],
  ["COB", 90],
  ["CNF", 95],
  ["DES", 79],
] as const

const THEME_LABEL: Record<NcTheme, string> = {
  dark: "Oscuro",
  light: "Claro",
  sol: "Sol (exteriores)",
}

function nextTheme(current: NcTheme): NcTheme {
  if (current === "dark") return "sol"
  if (current === "sol") return "light"
  return "dark"
}

export function YoScreen() {
  const { user, onLogout } = useOutletContext<{ user: SessionUser; onLogout: () => void }>()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<NcTheme>(() => readTheme())
  const [plan, setPlan] = useState<Current | null>(null)

  useEffect(() => {
    api<Current>("/api/v1/weekly-plans/current").then(setPlan).catch(() => setPlan(null))
  }, [])

  const planPending = Boolean(planNotice(plan))
  const planSent = plan?.plan && !plan.plan.editable && plan.plan.status !== "DEVUELTA"
  const webauthnOn = Boolean(user.features.webauthn)
  const mfaOn = Boolean(user.features.mfa)

  return (
    <>
      <header className="nc-campo-head">
        <div className="nc-campo-eyebrow">RTC · {user.scope || "Campo"}</div>
        <h1>
          {user.first_name} {user.last_name}
        </h1>
      </header>

      <section className="nc-campo-page">
        <div className="nc-campo-player">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "grid" }}>
              <span style={{ font: "800 52px/52px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>88</span>
              <span className="nc-campo-eyebrow" style={{ textTransform: "uppercase", color: "var(--ink-secondary)" }}>
                Nivel Oro
              </span>
            </div>
            <div style={{ display: "grid", justifyItems: "end", gap: 2 }}>
              <span style={{ font: "var(--text-label)" }}>Puesto 2 de 5</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, font: "var(--text-caption)", color: "var(--success)" }}>
                <Icon name="arrowUp" small />
                Subiste 1 puesto
              </span>
            </div>
          </div>
          <div
            className="nc-campo-stat-grid"
            style={{ borderTop: "1px solid var(--hairline)", paddingTop: "var(--space-3)" }}
          >
            {ATTRS.map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                <span style={{ font: "800 20px/24px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{v}</span>
                <span style={{ font: "var(--text-label)", color: "var(--ink-secondary)" }}>{k}</span>
              </div>
            ))}
          </div>
          <span style={{ font: "var(--text-caption)", color: "var(--ink-secondary)" }}>
            Carta de jugador en construcción. Los atributos son referencia del prototipo.
          </span>
        </div>

        <div className="nc-campo-menu">
          <Link to="/programacion">
            <Icon name="calendar" />
            <span style={{ flex: 1 }}>Programación semanal</span>
            {planPending ? <Badge tone="accent">Por enviar</Badge> : null}
            {planSent ? <Badge tone="success">Enviada</Badge> : null}
          </Link>
          <button type="button" onClick={() => navigate("/sincronizacion")}>
            <Icon name="refresh" />
            <span style={{ flex: 1 }}>Sincronización</span>
            <span style={{ font: "var(--text-caption)", color: "var(--ink-secondary)" }}>0 pendientes</span>
          </button>
          <button type="button" disabled={!webauthnOn}>
            <Icon name="target" />
            <span style={{ flex: 1 }}>Biometría</span>
            {webauthnOn ? (
              <span style={{ font: "var(--text-caption)", color: "var(--ink-secondary)" }}>Configurar</span>
            ) : (
              <Badge tone="neutral">Próximamente</Badge>
            )}
          </button>
          <button type="button" disabled={!mfaOn}>
            <Icon name="settings" />
            <span style={{ flex: 1 }}>Doble factor (MFA)</span>
            {mfaOn ? (
              <span style={{ font: "var(--text-caption)", color: "var(--ink-secondary)" }}>Configurar</span>
            ) : (
              <Badge tone="neutral">Próximamente</Badge>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              const next = nextTheme(theme)
              applyTheme(next)
              setTheme(next)
            }}
          >
            <Icon name="target" />
            <span style={{ flex: 1 }}>Tema</span>
            <span style={{ font: "var(--text-caption)", color: "var(--ink-secondary)" }}>{THEME_LABEL[theme]}</span>
          </button>
          <button type="button" className="is-danger" onClick={onLogout}>
            <Icon name="x" />
            <span style={{ flex: 1 }}>Cerrar sesión</span>
          </button>
        </div>
      </section>
    </>
  )
}
