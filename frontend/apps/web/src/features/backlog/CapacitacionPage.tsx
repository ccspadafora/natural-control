import type { SessionUser } from "@nc/domain"
import { ConsoleShell } from "../../admin"

const MATERIALES = [
  { titulo: "Guía rápida Campo (PDF)", href: "#", nota: "Placeholder — reemplazar con el PDF final" },
  { titulo: "Recorrido del portal web (video)", href: "#", nota: "Placeholder — enlace al video de capacitación" },
  { titulo: "Checklist de piloto", href: "#", nota: "Placeholder — HU-8.4 acompañamiento" },
]

export function CapacitacionPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title="Capacitación y acompañamiento"
      lede="Material de referencia para el piloto — enlaces provisionales hasta publicar los definitivos."
    >
      <section className="nc-portal-card">
        <h2>Recursos</h2>
        <ul className="nc-portal-list">
          {MATERIALES.map((item) => (
            <li key={item.titulo}>
              <a href={item.href}>{item.titulo}</a>
              <p className="nc-portal-muted">{item.nota}</p>
            </li>
          ))}
        </ul>
      </section>
    </ConsoleShell>
  )
}
