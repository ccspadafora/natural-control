import type { ReactNode } from "react"
import type { SessionUser } from "@nc/domain"
import { PortalShell } from "../shell/PortalShell"

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
    <PortalShell user={user} onLogout={onLogout}>
      <div className="nc-portal-stack">{children}</div>
    </PortalShell>
  )
}
