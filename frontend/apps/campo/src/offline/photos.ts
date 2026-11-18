import { enqueueMutation, newClientUuid } from "./outbox"
import { db } from "./db"

export type PendingPhoto = {
  id: string
  visit_id: string
  thumbnail: string
  pending: true
}

function readAsBase64(file: File): Promise<{ data_base64: string; content_type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("No se pudo leer la foto"))
    reader.onload = () => {
      const result = String(reader.result || "")
      const comma = result.indexOf(",")
      const data_base64 = comma >= 0 ? result.slice(comma + 1) : result
      resolve({ data_base64, content_type: file.type || "image/jpeg" })
    }
    reader.readAsDataURL(file)
  })
}

/** Encola una foto para subir al recuperar señal. Devuelve preview local. */
export async function enqueueVisitPhoto(visitId: string, file: File): Promise<PendingPhoto> {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("La foto supera 10 MB.")
  }
  const { data_base64, content_type } = await readAsBase64(file)
  const clientUuid = newClientUuid()
  const preview = URL.createObjectURL(file)
  await db.blobs.put({
    id: clientUuid,
    visit_id: visitId,
    preview,
    filename: file.name || "foto.jpg",
    content_type,
    created_at: new Date().toISOString(),
  })
  await enqueueMutation({
    client_uuid: clientUuid,
    method: "POST",
    path: `/api/v1/visits/${visitId}/evidence`,
    body: {
      filename: file.name || "foto.jpg",
      content_type,
      data_base64,
    },
  })
  return { id: clientUuid, visit_id: visitId, thumbnail: preview, pending: true }
}

export async function clearBlob(id: string) {
  const row = await db.blobs.get(id)
  if (row?.preview?.startsWith("blob:")) URL.revokeObjectURL(row.preview)
  await db.blobs.delete(id)
}
