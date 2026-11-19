import { memo, useEffect, useMemo, useRef } from "react"
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"

export type LiveMapVisit = {
  id: string
  client_name: string
  status: string
  late?: boolean
  gps?: { status: string } | null
  position: { latitude: number; longitude: number } | null
}

type Props = {
  visits: LiveMapVisit[]
  selectedId: string | null
  onSelect: (id: string) => void
  pinColor: (visit: LiveMapVisit) => string
}

const COLOMBIA = { latitude: 5.5, longitude: -74.3, zoom: 5.4 }

function boundsOf(points: { latitude: number; longitude: number }[]) {
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

function fingerprint(visits: LiveMapVisit[]) {
  return visits
    .map((v) => `${v.id}:${v.position?.latitude?.toFixed(4)}:${v.position?.longitude?.toFixed(4)}`)
    .join("|")
}

function LiveVisitsMapInner({ visits, selectedId, onSelect, pinColor }: Props) {
  const mapRef = useRef<MapRef>(null)
  const fittedKey = useRef("")
  const lastSelected = useRef<string | null>(null)

  const withPos = useMemo(
    () => visits.filter((v) => v.position && Number.isFinite(v.position.latitude) && Number.isFinite(v.position.longitude)),
    [visits],
  )
  const coordsKey = useMemo(() => fingerprint(withPos), [withPos])
  const selected = withPos.find((v) => v.id === selectedId) ?? null

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (selected?.position && selectedId !== lastSelected.current) {
      lastSelected.current = selectedId
      map.flyTo({
        center: [selected.position.longitude, selected.position.latitude],
        zoom: Math.max(map.getZoom(), 12),
        duration: 500,
      })
      return
    }
    if (!selectedId) lastSelected.current = null

    if (coordsKey === fittedKey.current) return
    fittedKey.current = coordsKey

    if (withPos.length === 0) {
      map.flyTo({ center: [COLOMBIA.longitude, COLOMBIA.latitude], zoom: COLOMBIA.zoom, duration: 400 })
      return
    }
    if (withPos.length === 1) {
      const p = withPos[0].position!
      map.flyTo({ center: [p.longitude, p.latitude], zoom: 12, duration: 400 })
      return
    }
    map.fitBounds(boundsOf(withPos.map((v) => v.position!)), { padding: 48, duration: 450, maxZoom: 13 })
  }, [coordsKey, selected, selectedId, withPos])

  return (
    <div className="nc-mgmt-live-map">
      <Map
        ref={mapRef}
        initialViewState={COLOMBIA}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
        cooperativeGestures
        reuseMaps
      >
        <NavigationControl position="top-right" showCompass={false} />
        {withPos.map((visit) => {
          const active = visit.id === selectedId
          return (
            <Marker
              key={visit.id}
              latitude={visit.position!.latitude}
              longitude={visit.position!.longitude}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation()
                onSelect(visit.id)
              }}
            >
              <button
                type="button"
                className={`nc-mgmt-live-marker${active ? " is-active" : ""}`}
                style={{ background: pinColor(visit) }}
                title={visit.client_name}
                aria-label={visit.client_name}
              />
            </Marker>
          )
        })}
      </Map>
      <div className="nc-mgmt-live-map-legend" aria-hidden>
        <span>
          <i className="nc-mgmt-pin-dot danger" /> Atrasada
        </span>
        <span>
          <i className="nc-mgmt-pin-dot warning" /> En curso
        </span>
        <span>
          <i className="nc-mgmt-pin-dot primary" /> Programada
        </span>
        <span>
          <i className="nc-mgmt-pin-dot success" /> GPS ok
        </span>
      </div>
      {withPos.length === 0 ? (
        <p className="nc-mgmt-live-map-empty">No hay coordenadas GPS ni sede georreferenciada en este filtro.</p>
      ) : null}
    </div>
  )
}

export const LiveVisitsMap = memo(LiveVisitsMapInner)
