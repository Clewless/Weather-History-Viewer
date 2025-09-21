import { h } from 'preact';

import { render, waitFor } from '@testing-library/preact';

import '@testing-library/jest-dom';
import { PrecipitationChart } from './PrecipitationChart';

// Mock canvas API
HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  arc: jest.fn(),
  measureText: jest.fn().mockReturnValue({ width: 10 }),
  fillText: jest.fn(),
  scale: jest.fn(),
  setTransform: jest.fn()
});

Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: jest.fn().mockReturnValue('data:image/png;base64,mock')
});

// Mock window.devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  configurable: true,
  value: 1,
});

// Mock getBoundingClientRect
HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn().mockReturnValue({
  width: 400,
  height: 150,
  top: 0,
  left: 0,
  bottom: 150,
  right: 400,
});

describe('PrecipitationChart', () => {
  const mockLocation = {
    id: 1,
    name: 'New York',
    latitude: 40.7128,
    longitude: -74.0060,
    elevation: 0,
    feature_code: 'PPL',
    country_code: 'US',
    timezone: 'America/New_York',
    country: 'United States'
  };

  const mockWeatherData = {
    location: mockLocation,
    daily: {
      time: [new Date('2023-06-15')],
      weathercode: [0],
      temperature_2m_max: [25],
      temperature_2m_min: [18],
      apparent_temperature_max: [26],
      apparent_temperature_min: [19],
      sunrise: ['05:30'],
      sunset: ['20:30'],
      precipitation_sum: [0],
      rain_sum: [0],
      showers_sum: [0],
      snowfall_sum: [0],
      precipitation_hours: [0],
      windspeed_10m_max: [10],
      windgusts_10m_max: [15],
      winddirection_10m_dominant: [180],
      shortwave_radiation_sum: [200],
      et0_fao_evapotranspiration: [5]
    },
    hourly: {
      time: [
        new Date('2023-06-15T16:00:00'), // 12:00 PM EDT (America/New_York)
        new Date('2023-06-15T17:00:00'), // 1:00 PM EDT
        new Date('2023-06-15T18:00:00'), // 2:00 PM EDT
        new Date('2023-06-15T19:00:00'), // 3:00 PM EDT
        new Date('2023-06-15T20:00:00'), // 4:00 PM EDT
      ],
      temperature_2m: [20, 21, 22, 23, 24],
      relativehumidity_2m: [60, 62, 65, 68, 70],
      dewpoint_2m: [12, 13, 14, 15, 16],
      apparent_temperature: [21, 22, 23, 24, 25],
      pressure_msl: [1013, 1012, 1011, 1010, 1009],
      surface_pressure: [1010, 1009, 1008, 1007, 1006],
      precipitation: [0, 0, 1, 2, 1],
      rain: [0, 0, 1, 2, 1],
      snowfall: [0, 0, 0, 0, 0],
      weathercode: [0, 0, 1, 2, 1],
      cloudcover: [20, 25, 30, 35, 40],
      cloudcover_low: [10, 15, 20, 25, 30],
      cloudcover_mid: [5, 10, 15, 10, 5],
      cloudcover_high: [5, 0, 5, 0, 5],
      shortwave_radiation: [100, 110, 120, 130, 140],
      direct_radiation: [80, 90, 100, 110, 120],
      diffuse_radiation: [20, 20, 20, 20, 20],
      direct_normal_irradiance: [70, 80, 90, 100, 110],
      windspeed_10m: [5, 6, 7, 8, 9],
      winddirection_10m: [180, 185, 190, 195, 200],
      windgusts_10m: [10, 12, 14, 16, 18],
      temperature_80m: [22, 23, 24, 25, 26]
    }
  };

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <PrecipitationChart
        weatherData={mockWeatherData}
        temperatureUnit="C"
        location={mockLocation}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('displays chart title', () => {
    const { getByText } = render(
      <PrecipitationChart
        weatherData={mockWeatherData}
        temperatureUnit="C"
        location={mockLocation}
      />
    );
    expect(getByText('Precipitation & Cloud Cover')).toBeInTheDocument();
  });

  it('shows placeholder when no weather data is available', () => {
    const { getByText } = render(
      <PrecipitationChart
        weatherData={null}
        temperatureUnit="C"
      />
    );
    expect(getByText('Select a location and date range to view precipitation chart')).toBeInTheDocument();
  });

  it('renders canvas when weather data is available', async () => {
    const { container } = render(
      <PrecipitationChart
        weatherData={mockWeatherData}
        temperatureUnit="C"
        location={mockLocation}
        startDate="2023-06-15"
      />
    );
    await waitFor(() => {
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  it('handles temperature unit parameter (even though not used in this chart)', async () => {
    const { container } = render(
      <PrecipitationChart
        weatherData={mockWeatherData}
        temperatureUnit="F"
        location={mockLocation}
        startDate="2023-06-15"
      />
    );
    // Just checking that it renders without errors when using Fahrenheit
    await waitFor(() => {
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });
});