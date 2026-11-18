import type { ReactNode } from "react"
import type { SessionUser } from "@nc/domain"
import { PortalShell } from "../shell/PortalShell"
import { portalDayLabel } from "./shared/format"

export function PortalPage({
  user,
  onLogout,
  children,
}: {
  user: SessionUser
  onLogout: () => void
  children: ReactNode
}) {
  return (
    <PortalShell user={user} onLogout={onLogout} dateLabel={portalDayLabel()}>
      <div className="nc-portal-stack">{children}</div>
    </PortalShell>
  )
}
