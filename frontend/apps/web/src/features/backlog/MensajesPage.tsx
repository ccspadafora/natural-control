import type { SessionUser } from "@nc/domain"
import { BacklogStubPage } from "./BacklogStubPage"

export function MensajesPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  return (
    <BacklogStubPage
      user={user}
      onLogout={onLogout}
      title="Mensajes de WhatsApp"
      lede="Bandeja de conversaciones de WhatsApp Business."
      fetchPath="/api/v1/whatsapp/conversations"
      emptyTitle="Sin conversaciones"
      emptyBody="Las conversaciones entrantes y salientes de tu cuenta WABA aparecerán aquí."
    />
  )
}
