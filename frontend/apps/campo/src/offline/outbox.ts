import { api } from "@nc/api"
import { db, type OutboxRow } from "./db"
import { notifyOutbox } from "./events"

export function newClientUuid() {
  return crypto.randomUUID()
}

export function isOfflineMode() {
  return typeof navigator !== "undefined" && !navigator.onLine
}

export async function countPending() {
  return db.outbox.count()
}

export async function listPending(): Promise<OutboxRow[]> {
  return db.outbox.orderBy("created_at").toArray()
}

export type EnqueueInput = {
  client_uuid?: string
  method: string
  path: string
  body: unknown
}

export async function enqueueMutation(input: EnqueueInput) {
  const row: OutboxRow = {
    client_uuid: input.client_uuid || newClientUuid(),
    method: input.method.toUpperCase(),
    path: input.path,
    body: input.body,
    created_at: new Date().toISOString(),
    retries: 0,
    last_error: null,
  }
  await db.outbox.add(row)
  notifyOutbox()
  return row.client_uuid
}

type SyncResult = {
  client_uuid: string
  status: "APPLIED" | "REJECTED" | "CONFLICT"
  response?: Record<string, unknown>
  error?: string | null
  detail?: string
}

type SyncResponse = {
  results: SyncResult[]
}

let flushing = false

export async function flushOutbox(): Promise<{ sent: number; failed: number }> {
  if (flushing || isOfflineMode()) return { sent: 0, failed: 0 }
  const pending = await listPending()
  if (pending.length === 0) return { sent: 0, failed: 0 }

  flushing = true
  notifyOutbox()
  let sent = 0
  let failed = 0

  try {
    const batch = pending.slice(0, 50)
    const response = await api<SyncResponse>("/api/v1/sync/mutations", {
      method: "POST",
      headers: { "Idempotency-Key": batch.map((row) => row.client_uuid).join(",") },
      body: JSON.stringify({
        mutations: batch.map((row) => ({
          client_uuid: row.client_uuid,
          method: row.method,
          path: row.path,
          body: row.body,
        })),
      }),
    })

    const byUuid = new Map(response.results.map((item) => [item.client_uuid, item]))
    for (const row of batch) {
      const result = byUuid.get(row.client_uuid)
      if (!result) continue
      if (result.status === "APPLIED") {
        await db.outbox.where("client_uuid").equals(row.client_uuid).delete()
        sent += 1
      } else {
        failed += 1
        await db.outbox.update(row.id!, {
          retries: row.retries + 1,
          last_error: result.detail || result.error || "REJECTED",
        })
      }
    }
    await db.meta.put({ key: "last_sync_at", value: new Date().toISOString() })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de red"
    for (const row of pending.slice(0, 50)) {
      await db.outbox.update(row.id!, { retries: row.retries + 1, last_error: message })
    }
    failed = Math.min(pending.length, 50)
  } finally {
    flushing = false
    notifyOutbox()
    if ((await countPending()) > 0 && !isOfflineMode()) {
      void flushOutbox()
    }
  }

  return { sent, failed }
}

export function isFlushingOutbox() {
  return flushing
}

export async function getLastSyncAt() {
  const row = await db.meta.get("last_sync_at")
  return row?.value ?? null
}
