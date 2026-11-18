import { useEffect, useState } from "react"
import { Link, useNavigate, useOutletContext } from "react-router-dom"
import { api } from "@nc/api"
import type { SessionUser } from "@nc/domain"
import { applyTheme, Badge, Icon, readTheme, type NcTheme } from "@nc/ui"
import { useOutbox } from "../../offline"
import { planNotice, type Current } from "../../programacion"
import { isStandalone } from "./InstalarScreen"

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

type Scorecard = {
  player: {
    gen: number | null
    tier_name: string
    form_word: string
    chg: number
    attributes_scores: number[] | null
  }
  zone_rank: number | null
  zone_size: number
  attr_labels: { k: string; n: string }[]
}

export function YoScreen() {
  const { user, onLogout } = useOutletContext<{ user: SessionUser; onLogout: () => void }>()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<NcTheme>(() => readTheme())
  const [plan, setPlan] = useState<Current | null>(null)
  const [card, setCard] = useState<Scorecard | null>(null)
  const { pending } = useOutbox()

  useEffect(() => {
    api<Current>("/api/v1/weekly-plans/current").then(setPlan).catch(() => setPlan(null))
    api<Scorecard>("/api/v1/league/scorecards/me").then(setCard).catch(() => setCard(null))
  }, [])

  const planPending = Boolean(planNotice(plan))
  const planSent = plan?.plan && !plan.plan.editable && plan.plan.status !== "DEVUELTA"
  const webauthnOn = Boolean(user.features.webauthn)
  const mfaOn = Boolean(user.features.mfa)
  const gen = card?.player.gen
  const attrs =
    card?.player.attributes_scores?.map((v, i) => [card.attr_labels[i]?.k || `A${i}`, v] as const) ||
    ([
      ["VEN", "—"],
      ["CON", "—"],
      ["ACT", "—"],
      ["COB", "—"],
      ["CNF", "—"],
      ["DES", "—"],
    ] as const)
  const chg = card?.player.chg || 0
  const chgLabel = chg > 0 ? `Subiste ${chg}` : chg < 0 ? `Bajaste ${Math.abs(chg)}` : "Sin cambio"

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
              <span style={{ font: "800 52px/52px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>
                {gen == null ? "—" : gen}
              </span>
              <span className="nc-campo-eyebrow" style={{ textTransform: "uppercase", color: "var(--ink-secondary)" }}>
                {card?.player.tier_name || "Carta"}
              </span>
            </div>
            <div style={{ display: "grid", justifyItems: "end", gap: 2 }}>
              <span style={{ font: "var(--text-label)" }}>
                {card?.zone_rank != null
                  ? `Puesto ${card.zone_rank}${card.zone_size ? ` de ${card.zone_size}` : ""}`
                  : "Liga de zona"}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  font: "var(--text-caption)",
                  color: chg > 0 ? "var(--success)" : chg < 0 ? "var(--danger)" : "var(--ink-secondary)",
                }}
              >
                {chg > 0 ? <Icon name="arrowUp" small /> : null}
                {chg < 0 ? <Icon name="arrowDown" small /> : null}
                {chgLabel}
              </span>
            </div>
          </div>
          <div
            className="nc-campo-stat-grid"
            style={{ borderTop: "1px solid var(--hairline)", paddingTop: "var(--space-3)" }}
          >
            {attrs.map(([k, v]) => (
              <div key={k} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                <span style={{ font: "800 20px/24px var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>{v}</span>
                <span style={{ font: "var(--text-label)", color: "var(--ink-secondary)" }}>{k}</span>
              </div>
            ))}
          </div>
          <span style={{ font: "var(--text-caption)", color: "var(--ink-secondary)" }}>
            {card ? `Forma: ${card.player.form_word}` : "Sincroniza para ver tu carta de liga."}
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
            <span style={{ font: "var(--text-caption)", color: "var(--ink-secondary)" }}>
              {pending} {pending === 1 ? "pendiente" : "pendientes"}
            </span>
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
          <button type="button" onClick={() => navigate("/instalar")}>
            <Icon name="plus" />
            <span style={{ flex: 1 }}>Instalar la app</span>
            <span style={{ font: "var(--text-caption)", color: "var(--ink-secondary)" }}>
              {isStandalone() ? "Instalada" : "Acceso directo"}
            </span>
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
