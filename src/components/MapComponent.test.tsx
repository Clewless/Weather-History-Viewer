import { h } from 'preact';

import { render, fireEvent } from '@testing-library/preact';
import '@testing-library/jest-dom';

import { MapComponent } from './MapComponent';

jest.mock('../map', () => ({
  getMapTileUrl: jest.fn().mockReturnValue('https://example.com/tile.png')
}));

describe('MapComponent', () => {
  const mockOnLocationSelect = jest.fn();

  beforeEach(() => {
    mockOnLocationSelect.mockClear();
  });

  it('renders map tiles correctly', () => {
    const { container } = render(
      <MapComponent
        latitude={40.7128}
        longitude={-74.0060}
        onLocationSelect={mockOnLocationSelect}
      />
    );
    const tiles = container.querySelectorAll('.leaflet-tile');
    expect(tiles.length).toBeGreaterThan(0);
  });

  it('renders location marker', () => {
    const { container } = render(
      <MapComponent
        latitude={40.7128}
        longitude={-74.0060}
        onLocationSelect={mockOnLocationSelect}
      />
    );
    const marker = container.querySelector('.leaflet-marker-icon');
    expect(marker).toBeInTheDocument();
  });

  it('handles keyboard events', () => {
    const { container } = render(
      <MapComponent
        latitude={40.7128}
        longitude={-74.0060}
        onLocationSelect={mockOnLocationSelect}
      />
    );
    const mapElement = container.querySelector('.map-container');
    if (mapElement) {
      fireEvent.keyDown(mapElement, { key: 'Enter' });
      expect(mockOnLocationSelect).toHaveBeenCalled();
    }
  });

  it('renders with correct aria-label', () => {
    const { getByLabelText } = render(
      <MapComponent
        latitude={40.7128}
        longitude={-74.0060}
        onLocationSelect={mockOnLocationSelect}
        aria-label="Interactive map for location selection"
      />
    );
    expect(getByLabelText('Interactive map for location selection')).toBeInTheDocument();
  });
});