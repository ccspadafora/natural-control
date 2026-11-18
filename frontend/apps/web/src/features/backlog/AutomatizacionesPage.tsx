import type { SessionUser } from "@nc/domain"
import { BacklogStubPage } from "./BacklogStubPage"

export function AutomatizacionesPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  return (
    <BacklogStubPage
      user={user}
      onLogout={onLogout}
      title="Automatizaciones"
      lede="Reglas posteriores a la visita."
      fetchPath="/api/v1/automation/rules"
      emptyTitle="Sin reglas configuradas"
      emptyBody="Las reglas post-visita que configures se listarán aquí."
    />
  )
}
