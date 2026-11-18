import Dexie, { type EntityTable } from "dexie"

export type OutboxRow = {
  id?: number
  client_uuid: string
  method: string
  path: string
  body: unknown
  created_at: string
  retries: number
  last_error: string | null
}

export type MetaRow = {
  key: string
  value: string
}

export type BlobRow = {
  id: string
  visit_id: string
  preview: string
  filename: string
  content_type: string
  created_at: string
}

export type CachedClient = {
  id: string
  updated_at: string
  name: string
  municipality: string
  phone: string
  status: string
  is_new: boolean
  last_visit_at: string | null
  payload: Record<string, unknown>
}

export type CachedVisit = {
  id: string
  updated_at: string
  client_id: string
  client_name: string
  municipality: string
  site: string
  status: string
  reason: string
  scheduled_start: string | null
  late: boolean
  day: string
  payload: Record<string, unknown>
}

export type CachedProduct = {
  id: string
  updated_at: string
  name: string
  presentation: string
  unit_price: string | null
  payload: Record<string, unknown>
}

class CampoDb extends Dexie {
  outbox!: EntityTable<OutboxRow, "id">
  meta!: EntityTable<MetaRow, "key">
  blobs!: EntityTable<BlobRow, "id">
  clients!: EntityTable<CachedClient, "id">
  visits!: EntityTable<CachedVisit, "id">
  products!: EntityTable<CachedProduct, "id">

  constructor() {
    super("nc-campo")
    this.version(1).stores({
      outbox: "++id, client_uuid, created_at",
      meta: "key",
    })
    this.version(2).stores({
      outbox: "++id, client_uuid, created_at",
      meta: "key",
      blobs: "id, visit_id, created_at",
    })
    this.version(3).stores({
      outbox: "++id, client_uuid, created_at",
      meta: "key",
      blobs: "id, visit_id, created_at",
      clients: "id, name, municipality, status, updated_at",
      visits: "id, day, client_id, status, scheduled_start, updated_at",
      products: "id, name, updated_at",
    })
  }
}

export const db = new CampoDb()

export async function clearCampoCache() {
  await Promise.all([
    db.outbox.clear(),
    db.blobs.clear(),
    db.clients.clear(),
    db.visits.clear(),
    db.products.clear(),
    db.meta.clear(),
  ])
}
