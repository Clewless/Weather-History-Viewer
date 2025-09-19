import { h } from 'preact';
import { render } from '@testing-library/preact';
import '@testing-library/jest-dom';
import { WeatherDisplay } from './WeatherDisplay';

describe('WeatherDisplay', () => {
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
    daily: {
      time: [new Date('2023-06-15'), new Date('2023-06-16')],
      weathercode: [0, 1],
      temperature_2m_max: [25, 27],
      temperature_2m_min: [18, 20],
      apparent_temperature_max: [26, 28],
      apparent_temperature_min: [19, 21],
      sunrise: ['05:30', '05:29'],
      sunset: ['20:30', '20:31'],
      precipitation_sum: [0, 5],
      rain_sum: [0, 2],
      showers_sum: [0, 1],
      snowfall_sum: [0, 0],
      precipitation_hours: [0, 3],
      windspeed_10m_max: [10, 12],
      windgusts_10m_max: [15, 18],
      winddirection_10m_dominant: [180, 190],
      shortwave_radiation_sum: [200, 210],
      et0_fao_evapotranspiration: [5, 6]
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
      cloudcover: [20, 25, 30],
      cloudcover_low: [10, 15, 20],
      cloudcover_mid: [5, 10, 15],
      cloudcover_high: [5, 0, 5],
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

  it('renders without crashing', () => {
    const { container } = render(
      <WeatherDisplay
        weatherData={mockWeatherData}
        location={mockLocation}
        temperatureUnit="C"
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('displays location name and country', () => {
    const { getByText } = render(
      <WeatherDisplay
        weatherData={mockWeatherData}
        location={mockLocation}
        temperatureUnit="C"
      />
    );
    expect(getByText('New York, United States')).toBeInTheDocument();
  });

  it('displays daily weather summary', () => {
    const { getByText, getAllByText } = render(
      <WeatherDisplay
        weatherData={mockWeatherData}
        location={mockLocation}
        temperatureUnit="C"
      />
    );
    
    // Check that daily weather section exists
    expect(getByText('Daily Summary')).toBeInTheDocument();
    
    // Check that we have daily items (we don't need to check exact dates since they depend on current date)
    const dailyItems = getAllByText(/°.*°/); // Match temperature patterns
    expect(dailyItems.length).toBeGreaterThan(0);
    
    // Check precipitation values
    const precipElements = getAllByText('0mm');
    expect(precipElements.length).toBeGreaterThan(0);
  });

  it('displays hourly weather details', () => {
    const { getByText, getAllByText } = render(
      <WeatherDisplay
        weatherData={mockWeatherData}
        location={mockLocation}
        temperatureUnit="C"
      />
    );
    
    // Check that hourly weather section exists
    expect(getByText('Hourly Details')).toBeInTheDocument();
    
    // Check first hour data
    expect(getByText('12:00 AM')).toBeInTheDocument();
    expect(getByText('20°')).toBeInTheDocument();
    
    // Use getAllByText for precipitation since there are multiple "0mm" elements
    const precipElements = getAllByText('0mm');
    expect(precipElements.length).toBeGreaterThan(0);
  });

  it('converts temperatures to Fahrenheit when selected', () => {
    const { getByText, getAllByText } = render(
      <WeatherDisplay
        weatherData={mockWeatherData}
        location={mockLocation}
        temperatureUnit="F"
      />
    );
    
    // Check that we have temperature values in Fahrenheit
    const fahrenheitTemps = getAllByText(/°/);
    expect(fahrenheitTemps.length).toBeGreaterThan(0);
    
    // Check for specific Fahrenheit temperature (20°C = 68°F)
    expect(getByText('68°')).toBeInTheDocument();
  });

  it('shows message when no weather data is available', () => {
    const { getByText } = render(
      <WeatherDisplay
        weatherData={null}
        location={null}
        temperatureUnit="C"
      />
    );
    expect(getByText('Select a location and date range to view weather data')).toBeInTheDocument();
  });

  it('shows error message when error is provided', () => {
    const { getByText } = render(
      <WeatherDisplay
        weatherData={null}
        location={null}
        temperatureUnit="C"
        error="Failed to fetch weather data"
      />
    );
    expect(getByText('Failed to fetch weather data')).toBeInTheDocument();
  });
});