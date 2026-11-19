import { useEffect, useMemo, useRef } from "react"
import Map, { Layer, Marker, NavigationControl, Source, type MapRef } from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"

type Point = { latitude: number; longitude: number }

type Props = {
  reference: Point | null
  position: Point | null
  toleranceM?: number | null
  distanceM?: number | null
}

type LngLat = [number, number]

function circlePolygon(lat: number, lng: number, radiusM: number, steps = 64) {
  const R = 6371000
  const coords: LngLat[] = []
  const lat1 = (lat * Math.PI) / 180
  const lng1 = (lng * Math.PI) / 180
  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * 2 * Math.PI
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(radiusM / R) + Math.cos(lat1) * Math.sin(radiusM / R) * Math.cos(bearing),
    )
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(radiusM / R) * Math.cos(lat1),
        Math.cos(radiusM / R) - Math.sin(lat1) * Math.sin(lat2),
      )
    coords.push([(lng2 * 180) / Math.PI, (lat2 * 180) / Math.PI])
  }
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [coords] },
  }
}

function boundsOf(points: Point[]) {
  let minLat = points[0].latitude
  let maxLat = points[0].latitude
  let minLng = points[0].longitude
  let maxLng = points[0].longitude
  for (const p of points) {
    minLat = Math.min(minLat, p.latitude)
    maxLat = Math.max(maxLat, p.latitude)
    minLng = Math.min(minLng, p.longitude)
    maxLng = Math.max(maxLng, p.longitude)
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ] as [[number, number], [number, number]]
}

/** Mapa real: sede, círculo de tolerancia y punto donde se registró el cierre. */
export function GeoMap({ reference, position, toleranceM, distanceM }: Props) {
  const mapRef = useRef<MapRef>(null)
  const tol = Math.max(50, toleranceM || 1000)
  const dist = distanceM ?? null

  const points = useMemo(() => {
    const list: Point[] = []
    if (reference) list.push(reference)
    if (position) list.push(position)
    return list
  }, [reference, position])

  const toleranceGeo = useMemo(
    () => (reference ? circlePolygon(reference.latitude, reference.longitude, tol) : null),
    [reference, tol],
  )

  const lineGeo = useMemo(() => {
    if (!reference || !position) return null
    return {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [reference.longitude, reference.latitude],
          [position.longitude, position.latitude],
        ] as LngLat[],
      },
    }
  }, [reference, position])

  useEffect(() => {
    const map = mapRef.current
    if (!map || points.length === 0) return
    const timer = window.setTimeout(() => {
      if (points.length === 1) {
        map.flyTo({
          center: [points[0].longitude, points[0].latitude],
          zoom: 14,
          duration: 500,
        })
        return
      }
      map.fitBounds(boundsOf(points), { padding: 56, duration: 600, maxZoom: 15 })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [points])

  if (points.length === 0) {
    return (
      <div className="nc-geo-map nc-geo-map-empty">
        <p>Sin coordenadas de sede ni del registro GPS.</p>
      </div>
    )
  }

  const initial = {
    longitude: points[0].longitude,
    latitude: points[0].latitude,
    zoom: 13,
  }

  return (
    <div className="nc-geo-map">
      <Map
        ref={mapRef}
        initialViewState={initial}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
        cooperativeGestures
      >
        <NavigationControl position="top-right" showCompass={false} />
        {toleranceGeo ? (
          <Source id="tolerance" type="geojson" data={toleranceGeo}>
            <Layer id="tolerance-fill" type="fill" paint={{ "fill-color": "#3dd68c", "fill-opacity": 0.12 }} />
            <Layer
              id="tolerance-line"
              type="line"
              paint={{ "line-color": "#3dd68c", "line-width": 2, "line-dasharray": [2, 2] }}
            />
          </Source>
        ) : null}
        {lineGeo ? (
          <Source id="gap-line" type="geojson" data={lineGeo}>
            <Layer
              id="gap-line-layer"
              type="line"
              paint={{ "line-color": "#f07178", "line-width": 2, "line-dasharray": [1.5, 1.5], "line-opacity": 0.85 }}
            />
          </Source>
        ) : null}
        {reference ? (
          <Marker latitude={reference.latitude} longitude={reference.longitude} anchor="center">
            <span className="nc-geo-map-pin is-ref" title="Sede registrada" />
          </Marker>
        ) : null}
        {position ? (
          <Marker latitude={position.latitude} longitude={position.longitude} anchor="center">
            <span className="nc-geo-map-pin is-real" title="Dónde se registró" />
          </Marker>
        ) : null}
      </Map>
      <div className="nc-geo-map-legend" aria-hidden>
        <span>
          <i className="nc-geo-map-legend-dot is-ref" /> Sede
        </span>
        <span>
          <i className="nc-geo-map-legend-dot is-real" /> Registro
        </span>
        <span>Tolerancia {Math.round(tol)} m</span>
        {dist != null ? <span>Distancia {Math.round(dist)} m</span> : null}
      </div>
    </div>
  )
}
