import type { SessionUser } from "@nc/domain"
import { BacklogStubPage } from "./BacklogStubPage"

export function MensajesPage({ user, onLogout }: { user: SessionUser; onLogout: () => void }) {
  return (
    <BacklogStubPage
      user={user}
      onLogout={onLogout}
      title="Mensajes de WhatsApp"
      lede="Bandeja de conversaciones — stub sin integración WABA."
      feature="whatsapp"
      fetchPath="/api/v1/whatsapp/conversations"
      emptyTitle="Sin conversaciones"
      emptyBody="Conecta la cuenta de WhatsApp Business (WABA) para ver mensajes aquí."
    />
  )
}
