import type { SessionUser } from "@nc/domain"
import { BacklogStubPage } from "./BacklogStubPage"

export function EmbudoPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  return (
    <BacklogStubPage
      user={user}
      onLogout={onLogout}
      title="Embudo comercial"
      lede="Oportunidades y etapas — stub hasta conectar el embudo completo."
      feature="pipeline"
      fetchPath="/api/v1/pipeline/opportunities"
      emptyTitle="Sin oportunidades todavía"
      emptyBody="Cuando actives el embudo y registres visitas, aquí verás el tablero por etapa."
    />
  )
}
