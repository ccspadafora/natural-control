type Point = { latitude: number; longitude: number }

type Props = {
  reference: Point | null
  position: Point | null
  toleranceM?: number | null
  distanceM?: number | null
}

/** Mapa esquemático: sede al centro, tolerancia proporcional y punto real relativo. */
export function GeoMap({ reference, position, toleranceM, distanceM }: Props) {
  const tol = Math.max(50, toleranceM || 1000)
  const dist = distanceM ?? (reference && position ? haversineM(reference, position) : null)
  const scale = 90 / tol
  const circlePx = Math.min(220, Math.max(48, tol * scale))

  let realLeft = 55
  let realTop = 52
  if (reference && position && dist != null && dist > 0) {
    const bearing = bearingDeg(reference, position)
    const rad = (bearing * Math.PI) / 180
    const offset = Math.min(110, dist * scale)
    realLeft = 30 + Math.sin(rad) * (offset / 2.6)
    realTop = 40 - Math.cos(rad) * (offset / 2.6)
  }

  return (
    <div className="nc-geo-map" aria-hidden="true">
      {reference ? (
        <>
          <span
            className="nc-geo-map-tolerance"
            style={{
              width: circlePx,
              height: circlePx,
              margin: `${-circlePx / 2}px 0 0 ${-circlePx / 2}px`,
            }}
          />
          <span className="nc-geo-map-ref" title="Sede registrada" />
          <span className="nc-geo-map-ref-label">Sede registrada</span>
        </>
      ) : null}
      {position ? (
        <span className="nc-geo-map-real" style={{ left: `${realLeft}%`, top: `${realTop}%` }} title="Dónde se registró" />
      ) : (
        <span className="nc-geo-map-nogps">Sin ubicación del dispositivo</span>
      )}
      <span className="nc-geo-map-legend">
        Círculo: tolerancia {Math.round(tol)} m
        {dist != null ? ` · distancia ${Math.round(dist)} m` : ""} ·{" "}
        <span className="nc-geo-map-legend-dot" /> Dónde se registró
      </span>
    </div>
  )
}

function haversineM(a: Point, b: Point) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

function bearingDeg(a: Point, b: Point) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const φ1 = toRad(a.latitude)
  const φ2 = toRad(b.latitude)
  const Δλ = toRad(b.longitude - a.longitude)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}
