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

class CampoDb extends Dexie {
  outbox!: EntityTable<OutboxRow, "id">
  meta!: EntityTable<MetaRow, "key">

  constructor() {
    super("nc-campo")
    this.version(1).stores({
      outbox: "++id, client_uuid, created_at",
      meta: "key",
    })
  }
}

export const db = new CampoDb()
