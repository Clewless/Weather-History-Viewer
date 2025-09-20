import { h } from 'preact';

import type { JSX } from 'preact/jsx-runtime';
import { useState, useEffect, useCallback, useRef } from 'preact/hooks';


import { getMapTileUrl } from '../map';

// Geographic constants
const FULL_CIRCLE_DEGREES = 360;
const HALF_CIRCLE_DEGREES = 180;
const MERCATOR_LATITUDE_LIMIT = 85;
const DEFAULT_MAP_SIZE = 1024;
const MIN_MAP_HEIGHT = 400;
const MAP_BORDER_RADIUS = 4;
const MARKER_SIZE = 20;
const MARKER_BORDER_WIDTH = 2;

// Helper functions for Mercator projection (dynamic size)
const latLngToPoint = (lat: number, lng: number, zoom: number, size: { width: number; height: number }): { x: number; y: number } => {
  const x = (lng + HALF_CIRCLE_DEGREES) / FULL_CIRCLE_DEGREES * size.width;
  const sinLat = Math.sin(lat * Math.PI / HALF_CIRCLE_DEGREES);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * size.height;
  return { x, y };
};

const pointToLatLng = (x: number, y: number, zoom: number, size: { width: number; height: number }): { lat: number; lng: number } => {
  const worldX = x / size.width;
  const worldY = y / size.height;
  const lng = worldX * FULL_CIRCLE_DEGREES - HALF_CIRCLE_DEGREES;
  const n = Math.PI - 2 * Math.PI * worldY;
  const lat = HALF_CIRCLE_DEGREES / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
};

interface MapProps {
  latitude: number;
  longitude: number;
  onLocationSelect?: (lat: number, lng: number) => void;
}

interface Tile {
  x: number;
  y: number;
  url: string;
}

interface MarkerPosition {
  x: number;
  y: number;
}

export const MapComponent = ({ latitude, longitude, onLocationSelect }: MapProps): JSX.Element => {
  const [zoom] = useState(2);
  const tileSize = 256;
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [markerPosition, setMarkerPosition] = useState<MarkerPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapSize, setMapSize] = useState({ width: DEFAULT_MAP_SIZE, height: DEFAULT_MAP_SIZE });

  // Resize observer for container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMapSize({ width: Math.max(rect.width, DEFAULT_MAP_SIZE), height: Math.max(rect.height, DEFAULT_MAP_SIZE) });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Generate tiles for the world map (dynamic scaling)
  const generateTiles = useCallback(() => {
    const newTiles: Tile[] = [];
    const scale = Math.pow(2, zoom);
    const worldSize = scale * tileSize; // Base world size at zoom
    const tileRepeatX = Math.ceil(mapSize.width / worldSize);
    const tileRepeatY = Math.ceil(mapSize.height / worldSize);
    const maxTileIndex = scale - 1;

    for (let rx = 0; rx < tileRepeatX; rx++) {
      for (let tx = 0; tx <= maxTileIndex; tx++) {
        for (let ry = 0; ry < tileRepeatY; ry++) {
          for (let ty = 0; ty <= maxTileIndex; ty++) {
            const x = (rx * scale + tx) * tileSize;
            const y = (ry * scale + ty) * tileSize;
            newTiles.push({
              x,
              y,
              url: getMapTileUrl(zoom, tx, ty)
            });
          }
        }
      }
    }
    setTiles(newTiles);
  }, [zoom, tileSize, mapSize]);

  // Update marker position based on lat/lng (dynamic)
  const updateMarkerPosition = useCallback(() => {
    const point = latLngToPoint(latitude, longitude, zoom, mapSize);
    setMarkerPosition({
      x: point.x,
      y: point.y
    });
  }, [latitude, longitude, zoom, mapSize]);

  // Handle map click to select location (dynamic)
  const handleMapClick = (e: MouseEvent) => {
    const target = e.currentTarget as HTMLDivElement;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert click coordinates to lat/lng using container size
    const { lat, lng } = pointToLatLng(x, y, zoom, mapSize);
    
    // Clamp coordinates to valid ranges
    const clampedLat = Math.max(-MERCATOR_LATITUDE_LIMIT, Math.min(MERCATOR_LATITUDE_LIMIT, lat));
    const clampedLng = Math.max(-HALF_CIRCLE_DEGREES, Math.min(HALF_CIRCLE_DEGREES, lng));
    
    onLocationSelect?.(clampedLat, clampedLng);
  };

  // Handle keyboard events
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      // Use current location for keyboard interaction
      onLocationSelect?.(latitude, longitude);
    }
  };

  // Initialize tiles and marker position
  useEffect(() => {
    generateTiles();
    updateMarkerPosition();
  }, [generateTiles, updateMarkerPosition, mapSize]);

  // Update marker when lat/lng changes
  useEffect(() => {
    updateMarkerPosition();
  }, [latitude, longitude, updateMarkerPosition]);

  return (
    <div
      ref={containerRef}
      class="map-container"
      onClick={handleMapClick}
      style={{
        width: '100%',
        minHeight: `${MIN_MAP_HEIGHT}px`,
        position: 'relative',
        border: '1px solid #ddd',
        borderRadius: `${MAP_BORDER_RADIUS}px`,
        overflow: 'hidden',
        background: '#e8f4f8'
      }}
      aria-label="Interactive world map for location selection"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Render map tiles */}
      {tiles.map((tile) => (
        <img
          key={`${tile.x}-${tile.y}`}
          src={tile.url}
          class="map-tile"
          style={{
            position: 'absolute',
            left: `${tile.x}px`,
            top: `${tile.y}px`,
            width: `${tileSize}px`,
            height: `${tileSize}px`
          }}
          alt={`Map tile ${tile.x / tileSize},${tile.y / tileSize}`}
        />
      ))}
      
      {/* Render location marker */}
      {markerPosition && (
        <div
          class="map-marker"
          aria-label="Current location marker"
          role="img"
          style={{
            position: 'absolute',
            left: `${markerPosition.x}px`,
            top: `${markerPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            width: `${MARKER_SIZE}px`,
            height: `${MARKER_SIZE}px`,
            backgroundColor: 'red',
            borderRadius: '50%',
            border: `${MARKER_BORDER_WIDTH}px solid white`,
            boxShadow: '0 0 5px rgba(0,0,0,0.5)'
          }}
        />
      )}
    </div>
  );
};