import type { SessionUser } from "@nc/domain"
import { BacklogStubPage } from "./BacklogStubPage"

export function EmbudoPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  return (
    <BacklogStubPage
      user={user}
      onLogout={onLogout}
      title="Embudo comercial"
      lede="Oportunidades y etapas del embudo comercial."
      fetchPath="/api/v1/pipeline/opportunities"
      emptyTitle="Sin oportunidades todavía"
      emptyBody="Las oportunidades vinculadas a visitas y clientes aparecerán aquí."
    />
  )
}
