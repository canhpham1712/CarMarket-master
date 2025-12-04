import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { MapPin, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api';
import 'leaflet/dist/leaflet.css';

interface LocationPickerProps {
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
  onLocationChange: (location: {
    latitude: number;
    longitude: number;
    address: string;
    city?: string;
    state?: string;
    country?: string;
  }) => void;
  className?: string;
  height?: string;
}

// Custom marker icon for location picker
const createLocationIcon = () => {
  return L.divIcon({
    className: 'location-picker-marker',
    html: `
      <div style="
        background-color: #ef4444;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Component to handle map clicks
function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationPicker({
  latitude,
  longitude,
  address: initialAddress,
  onLocationChange,
  className = '',
  height = '400px',
}: LocationPickerProps) {
  const [selectedLat, setSelectedLat] = useState<number | null>(latitude || null);
  const [selectedLng, setSelectedLng] = useState<number | null>(longitude || null);
  const [address, setAddress] = useState(initialAddress || '');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
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

  // Initialize from props
  useEffect(() => {
    if (latitude && longitude) {
      setSelectedLat(latitude);
      setSelectedLng(longitude);
    }
  }, [latitude, longitude]);

  // Reverse geocode when coordinates change
  useEffect(() => {
    if (selectedLat && selectedLng && !address) {
      reverseGeocode(selectedLat, selectedLng);
    }
  }, [selectedLat, selectedLng]);

  const handleMapClick = async (lat: number, lng: number) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    await reverseGeocode(lat, lng);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    // Validate coordinates
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
      toast.error('Invalid coordinates');
      return;
    }

    try {
      setIsReverseGeocoding(true);
      const result = await apiClient.get('/geocoding/reverse', {
        lat: lat.toString(),
        lng: lng.toString(),
      });
      const fullAddress =
        result.address.fullAddress ||
        [result.address.city, result.address.state, result.address.country]
          .filter(Boolean)
          .join(', ') ||
        result.displayName;

      setAddress(fullAddress);
      onLocationChange({
        latitude: lat,
        longitude: lng,
        address: fullAddress,
        city: result.address.city,
        state: result.address.state,
        country: result.address.country,
      });
    } catch (error: any) {
      console.error('Reverse geocoding failed:', error);
      toast.error('Could not get address for this location');
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleGeocode = async () => {
    if (!address.trim()) {
      toast.error('Please enter an address');
      return;
    }

    try {
      setIsGeocoding(true);
      const result = await apiClient.get('/geocoding/geocode', {
        address: address.trim(),
      });
      setSelectedLat(result.latitude);
      setSelectedLng(result.longitude);
      setAddress(result.displayName);

      // Center map on new location
      if (mapRef.current) {
        mapRef.current.setView([result.latitude, result.longitude], 15);
      }

      onLocationChange({
        latitude: result.latitude,
        longitude: result.longitude,
        address: result.displayName,
        city: result.address.city,
        state: result.address.state,
        country: result.address.country,
      });

      toast.success('Location found!');
    } catch (error: any) {
      console.error('Geocoding failed:', error);
      toast.error('Could not find this address. Please try a different address.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    const loadingToast = toast.loading('Getting your location...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Validate coordinates
          if (isNaN(lat) || isNaN(lng)) {
            toast.dismiss(loadingToast);
            toast.error('Invalid location coordinates');
            return;
          }

          setSelectedLat(lat);
          setSelectedLng(lng);

          if (mapRef.current) {
            mapRef.current.setView([lat, lng], 15);
          }

          await reverseGeocode(lat, lng);
          toast.dismiss(loadingToast);
          toast.success('Location set!');
        } catch (error) {
          toast.dismiss(loadingToast);
          toast.error('Failed to set location');
          console.error('Location setting error:', error);
        }
      },
      (error) => {
        toast.dismiss(loadingToast);
        let errorMessage = 'Could not get your location. ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'Please try again.';
        }
        toast.error(errorMessage);
        console.error('Geolocation error:', error);
      },
    );
  };

  const center: [number, number] =
    selectedLat && selectedLng
      ? [selectedLat, selectedLng]
      : [40.7128, -74.006]; // Default to NYC

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Enter address or click on map"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleGeocode();
            }
          }}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={handleGeocode}
          disabled={isGeocoding || isReverseGeocoding}
          variant="default"
        >
          <Search className="w-4 h-4 mr-2" />
          {isGeocoding ? 'Searching...' : 'Search'}
        </Button>
        <Button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isGeocoding || isReverseGeocoding}
          variant="outline"
        >
          <MapPin className="w-4 h-4" />
        </Button>
      </div>

      <div
        className="border rounded-lg overflow-hidden"
        style={{ height }}
      >
        <MapContainer
          center={center}
          zoom={selectedLat && selectedLng ? 15 : 10}
          scrollWheelZoom={true}
          className="w-full h-full z-0"
          style={{ height: '100%', width: '100%' }}
          ref={(map) => {
            if (map) mapRef.current = map;
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onLocationSelect={handleMapClick} />
          {selectedLat && selectedLng && (
            <Marker
              position={[selectedLat, selectedLng]}
              icon={createLocationIcon()}
            />
          )}
        </MapContainer>
      </div>

      {selectedLat && selectedLng && (
        <div className="text-sm text-gray-600">
          <p>
            Coordinates: {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
}

