import type { SessionUser } from "@nc/domain"
import { MgmtInicioPage } from "../mgmt/InicioPage"

/**
 * Inicio del líder de zona: mismo diseño que el Inicio gerencial (Mes/Día, atención,
 * cumplimiento por zona, feed en vivo). Las métricas ya vienen acotadas al alcance del líder.
 */
export function LeaderInicioPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  return <MgmtInicioPage user={user} onLogout={onLogout} />
}
