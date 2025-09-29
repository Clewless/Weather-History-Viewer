import { h } from 'preact';

import type { JSX } from 'preact/jsx-runtime';
import { useEffect, useRef, useState } from 'preact/hooks';

import L from 'leaflet';
L.Icon.Default.imagePath = '';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  latitude: number;
  longitude: number;
  onLocationSelect?: (lat: number, lng: number) => void;
}

export const MapComponent = ({ latitude, longitude, onLocationSelect }: MapProps): JSX.Element => {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize map with zoom controls
    const map = L.map(containerRef.current, {
      zoomControl: true
    }).setView([latitude, longitude], 10);

    // Add tile layer with custom attribution control
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
    }).addTo(map);

    // Custom attribution control for better styling
    const attributionControl = new L.Control({position: 'bottomright'});
    attributionControl.onAdd = function(_map: L.Map) {
      const div = L.DomUtil.create('div', 'leaflet-control-attribution custom-attribution');
      div.innerHTML = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
      div.style.background = 'rgba(255,255,255,0.8)';
      div.style.padding = '2px 5px';
      div.style.borderRadius = '3px';
      div.style.fontSize = '12px';
      div.style.color = '#333';
      return div;
    };
    attributionControl.addTo(map);

    // Add marker
    const marker = L.marker([latitude, longitude]).addTo(map);
    marker.bindPopup('Selected location').openPopup();

    mapRef.current = map;
    markerRef.current = marker;

    // Handle click
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect?.(lat, lng);
    });

    // Handle map loading events
    map.on('tileloadstart', () => setIsLoading(true));
    map.on('tileload', () => {
      setIsLoading(false);
    });
    map.on('tileerror', () => setIsLoading(false)); // Hide loading if tile fails

    return () => {
      map.remove();
    };
  }, [latitude, longitude, onLocationSelect]);

  // Update marker when location changes
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      mapRef.current.setView([latitude, longitude], 10);
      markerRef.current.setLatLng([latitude, longitude]);
      markerRef.current.openPopup();
    }
  }, [latitude, longitude]);

  return (
    <div
      ref={containerRef}
      class="map-container"
      style={{
        width: '100%',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        position: 'relative' // Add position for loading overlay
      }}
      aria-label="Interactive map for location selection"
      tabIndex={0}
    >
      {isLoading && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 1000,
            borderRadius: '0.5rem'
          }}
          aria-label="Map is loading"
        >
          <div class="loading-spinner" />
        </div>
      )}
    </div>
  );
};