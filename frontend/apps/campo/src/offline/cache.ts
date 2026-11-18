import { api } from "@nc/api"
import { db, type CachedClient, type CachedProduct, type CachedVisit } from "./db"
import { notifyOutbox } from "./events"

const CURSOR_KEY = "sync.cursor"
const USER_KEY = "sync.user_id"
const LAST_PULL_KEY = "sync.last_pull_at"

type BootstrapPayload = {
  cursor: string
  me: { id: string }
  settings: Record<string, unknown>
  clients: Array<Record<string, unknown> & { id: string; updated_at?: string }>
  visits: Array<Record<string, unknown> & { id: string; scheduled_start?: string | null; updated_at?: string }>
  visit_details: Array<Record<string, unknown> & { id: string; updated_at?: string }>
  products: Array<Record<string, unknown> & { id: string; updated_at?: string }>
}

type PullPayload = {
  cursor: string
  changes?: {
    clients?: BootstrapPayload["clients"]
    visits?: BootstrapPayload["visits"]
    visit_details?: BootstrapPayload["visit_details"]
    products?: BootstrapPayload["products"]
    settings?: Record<string, unknown>
  }
  deleted?: {
    clients?: string[]
    visits?: string[]
    products?: string[]
  }
  // bootstrap shape when no cursor
  clients?: BootstrapPayload["clients"]
  visits?: BootstrapPayload["visits"]
  visit_details?: BootstrapPayload["visit_details"]
  products?: BootstrapPayload["products"]
  me?: { id: string }
  settings?: Record<string, unknown>
}

function dayKey(iso: string | null | undefined) {
  if (!iso) return ""
  return iso.slice(0, 10)
}

function toClient(row: Record<string, unknown> & { id: string }): CachedClient {
  return {
    id: row.id,
    updated_at: String(row.updated_at || new Date().toISOString()),
    name: String(row.name || row.legal_name || ""),
    municipality: String(row.municipality || ""),
    phone: String(row.phone || ""),
    status: String(row.status || ""),
    is_new: Boolean(row.is_new),
    last_visit_at: (row.last_visit_at as string | null) || null,
    payload: row,
  }
}

function toVisit(
  agenda: Record<string, unknown> & { id: string },
  detail?: Record<string, unknown>,
): CachedVisit {
  const scheduled = (agenda.scheduled_start as string | null) || null
  return {
    id: agenda.id,
    updated_at: String(agenda.updated_at || detail?.updated_at || new Date().toISOString()),
    client_id: String(agenda.client_id || detail?.client_id || ""),
    client_name: String(agenda.client_name || detail?.client_name || ""),
    municipality: String(agenda.municipality || ""),
    site: String(agenda.site || ""),
    status: String(agenda.status || detail?.status || ""),
    reason: String(agenda.reason || ""),
    scheduled_start: scheduled,
    late: Boolean(agenda.late),
    day: dayKey(scheduled),
    payload: { ...agenda, ...(detail || {}) },
  }
}

function toProduct(row: Record<string, unknown> & { id: string }): CachedProduct {
  return {
    id: row.id,
    updated_at: String(row.updated_at || new Date().toISOString()),
    name: String(row.name || ""),
    presentation: String(row.presentation || ""),
    unit_price: row.unit_price == null ? null : String(row.unit_price),
    payload: row,
  }
}

async function putSettings(settings: Record<string, unknown> | undefined) {
  if (!settings) return
  await db.meta.put({ key: "settings.json", value: JSON.stringify(settings) })
}

export async function applyBootstrap(data: BootstrapPayload) {
  const details = new Map(data.visit_details.map((d) => [d.id, d]))
  await db.transaction("rw", db.clients, db.visits, db.products, db.meta, async () => {
    await db.clients.clear()
    await db.visits.clear()
    await db.products.clear()
    await db.clients.bulkPut(data.clients.map(toClient))
    await db.visits.bulkPut(data.visits.map((v) => toVisit(v, details.get(v.id))))
    await db.products.bulkPut(data.products.map(toProduct))
    await db.meta.put({ key: CURSOR_KEY, value: data.cursor })
    await db.meta.put({ key: USER_KEY, value: data.me.id })
    await db.meta.put({ key: LAST_PULL_KEY, value: new Date().toISOString() })
    await putSettings(data.settings)
  })
  notifyOutbox()
}

export async function applyPull(data: PullPayload) {
  if (data.clients && data.visits && data.me) {
    await applyBootstrap(data as BootstrapPayload)
    return
  }
  const changes = data.changes || {}
  const deleted = data.deleted || {}
  const details = new Map((changes.visit_details || []).map((d) => [d.id, d]))

  await db.transaction("rw", db.clients, db.visits, db.products, db.meta, async () => {
    if (changes.clients?.length) await db.clients.bulkPut(changes.clients.map(toClient))
    if (changes.visits?.length) {
      await db.visits.bulkPut(changes.visits.map((v) => toVisit(v, details.get(v.id))))
    } else if (changes.visit_details?.length) {
      for (const detail of changes.visit_details) {
        const existing = await db.visits.get(detail.id)
        const agenda = existing?.payload || {
          id: detail.id,
          client_id: detail.client_id,
          client_name: detail.client_name,
          status: detail.status,
          scheduled_start: existing?.scheduled_start || null,
        }
        await db.visits.put(toVisit(agenda as CachedVisit["payload"] & { id: string }, detail))
      }
    }
    if (changes.products?.length) {
      const live = changes.products.filter((p) => !p["is_deleted"])
      const gone = changes.products.filter((p) => p["is_deleted"]).map((p) => p.id)
      if (live.length) await db.products.bulkPut(live.map(toProduct))
      if (gone.length) await db.products.bulkDelete(gone)
    }
    if (deleted.clients?.length) await db.clients.bulkDelete(deleted.clients)
    if (deleted.visits?.length) await db.visits.bulkDelete(deleted.visits)
    if (deleted.products?.length) await db.products.bulkDelete(deleted.products)
    await db.meta.put({ key: CURSOR_KEY, value: data.cursor })
    await db.meta.put({ key: LAST_PULL_KEY, value: new Date().toISOString() })
    await putSettings(changes.settings)
  })
  notifyOutbox()
}

export async function getCursor() {
  return (await db.meta.get(CURSOR_KEY))?.value || null
}

export async function getCachedUserId() {
  return (await db.meta.get(USER_KEY))?.value || null
}

export async function pullRemote(userId: string) {
  const cachedUser = await getCachedUserId()
  if (cachedUser && cachedUser !== userId) {
    await db.clients.clear()
    await db.visits.clear()
    await db.products.clear()
    await db.meta.delete(CURSOR_KEY)
  }
  const cursor = await getCursor()
  if (!cursor) {
    const boot = await api<BootstrapPayload>("/api/v1/sync/bootstrap")
    await applyBootstrap(boot)
    return { mode: "bootstrap" as const, cursor: boot.cursor }
  }
  const delta = await api<PullPayload>(`/api/v1/sync/pull?cursor=${encodeURIComponent(cursor)}`)
  await applyPull(delta)
  return { mode: "pull" as const, cursor: delta.cursor }
}

export async function listCachedClients(query = "") {
  const q = query.trim().toLowerCase()
  const rows = await db.clients.orderBy("name").toArray()
  if (!q) return rows.map((r) => r.payload)
  return rows
    .filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.municipality.toLowerCase().includes(q) ||
        r.phone.toLowerCase().includes(q),
    )
    .map((r) => r.payload)
}

export async function getCachedClient(id: string) {
  const row = await db.clients.get(id)
  return row?.payload || null
}

export async function listCachedVisitsForDay(day: string) {
  const rows = await db.visits.where("day").equals(day).sortBy("scheduled_start")
  return rows.map((r) => ({
    id: r.id,
    client_id: r.client_id,
    client_name: r.client_name,
    municipality: r.municipality,
    site: r.site,
    status: r.status,
    reason: r.reason,
    scheduled_start: r.scheduled_start,
    late: r.late,
  }))
}

export async function getCachedVisit(id: string) {
  const row = await db.visits.get(id)
  return row?.payload || null
}

export async function listCachedProducts() {
  const rows = await db.products.orderBy("name").toArray()
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    presentation: r.presentation,
    unit_price: r.unit_price,
  }))
}

export async function getLastPullAt() {
  return (await db.meta.get(LAST_PULL_KEY))?.value || null
}
