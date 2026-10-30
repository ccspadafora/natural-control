import { NavLink, Outlet, useLocation } from "react-router-dom"
import type { SessionUser } from "@nc/domain"
import { Icon } from "@nc/ui"

type Props = {
  user: SessionUser
  onLogout: () => void
  planPending?: boolean
}

const TABS = [
  { to: "/", end: true, label: "Hoy", icon: "home" as const },
  { to: "/clientes", label: "Clientes", icon: "users" as const },
  { to: "/numeros", label: "Mis números", icon: "funnel" as const },
  { to: "/yo", label: "Yo", icon: "user" as const },
]

/** Bottom nav del prototipo App Campo: Hoy · Clientes · Mis números · Yo. */
function showBottomNav(pathname: string) {
  if (pathname.startsWith("/visitas/")) return false
  if (pathname.startsWith("/clientes/")) return false
  if (pathname.startsWith("/programacion")) return false
  if (pathname === "/sincronizacion") return false
  return ["/", "/clientes", "/numeros", "/yo"].includes(pathname) || pathname.startsWith("/numeros/")
}

export function CampoShell({ user, onLogout, planPending = false }: Props) {
  const { pathname } = useLocation()
  const tabs = showBottomNav(pathname)

  return (
    <div className="nc-campo">
      <div className="nc-campo-body" style={tabs ? undefined : { paddingBottom: "var(--space-4)" }}>
        <Outlet context={{ user, onLogout }} />
      </div>
      {tabs ? (
      <nav className="nc-campo-tabs" aria-label="Principal">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => (isActive ? "nc-campo-tab is-active" : "nc-campo-tab")}
          >
            <span className="nc-campo-tab-icon">
              <Icon name={t.icon} />
              {t.to === "/yo" && planPending ? <span className="nc-campo-dot" aria-label="Programación pendiente" /> : null}
            </span>
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
      ) : null}
    </div>
  )
}
