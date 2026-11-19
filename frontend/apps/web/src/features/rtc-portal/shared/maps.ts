/** URL a Google Maps (abre en Maps o app instalada). */
export function mapsUrl(opts: {
  latitude?: number | null
  longitude?: number | null
  site?: string
  municipality?: string
}): string | null {
  const { latitude, longitude, site, municipality } = opts
  if (latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
  }
  const q = [site, municipality].filter(Boolean).join(", ").trim()
  if (!q) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`
}
