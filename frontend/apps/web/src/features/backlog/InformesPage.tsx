import type { SessionUser } from "@nc/domain"
import { BacklogStubPage } from "./BacklogStubPage"

export function InformesPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  return (
    <BacklogStubPage
      user={user}
      onLogout={onLogout}
      title="Informes con IA"
      lede="Resúmenes semanales y alertas generados con IA."
      fetchPath="/api/v1/reports/ai"
      emptyTitle="Sin informes generados"
      emptyBody="Los informes generados por el cron semanal aparecerán aquí."
    />
  )
}
