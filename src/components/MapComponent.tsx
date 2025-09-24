import { h } from 'preact';

import type { JSX } from 'preact/jsx-runtime';
import { useEffect, useRef } from 'preact/hooks';

import L from 'leaflet';
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

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize map
    const map = L.map(containerRef.current).setView([latitude, longitude], 10);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

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
        height: '400px',
        borderRadius: '0.5rem',
        overflow: 'hidden'
      }}
      aria-label="Interactive map for location selection"
      tabIndex={0}
    />
  );
};