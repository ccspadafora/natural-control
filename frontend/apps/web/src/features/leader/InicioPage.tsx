import { Link } from "react-router-dom"
import type { SessionUser } from "@nc/domain"
import { Icon, PageHead, StatTile } from "@nc/ui"
import { greeting, portalMonthEyebrow } from "../rtc-portal/shared/format"
import { LeaderPortalPage } from "./LeaderPortalPage"

const QUICK_LINKS = [
  { to: "/consola/geo", label: "Discrepancias de GPS", icon: "crosshair" as const, sub: "Revisar visitas con discrepancia" },
  { to: "/consola/visitas", label: "Visitas en vivo", icon: "pin" as const, sub: "Programadas y en curso" },
  { to: "/consola/tableros", label: "Tableros", icon: "dashboard" as const, sub: "Cumplimiento del equipo" },
  { to: "/consola/programacion", label: "Programación y asignación", icon: "calendar" as const, sub: "Aprobar semanas y asignar visitas" },
]

export function LeaderInicioPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  const isGerencia = user.role === "GERENCIA"
  const scope =
    user.role === "LIDER_ZONA"
      ? "Tu zona y comerciales a cargo"
      : isGerencia
        ? "Toda la operación"
        : "Consola"

  return (
    <LeaderPortalPage user={user} onLogout={onLogout}>
      <span className="nc-portal-eyebrow">{portalMonthEyebrow()} · {scope}</span>
      <PageHead title={greeting(user.first_name)} />
      <div className="nc-portal-metrics">
        <StatTile label="Ventas del mes" value="—" caption="Tableros · próximo paso" />
        <StatTile label="Forecast probable" value="—" caption="Noviembre a febrero" />
        <StatTile label="Visitas realizadas" value="—" caption="Mes en curso" />
        <StatTile label="Verificadas por GPS" value="—" caption="Discrepancias en Geolocalización" />
      </div>
      <div className="nc-portal-card">
        <div className="nc-portal-card-head">
          <h2>Accesos rápidos</h2>
        </div>
        <div className="nc-leader-links">
          {QUICK_LINKS.map((item) =>
            item.to === "/consola/programacion" && !user.permissions.includes("weekly_plan.review") ? null : (
              <Link key={item.to} className="nc-leader-link" to={item.to}>
                <span className="nc-leader-link-icon">
                  <Icon name={item.icon} />
                </span>
                <span className="nc-leader-link-body">
                  <span className="nc-leader-link-title">{item.label}</span>
                  <span className="nc-portal-muted">{item.sub}</span>
                </span>
                <Icon name="chevronRight" />
              </Link>
            ),
          )}
        </div>
      </div>
      {isGerencia ? (
        <p className="nc-portal-muted">Listado de clientes: próximo paso en esta consola (por ahora usa Tableros y Visitas).</p>
      ) : null}
    </LeaderPortalPage>
  )
}
