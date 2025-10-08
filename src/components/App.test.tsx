import { h } from 'preact';

import { render, screen, fireEvent } from '@testing-library/preact';

import { bffSearchLocations, bffGetWeather, bffReverseGeocode } from '../api';

import App from './App';

// Mock API calls
jest.mock('../api', () => ({
  bffSearchLocations: jest.fn(),
  bffGetWeather: jest.fn(),
  bffReverseGeocode: jest.fn(),
}));

describe('App', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    });
});

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
    expect(await screen.findByText('New York, United States')).toBeInTheDocument();
  });

  it('should handle geolocation click', async () => {
    const mockLocation = { id: 1, name: 'Current Location', latitude: 37.77, longitude: -122.41, timezone: 'America/Los_Angeles' };
    (bffReverseGeocode as jest.Mock).mockResolvedValue(mockLocation);

    render(<App />);
    fireEvent.click(screen.getByText('Use My Location'));
    expect(await screen.findByText('Current Location:')).toBeInTheDocument();
  });

  it('should handle date changes', async () => {
    const mockLocations = [{ id: 1, name: 'New York', latitude: 40.71, longitude: -74.01, timezone: 'America/New_York' }];
    const mockWeather = {
      daily: {
        time: ['2023-01-01'],
        temperature_2m_max: [20.5],
        temperature_2m_min: [15.2],
        precipitation_sum: [0.5]
      },
      hourly: {
        time: ['2023-01-01T00:00', '2023-01-01T01:00'],
        temperature_2m: [18.5, 19.2],
        precipitation: [0, 0.1],
        weathercode: [1, 2],
        cloudcover: [20, 30]
      }
    };
    (bffSearchLocations as jest.Mock).mockResolvedValue(mockLocations);
    (bffGetWeather as jest.Mock).mockResolvedValue(mockWeather);

    render(<App />);
    const dateInput = screen.getByLabelText('Selected date');
    fireEvent.change(dateInput, { target: { value: '2023-01-01' } });
    expect(dateInput).toHaveValue('2023-01-01');
  });
});
