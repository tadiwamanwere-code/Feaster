import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons in Leaflet+Vite
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})
L.Marker.prototype.options.icon = DefaultIcon

const HARARE_CENTER = [-17.8252, 31.0335]

function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points || points.length < 2) return
    const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [map, points])
  return null
}

function ClickHandler({ onClick }) {
  const map = useMap()
  useEffect(() => {
    if (!onClick) return
    const handler = (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng })
    map.on('click', handler)
    return () => map.off('click', handler)
  }, [map, onClick])
  return null
}

const colorIcon = (color) =>
  L.divIcon({
    className: '',
    html: `<div style="background:${color};width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })

/**
 * Reusable map.
 *
 * Props:
 *  - markers: [{ lat, lng, label?, color?, key? }]
 *  - polyline: [{ lat, lng }] (optional)
 *  - center: [lat, lng] (defaults Harare)
 *  - zoom: number (default 13)
 *  - height: CSS string (default '320px')
 *  - onClick: (latlng) => void   (enables click-to-pick)
 *  - fitToMarkers: boolean (default true)
 */
export default function Map({
  markers = [],
  polyline,
  center = HARARE_CENTER,
  zoom = 13,
  height = '320px',
  onClick,
  fitToMarkers = true,
}) {
  const containerRef = useRef(null)

  return (
    <div ref={containerRef} style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }}>
      <MapContainer
        center={markers[0] ? [markers[0].lat, markers[0].lng] : center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((m, i) => (
          <Marker
            key={m.key || i}
            position={[m.lat, m.lng]}
            icon={m.color ? colorIcon(m.color) : DefaultIcon}
          >
            {m.label && <Popup>{m.label}</Popup>}
          </Marker>
        ))}
        {polyline && polyline.length >= 2 && (
          <Polyline
            positions={polyline.map(p => [p.lat, p.lng])}
            color="#ea580c"
            weight={4}
          />
        )}
        {fitToMarkers && markers.length >= 2 && <FitBounds points={markers} />}
        {onClick && <ClickHandler onClick={onClick} />}
      </MapContainer>
    </div>
  )
}
