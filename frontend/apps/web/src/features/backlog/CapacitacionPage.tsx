import type { SessionUser } from "@nc/domain"
import { ConsoleShell } from "../../admin"

export function CapacitacionPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  return (
    <ConsoleShell
      user={user}
      onLogout={onLogout}
      title="Capacitación y acompañamiento"
      lede="Material de referencia para el piloto."
    >
      <section className="nc-portal-card">
        <h2>Sin material publicado</h2>
        <p className="nc-portal-muted">
          Cuando el equipo publique guías, videos o checklists en el CMS, los verás enlazados aquí.
        </p>
      </section>
    </ConsoleShell>
  )
}