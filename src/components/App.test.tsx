
import { h } from 'preact'; // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Required for JSX factory
import { render, screen, fireEvent } from '@testing-library/preact';
import App from './App';
import { bffSearchLocations, bffGetWeather, bffReverseGeocode } from '../api';

// Mock API calls
jest.mock('../api', () => ({
  bffSearchLocations: jest.fn(),
  bffGetWeather: jest.fn(),
  bffReverseGeocode: jest.fn(),
}));

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the App component', () => {
    render(<App />);
    expect(screen.getByText('Weather History Viewer')).toBeInTheDocument();
  });

  it('should load default location on mount', async () => {
    const mockLocations = [{ id: 1, name: 'New York', latitude: 40.71, longitude: -74.01, timezone: 'America/New_York' }];
    (bffSearchLocations as jest.Mock).mockResolvedValue(mockLocations);

    render(<App />);
    expect(await screen.findByText('New York')).toBeInTheDocument();
  });

  it('should handle geolocation click', async () => {
    const mockLocation = { id: 1, name: 'Current Location', latitude: 37.77, longitude: -122.41, timezone: 'America/Los_Angeles' };
    (bffReverseGeocode as jest.Mock).mockResolvedValue(mockLocation);

    render(<App />);
    fireEvent.click(screen.getByText('Use My Location'));
    expect(await screen.findByText('Current Location')).toBeInTheDocument();
  });

  it('should handle date changes', async () => {
    const mockLocations = [{ id: 1, name: 'New York', latitude: 40.71, longitude: -74.01, timezone: 'America/New_York' }];
    const mockWeather = { daily: { time: [new Date()] }, hourly: { time: [new Date()] } };
    (bffSearchLocations as jest.Mock).mockResolvedValue(mockLocations);
    (bffGetWeather as jest.Mock).mockResolvedValue(mockWeather);

    render(<App />);
    const dateInput = screen.getByLabelText('Start Date');
    fireEvent.change(dateInput, { target: { value: '2023-01-01' } });
    expect(dateInput).toHaveValue('2023-01-01');
  });
});
