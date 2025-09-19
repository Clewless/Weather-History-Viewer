import { h } from 'preact';
import { render } from '@testing-library/preact';
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

describe('PrecipitationChart', () => {
  const mockWeatherData = {
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
        new Date('2023-06-15T00:00:00'),
        new Date('2023-06-15T01:00:00'),
        new Date('2023-06-15T02:00:00')
      ],
      temperature_2m: [20, 21, 22],
      relativehumidity_2m: [60, 62, 65],
      dewpoint_2m: [12, 13, 14],
      apparent_temperature: [21, 22, 23],
      pressure_msl: [1013, 1012, 1011],
      surface_pressure: [1010, 1009, 1008],
      precipitation: [0, 0, 1],
      rain: [0, 0, 1],
      snowfall: [0, 0, 0],
      weathercode: [0, 0, 1],
      cloudcover: [20, 30, 40],
      cloudcover_low: [10, 15, 20],
      cloudcover_mid: [5, 10, 15],
      cloudcover_high: [5, 5, 5],
      shortwave_radiation: [100, 110, 120],
      direct_radiation: [80, 90, 100],
      diffuse_radiation: [20, 20, 20],
      direct_normal_irradiance: [70, 80, 90],
      windspeed_10m: [5, 6, 7],
      winddirection_10m: [180, 185, 190],
      windgusts_10m: [10, 12, 14],
      temperature_80m: [22, 23, 24]
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
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('displays chart title', () => {
    const { getByText } = render(
      <PrecipitationChart
        weatherData={mockWeatherData}
        temperatureUnit="C"
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

  it('renders canvas when weather data is available', () => {
    const { container } = render(
      <PrecipitationChart
        weatherData={mockWeatherData}
        temperatureUnit="C"
      />
    );
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('handles temperature unit parameter (even though not used in this chart)', () => {
    const { container } = render(
      <PrecipitationChart
        weatherData={mockWeatherData}
        temperatureUnit="F"
      />
    );
    // Just checking that it renders without errors when using Fahrenheit
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });
});