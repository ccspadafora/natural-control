import { ReactNode, useMemo, useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import type { SessionUser } from "@nc/domain"
import { Button, Icon, applyTheme, readTheme, type NcTheme } from "@nc/ui"
import { isDemoMode } from "@nc/api"
import { navFor } from "./nav"

type Props = {
  user: SessionUser
  geoPending?: number
  live?: boolean
  dateLabel?: string
  onLogout: () => void
  children: ReactNode
}

function initials(user: SessionUser) {
  const a = (user.first_name || "").trim()
  const b = (user.last_name || "").trim()
  return ((a[0] || "") + (b[0] || "") || user.email.slice(0, 2)).toUpperCase()
}

export function PortalShell({
  user,
  geoPending = 0,
  live = true,
  dateLabel = "Jue. 29 oct. 2026",
  onLogout,
  children,
}: Props) {
  const navigate = useNavigate()
  const items = useMemo(() => navFor(user.role), [user.role])
  const [theme, setTheme] = useState<NcTheme>(() => readTheme())
  const [q, setQ] = useState("")

  function cycleTheme() {
    const order: NcTheme[] = ["dark", "light", "sol"]
    const next = order[(order.indexOf(theme) + 1) % order.length]
    applyTheme(next)
    setTheme(next)
  }

  return (
    <div className="nc-desk" data-theme={theme}>
      <aside className="nc-side">
        <div className="nc-side-brand">
          <img src="/logo-natural-control-2024.png" alt="Natural Control" width={200} />
          <span className="nc-eyebrow">CRM de campo</span>
        </div>
        <nav className="nc-side-nav" aria-label="Principal">
          {items.map((n) => {
            const count = n.countKey === "geo" ? geoPending : 0
            return (
              <NavLink
                key={n.id}
                to={n.path}
                end={n.path === "/portal" || n.path === "/consola"}
                className={({ isActive }) => (isActive ? "nc-nav-item is-active" : "nc-nav-item")}
              >
                <Icon name={n.icon as never} />
                <span className="nc-nav-label">{n.label}</span>
                {n.feature && !user.features[n.feature] ? (
                  <span className="nc-nav-soon">Próximamente</span>
                ) : null}
                {count > 0 ? <span className="nc-nav-count">{count}</span> : null}
              </NavLink>
            )
          })}
        </nav>
        <div className="nc-side-foot">
          <div className="nc-side-user">
            <span className="nc-avatar">{initials(user)}</span>
            <div>
              <span className="nc-side-user-name">{user.first_name} {user.last_name}</span>
              <span className="nc-side-user-role">{user.role}</span>
            </div>
          </div>
          <Button type="button" variant="quiet" onClick={cycleTheme}>
            Tema: {theme === "dark" ? "oscuro" : theme === "light" ? "claro" : "sol"}
          </Button>
          {isDemoMode() ? (
            <span className="nc-eyebrow">Demo activo</span>
          ) : null}
          <Button type="button" variant="quiet" onClick={onLogout}>
            Cerrar sesión
          </Button>
        </div>
      </aside>
      <div className="nc-desk-main">
        <header className="nc-topbar">
          <label className="nc-search">
            <Icon name="search" />
            <input
              type="search"
              placeholder="Buscar cliente, RTC o municipio"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && q.trim()) {
                  const base = user.role === "RTC" ? "/portal/clientes" : "/consola"
                  navigate(`${base}?q=${encodeURIComponent(q.trim())}`)
                }
              }}
            />
          </label>
          <span className="nc-live">
            <span className={live ? "nc-live-dot is-on" : "nc-live-dot"} />
            {live ? "En vivo" : "Sin señal"}
          </span>
          <span className="nc-top-date">{dateLabel}</span>
        </header>
        <main className="nc-page">{children}</main>
      </div>
    </div>
  )
}
