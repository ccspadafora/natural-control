import type { SessionUser } from "@nc/domain"
import { BacklogStubPage } from "./BacklogStubPage"

export function InformesPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  return (
    <BacklogStubPage
      user={user}
      onLogout={onLogout}
      title="Informes con IA"
      lede="Resúmenes semanales y alertas — stub sin llamadas al modelo."
      feature="ai_reports"
      fetchPath="/api/v1/reports/ai"
      emptyTitle="Sin informes generados"
      emptyBody="Cuando actives la función y programes el cron, aquí verás los informes listos para revisar."
    />
  )
}
