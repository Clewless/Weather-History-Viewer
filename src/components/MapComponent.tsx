import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { getMapTileUrl } from '../map';

// Helper functions for Mercator projection
const latLngToPoint = (lat: number, lng: number, zoom: number): { x: number; y: number } => {
  const tileSize = 256;
  const scale = Math.pow(2, zoom);
  const x = (lng + 180) / 360 * scale * tileSize;
  const sinLat = Math.sin(lat * Math.PI / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale * tileSize;
  return { x, y };
};

const pointToLatLng = (x: number, y: number, zoom: number): { lat: number; lng: number } => {
  const tileSize = 256;
  const scale = Math.pow(2, zoom);
  const worldX = x / (scale * tileSize);
  const worldY = y / (scale * tileSize);
  const lng = worldX * 360 - 180;
  const n = Math.PI - 2 * Math.PI * worldY;
  const lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
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

export const MapComponent = ({ latitude, longitude, onLocationSelect }: MapProps) => {
  const [zoom] = useState(2);
  const tileSize = 256;
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [markerPosition, setMarkerPosition] = useState<MarkerPosition | null>(null);

  // Generate tiles for the world map (corrected implementation)
  const generateTiles = useCallback(() => {
    const newTiles: Tile[] = [];
    // At zoom level 2, there are only 2^2 = 4 tiles in each dimension (0-3)
    const maxTileIndex = Math.pow(2, zoom) - 1;
    
    for (let tx = 0; tx <= maxTileIndex; tx++) {
      for (let ty = 0; ty <= maxTileIndex; ty++) {
        newTiles.push({
          x: tx * tileSize,
          y: ty * tileSize,
          url: getMapTileUrl(zoom, tx, ty)
        });
      }
    }
    
    setTiles(newTiles);
  }, [zoom, tileSize]);

  // Update marker position based on lat/lng
  const updateMarkerPosition = useCallback(() => {
    const point = latLngToPoint(latitude, longitude, zoom);
    setMarkerPosition({
      x: point.x,
      y: point.y
    });
  }, [latitude, longitude, zoom]);

  // Handle map click to select location
  const handleMapClick = (e: MouseEvent) => {
    const target = e.currentTarget as HTMLDivElement;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert click coordinates to lat/lng
    const { lat, lng } = pointToLatLng(x, y, zoom);
    
    // Clamp coordinates to valid ranges
    const clampedLat = Math.max(-85, Math.min(85, lat));
    const clampedLng = Math.max(-180, Math.min(180, lng));
    
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
  }, [generateTiles, updateMarkerPosition]);

  // Update marker when lat/lng changes
  useEffect(() => {
    updateMarkerPosition();
  }, [latitude, longitude, updateMarkerPosition]);

  return (
    <div
      class="map-container"
      onClick={handleMapClick}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        border: '1px solid #ddd',
        borderRadius: '4px',
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
            width: '20px',
            height: '20px',
            backgroundColor: 'red',
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 0 5px rgba(0,0,0,0.5)'
          }}
        />
      )}
    </div>
  );
};