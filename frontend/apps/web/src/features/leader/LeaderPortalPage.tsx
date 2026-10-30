import type { ReactNode } from "react"
import type { SessionUser } from "@nc/domain"
import { PortalShell } from "../shell/PortalShell"
import { portalDayLabel } from "../rtc-portal/shared/format"
import { useGeoPending } from "./useGeoPending"

export function LeaderPortalPage({
  user,
  onLogout,
  children,
}: {
  user: SessionUser
  onLogout: () => void
  children: ReactNode
}) {
  const geoPending = useGeoPending(user.permissions.includes("gps.review"))
  const dateLabel = portalDayLabel()

  return (
    <PortalShell user={user} onLogout={onLogout} geoPending={geoPending} dateLabel={dateLabel}>
      <div className="nc-portal-stack">{children}</div>
    </PortalShell>
  )
}
