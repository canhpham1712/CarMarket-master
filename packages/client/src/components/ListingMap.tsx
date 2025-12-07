import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { ListingDetail } from '../types';
import { formatPrice } from '../lib/utils';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Thêm dòng này để lấy URL server từ biến môi trường
const SERVER_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

type MarkerClusterGroup = L.LayerGroup & {
  addLayer(layer: L.Layer): MarkerClusterGroup;
  clearLayers(): MarkerClusterGroup;
};

interface ListingMapProps {
  listings: ListingDetail[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  onMarkerClick?: (listing: ListingDetail) => void;
}

// Custom marker icon
const createCustomIcon = (isPrimary: boolean = false) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${isPrimary ? '#ef4444' : '#3b82f6'};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          transform: rotate(45deg);
          color: white;
          font-weight: bold;
          font-size: 16px;
        ">🚗</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Component to fit bounds when listings change
function MapBounds({ listings }: { listings: ListingDetail[] }) {
  const map = useMap();

  useEffect(() => {
    if (listings.length === 0) return;

    const validListings = listings.filter(
      (l) => l.latitude != null && l.longitude != null,
    );

    if (validListings.length === 0) return;

    if (validListings.length === 1) {
      map.setView(
        [validListings[0].latitude!, validListings[0].longitude!],
        map.getZoom(),
      );
      return;
    }

    const bounds = L.latLngBounds(
      validListings.map((l) => [l.latitude!, l.longitude!] as [number, number]),
    );

    map.fitBounds(bounds, { padding: [50, 50] });
  }, [listings, map]);

  return null;
}

// Marker Cluster Group Component
function MarkerClusterGroupComponent({
  listings,
  onMarkerClick,
}: {
  listings: ListingDetail[];
  onMarkerClick?: (listing: ListingDetail) => void;
}) {
  const map = useMap();
  const clusterGroupRef = useRef<MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!map) return;

    // Filter out listings without coordinates
    const validListings = listings.filter(
      (l) => l.latitude != null && l.longitude != null,
    );

    if (validListings.length === 0) return;

    // Create cluster group
    const clusterGroup: MarkerClusterGroup = (L as any).markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
    });

    // Add markers to cluster group
    validListings.forEach((listing) => {
      if (!listing.latitude || !listing.longitude) return;

      const primaryImage =
        listing.carDetail.images?.find((img) => img.isPrimary) ||
        listing.carDetail.images?.[0];

      const marker = L.marker([listing.latitude, listing.longitude], {
        icon: createCustomIcon(listing.isFeatured),
      });

      const imageUrl = primaryImage?.url 
        ? (primaryImage.url.startsWith('http') ? primaryImage.url : `${SERVER_URL}${primaryImage.url}`)
        : '';

      const popupContent = `
        <div style="min-width: 200px;">
          ${
            imageUrl
              ? `<img src="${imageUrl}" alt="${listing.title}" style="width: 100%; height: 128px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;" />`
              : ''
          }
          <a href="#" data-listing-id="${listing.id}" class="listing-popup-link" style="font-weight: 600; font-size: 18px; color: #2563eb; text-decoration: none; cursor: pointer;">
            ${listing.title || 'Car Listing'}
          </a>
          <p style="font-size: 20px; font-weight: bold; color: #16a34a; margin-top: 4px;">
            ${formatPrice(listing.price)}
          </p>
          <p style="font-size: 14px; color: #4b5563; margin-top: 4px;">
            ${listing.carDetail?.make || ''} ${listing.carDetail?.model || ''} • ${listing.carDetail?.year || ''}
          </p>
          ${
            listing.location
              ? `<p style="font-size: 12px; color: #6b7280; margin-top: 4px;">📍 ${listing.location}</p>`
              : ''
          }
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('popupopen', () => {
        const popupElement = marker.getPopup()?.getElement();
        if (!popupElement) return;
        const link = popupElement.querySelector<HTMLAnchorElement>('.listing-popup-link');
        if (link) {
          link.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (onMarkerClick) {
              onMarkerClick(listing);
            }
          };
        }
      });

      clusterGroup.addLayer(marker);
    });

    clusterGroup.addTo(map);
    clusterGroupRef.current = clusterGroup;

    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
      }
    };
  }, [map, listings, onMarkerClick]);

  return null;
}

export function ListingMap({
  listings,
  center = [40.7128, -74.006],
  zoom = 10,
  className = '',
  onMarkerClick,
}: ListingMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Fix for default marker icons
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  }, []);

  // Calculate center from listings if not provided
  const mapCenter: [number, number] = (() => {
    if (center) return center;
    const validListings = listings.filter(
      (l) => l.latitude != null && l.longitude != null,
    );
    if (validListings.length === 0) return [40.7128, -74.006]; // Default to NYC

    const avgLat =
      validListings.reduce((sum, l) => sum + l.latitude!, 0) / validListings.length;
    const avgLng =
      validListings.reduce((sum, l) => sum + l.longitude!, 0) / validListings.length;
    return [avgLat, avgLng];
  })();

  const validListings = listings.filter(
    (l) => l.latitude != null && l.longitude != null,
  );

  if (validListings.length === 0) {
    return (
      <div className={`w-full h-full ${className} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <div className="text-center">
          <p className="text-gray-600 mb-2">No listings with location data available</p>
          <p className="text-sm text-gray-500">
            Found {listings.length} listings, but none have latitude/longitude coordinates.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Create a new listing and use the map picker to add location coordinates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${className}`} style={{ minHeight: '400px' }}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
        ref={(map) => {
          if (map) mapRef.current = map;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds listings={validListings} />
        <MarkerClusterGroupComponent
          listings={validListings}
          {...(onMarkerClick ? { onMarkerClick } : {})}
        />
      </MapContainer>
    </div>
  );
}

