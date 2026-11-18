import { useMemo } from "react"
import Map, { Marker } from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import { mapsDirectionsUrl } from "../shared/campo-format"

type Props = {
  latitude: number
  longitude: number
  label?: string
}

export function SiteMap({ latitude, longitude, label }: Props) {
  const initialViewState = useMemo(
    () => ({
      latitude,
      longitude,
      zoom: 13,
    }),
    [latitude, longitude],
  )

  return (
    <div className="nc-campo-map">
      <Map
        initialViewState={initialViewState}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        attributionControl={false}
        style={{ width: "100%", height: "100%" }}
        cooperativeGestures
      >
        <Marker latitude={latitude} longitude={longitude} color="#124481" />
      </Map>
      <a
        className="nc-campo-map-open"
        href={mapsDirectionsUrl(latitude, longitude)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Abrir en Maps{label ? ` · ${label}` : ""}
      </a>
    </div>
  )
}
