import { useEffect, useRef } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router-dom"
import type { SessionUser } from "@nc/domain"
import { Icon } from "@nc/ui"
import { haptic } from "../shared/haptics"

type Props = {
  user: SessionUser
  onLogout: () => void
  planPending?: boolean
  installNudge?: boolean
  onDismissInstall?: () => void
}

const TABS = [
  { to: "/", end: true, label: "Hoy", icon: "home" as const },
  { to: "/clientes", label: "Clientes", icon: "users" as const },
  { to: "/numeros", label: "Mis números", icon: "funnel" as const },
  { to: "/yo", label: "Yo", icon: "user" as const },
]

function showBottomNav(pathname: string) {
  if (pathname.startsWith("/visitas/")) return false
  if (pathname.startsWith("/clientes/")) return false
  if (pathname.startsWith("/programacion")) return false
  if (pathname === "/sincronizacion" || pathname === "/instalar") return false
  return ["/", "/clientes", "/numeros", "/yo"].includes(pathname) || pathname.startsWith("/numeros/")
}

function flushMain(pathname: string) {
  return pathname.startsWith("/visitas/") || pathname.startsWith("/clientes/")
}

export function CampoShell({
  user,
  onLogout,
  planPending = false,
  installNudge = false,
  onDismissInstall,
}: Props) {
  const { pathname } = useLocation()
  const tabs = showBottomNav(pathname)
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual"
    }
  }, [])

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="nc-campo">
      {installNudge ? (
        <div className="nc-campo-install-nudge" role="status">
          <span>Instala Campo en tu celular para usarla como app.</span>
          <Link to="/instalar" onClick={() => onDismissInstall?.()}>
            Ver cómo
          </Link>
          <button type="button" onClick={() => onDismissInstall?.()}>
            Ahora no
          </button>
        </div>
      ) : null}
      <main
        ref={mainRef}
        className={flushMain(pathname) ? "nc-campo-main nc-campo-main--flush" : "nc-campo-main"}
        style={tabs ? undefined : { paddingBottom: "calc(var(--space-4) + env(safe-area-inset-bottom))" }}
      >
        <Outlet context={{ user, onLogout }} />
      </main>
      {tabs ? (
        <nav className="nc-campo-tabs" aria-label="Principal">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              onClick={() => haptic("light")}
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
