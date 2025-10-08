import { h } from 'preact';
import * as preact from 'preact';

import { useEffect, useRef, useState } from 'preact/hooks';

import { map as createMap, tileLayer, Icon, marker as createMarker, type Marker, type LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet marker icons in webpack
try {
  Icon.Default.mergeOptions({
    iconRetinaUrl: '/marker-icon-2x.png',
    iconUrl: '/marker-icon.png',
    shadowUrl: '/marker-shadow.png'
  });
} catch (error) {
  console.warn('Failed to set absolute paths for Leaflet icons:', error);
}

interface MapProps {
  latitude: number;
  longitude: number;
  onLocationSelect?: (lat: number, lng: number) => void;
}

export const MapComponent = ({ latitude, longitude, onLocationSelect }: MapProps): preact.JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<Marker | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Listen for dark mode changes
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.body.classList.contains('dark-mode'));
    };
    
    checkDarkMode();
    const observer = window.MutationObserver ? new window.MutationObserver(checkDarkMode) : null;
    if (observer) {
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    return () => observer?.disconnect();
  }, []);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const map = createMap(containerRef.current, {
      zoomControl: true
    }).setView([latitude, longitude], 10);

    // Use dark or light tiles based on current mode
    const tileUrl = isDarkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    
    const attribution = isDarkMode
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    tileLayer(tileUrl, {
      attribution,
      maxZoom: 19
    }).addTo(map);

    // Add a marker at the initial location
    markerRef.current = createMarker([latitude, longitude]).addTo(map);

    // Add click event listener to handle location selection
    if (onLocationSelect) {
      const handleMapClick = (event: LeafletMouseEvent) => {
        const { lat, lng } = event.latlng;
        onLocationSelect(lat, lng);
        
        // Update the marker position
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = createMarker([lat, lng]).addTo(map);
        }
      };
      
      map.on('click', handleMapClick);
      
      // Clean up the event listener when component unmounts
      return () => {
        map.off('click', handleMapClick);
        if (markerRef.current) {
          map.removeLayer(markerRef.current);
        }
        map.remove();
      };
    }

    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }
      map.remove();
    };
  }, [latitude, longitude, onLocationSelect, isDarkMode]);

  return (
    <div
      ref={containerRef}
      className="map-container"
      aria-label="Interactive map for location selection"
      tabIndex={0}
    />
  );
};