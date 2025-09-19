import { h } from 'preact';
import { render, fireEvent } from '@testing-library/preact';
import '@testing-library/jest-dom';
import { MapComponent } from './MapComponent';

// Mock the map utility
jest.mock('../map', () => ({
  getMapTileUrl: jest.fn().mockReturnValue('https://example.com/tile.png')
}));

describe('MapComponent', () => {
  const mockOnLocationSelect = jest.fn();

  beforeEach(() => {
    mockOnLocationSelect.mockClear();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <MapComponent
        latitude={40.7128}
        longitude={-74.0060}
        onLocationSelect={mockOnLocationSelect}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('displays map tiles', () => {
    const { container } = render(
      <MapComponent
        latitude={40.7128}
        longitude={-74.0060}
        onLocationSelect={mockOnLocationSelect}
      />
    );
    const tiles = container.querySelectorAll('.map-tile');
    expect(tiles.length).toBeGreaterThan(0);
  });

  it('displays location marker', () => {
    const { container } = render(
      <MapComponent
        latitude={40.7128}
        longitude={-74.0060}
        onLocationSelect={mockOnLocationSelect}
      />
    );
    const marker = container.querySelector('.map-marker');
    expect(marker).toBeInTheDocument();
  });

  it('calls onLocationSelect when map is clicked', () => {
    const { container } = render(
      <MapComponent
        latitude={40.7128}
        longitude={-74.0060}
        onLocationSelect={mockOnLocationSelect}
      />
    );
    const mapContainer = container.querySelector('.map-container') as HTMLButtonElement;
    
    // Simulate click event
    fireEvent.click(mapContainer, { clientX: 100, clientY: 100 });
    
    // Check that onLocationSelect was called
    expect(mockOnLocationSelect).toHaveBeenCalled();
  });

  it('handles keyboard events', () => {
    const { container } = render(
      <MapComponent
        latitude={40.7128}
        longitude={-74.0060}
        onLocationSelect={mockOnLocationSelect}
      />
    );
    const mapContainer = container.querySelector('.map-container') as HTMLButtonElement;
    
    // Simulate Enter key press
    fireEvent.keyDown(mapContainer, { key: 'Enter' });
    
    // Check that onLocationSelect was called
    expect(mockOnLocationSelect).toHaveBeenCalled();
    
    // Clear mock for next test
    mockOnLocationSelect.mockClear();
    
    // Simulate Space key press
    fireEvent.keyDown(mapContainer, { key: ' ' });
    
    // Check that onLocationSelect was called
    expect(mockOnLocationSelect).toHaveBeenCalled();
  });

  it('renders with correct aria-label', () => {
    const { getByLabelText } = render(
      <MapComponent
        latitude={40.7128}
        longitude={-74.0060}
        onLocationSelect={mockOnLocationSelect}
      />
    );
    expect(getByLabelText('Interactive world map for location selection')).toBeInTheDocument();
  });
});