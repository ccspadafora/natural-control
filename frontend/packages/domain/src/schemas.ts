import { z } from "zod"

export const gpsStatusSchema = z.enum([
  "VERIFICADA",
  "FUERA_DE_RANGO",
  "PRECISION_BAJA",
  "SIN_UBICACION",
  "SIN_REFERENCIA",
])

export type GpsStatus = z.infer<typeof gpsStatusSchema>

export const sessionUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.string(),
  scope: z.string().optional(),
  permissions: z.array(z.string()),
  zone_id: z.string().nullable().optional(),
  requires_weekly_plan: z.boolean(),
  features: z.record(z.boolean()),
})

export type SessionUser = z.infer<typeof sessionUserSchema>

/** Fila de listado de clientes (`GET /api/v1/clients`). */
export const clientSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  legal_name: z.string().optional(),
  municipality: z.string(),
  phone: z.string(),
  status: z.string(),
  is_new: z.boolean(),
  last_visit_at: z.string().nullable(),
  owner_id: z.string().nullable().optional(),
  owner_name: z.string(),
  zone_name: z.string().optional(),
})

export type ClientSummary = z.infer<typeof clientSummarySchema>

/** Fila de agenda o visitas abiertas (Campo / Consola). */
export const visitSummarySchema = z.object({
  id: z.string(),
  client_id: z.string().optional(),
  client_name: z.string(),
  municipality: z.string(),
  site: z.string().optional(),
  status: z.string(),
  reason: z.string(),
  scheduled_start: z.string().nullable(),
  late: z.boolean().optional(),
  rtc_id: z.string().optional(),
  rtc_name: z.string().optional(),
  origin: z.string().optional(),
  priority: z.string().optional(),
})

export type VisitSummary = z.infer<typeof visitSummarySchema>

export const clientListSchema = z.object({ results: z.array(clientSummarySchema) })
export const visitListSchema = z.object({ results: z.array(visitSummarySchema) })
