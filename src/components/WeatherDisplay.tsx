import { h } from 'preact';

import type { JSX } from 'preact/jsx-runtime';

import { DailyWeatherData, HourlyWeatherData } from '../open-meteo.js';
import { Location } from '../types.js';
import { formatLocalTime } from '../utils/weatherUtils';
import { parseDateString } from '../utils/dateUtils';

interface WeatherDisplayProps {
  weatherData?: { daily: DailyWeatherData; hourly: HourlyWeatherData } | null;
  location?: Location | null;
  temperatureUnit: 'C' | 'F';
  onTemperatureUnitChange?: (unit: 'C' | 'F') => void;
  error?: string;
  isLoading?: boolean;
}


export const WeatherDisplay = ({ weatherData, location, temperatureUnit, onTemperatureUnitChange, error, isLoading = false }: WeatherDisplayProps): JSX.Element => {
  if (error != null) {
    return (
      <div class="weather-info">
        <div class="error-message error">
          {error}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div class="weather-info">
        <div class="weather-header">
          <div class="loading-text">.....</div>
        </div>
        <div class="daily-weather">
          <h4>Loading weather data</h4>
          <div class="daily-grid">
            <div class="daily-item">
              <div class="loading-text">.....</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!weatherData || !location) {
    return (
      <div class="weather-info">
        <div class="weather-header">
          <div class="loading-text">.....</div>
        </div>
        <div class="daily-weather">
          <h4>Daily Summary</h4>
          <div class="daily-grid">
            <div class="daily-item">
              <p class="chart-placeholder">Select a location and date to view historical weather summary, including temperature highs/lows, precipitation, wind, and sun times.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const temperatureFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  const precipitationFormatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  });

  const convertTemperature = (temp: number): number => {
    if (temperatureUnit === 'F') {
      return (temp * 9/5) + 32;
    }
    return temp;
  };

  const formatTemperature = (temp: number): string => {
    return temperatureFormatter.format(Math.round(convertTemperature(temp)));
  };

  const formatPrecipitation = (precip: number): string => {
    return precipitationFormatter.format(precip);
  };

  const formatTime = (time: string, timezone: string): string => {
    return formatLocalTime(time, timezone);
  };

  const formatDate = (time: Date | string): string => {
    const date = typeof time === 'string' ? parseDateString(time) : time;
    if (!date) return 'Invalid Date';
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getWeatherIcon = (code: number): string => {
    const icons: { [key: number]: string } = {
      0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
      45: 'Fog', 48: 'Rime Fog',
      51: 'Light Drizzle', 53: 'Drizzle', 55: 'Dense Drizzle', 56: 'Freezing Drizzle', 57: 'Dense Freezing Drizzle',
      61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain', 66: 'Freezing Rain', 67: 'Heavy Freezing Rain',
      71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow', 77: 'Snow Grains',
      80: 'Light Showers', 81: 'Showers', 82: 'Heavy Showers',
      85: 'Light Snow Showers', 86: 'Snow Showers',
      95: 'Thunderstorm', 96: 'Hail Thunderstorm', 99: 'Heavy Hail'
    };
    return icons[code] || 'Unknown';
  };

  const getWeatherDescription = (code: number): string => {
    const descriptions: { [key: number]: string } = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      56: 'Light freezing drizzle',
      57: 'Dense freezing drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      66: 'Light freezing rain',
      67: 'Heavy freezing rain',
      71: 'Slight snow fall',
      73: 'Moderate snow fall',
      75: 'Heavy snow fall',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    };
    return descriptions[code] || 'Unknown weather condition';
  };

  return (
    <div class="weather-info" role="region" aria-label="Weather information">
      <div class="weather-header">
        <div class="location-name">
          {location?.name ?? 'Unknown'}, {location?.country ?? ''}
        </div>
        <div class="temp-toggle">
          <button
            class={`temp-btn ${temperatureUnit === 'C' ? 'active' : ''}`}
            onClick={() => onTemperatureUnitChange?.('C')}
            aria-label="Switch to Celsius"
            aria-pressed={temperatureUnit === 'C'}
          >
            °C
          </button>
          <button
            class={`temp-btn ${temperatureUnit === 'F' ? 'active' : ''}`}
            onClick={() => onTemperatureUnitChange?.('F')}
            aria-label="Switch to Fahrenheit"
            aria-pressed={temperatureUnit === 'F'}
          >
            °F
          </button>
        </div>
      </div>
  
      {/* Daily Weather Summary */}
      <div class="daily-weather">
        <h4>Daily Summary</h4>
        <div class="daily-grid" role="grid" aria-label="Daily weather grid">
          {weatherData?.daily?.time?.length ? weatherData.daily.time.map((time: Date | string, index: number) => {
            const date = typeof time === 'string' ? parseDateString(time) : time;
            if (!date) return null;
            
            const maxTemp = weatherData.daily.temperature_2m_max?.[index] ?? 0;
            const minTemp = weatherData.daily.temperature_2m_min?.[index] ?? 0;
            const maxTempFormatted = formatTemperature(maxTemp);
            const minTempFormatted = formatTemperature(minTemp);
            const precip = weatherData.daily.precipitation_sum?.[index] ?? 0;
            const windSpeed = weatherData.daily.windspeed_10m_max?.[index] ?? 0;
            const humidity = weatherData.daily.precipitation_hours?.[index] ?? 0; // Using precipitation_hours as humidity proxy
            const sunrise = weatherData.daily.sunrise?.[index];
            const sunset = weatherData.daily.sunset?.[index];
            
            // Determine temperature color based on max temp
            const getTempColor = (temp: number) => {
              const convertedTemp = convertTemperature(temp);
              if (convertedTemp >= 90) return 'var(--danger)'; // Very hot
              if (convertedTemp >= 80) return 'var(--warning)'; // Hot
              if (convertedTemp >= 65) return 'var(--sunny)'; // Warm
              if (convertedTemp >= 50) return 'var(--success)'; // Mild
              if (convertedTemp >= 32) return 'var(--info)'; // Cool
              return 'var(--primary)'; // Cold
            };
            
            return (
              <div key={index} class="daily-item" role="gridcell">
                {/* Date and Weather Icon */}
                <div class="daily-header">
                  <div class="daily-date">{formatDate(date)}</div>
                  <div class="daily-icon" aria-label={getWeatherDescription(weatherData.daily.weathercode?.[index] ?? 0)}>
                    <span class="weather-label">{getWeatherIcon(weatherData.daily.weathercode?.[index] ?? 0)}</span>
                  </div>
                </div>
                
                {/* Horizontal Temperature Display */}
                <div class="temperature-section">
                  <div class="temp-display">
                    <div class="temp-high">
                      <span class="temp-value" style={{ color: getTempColor(maxTemp) }}>
                        {maxTempFormatted}°
                      </span>
                      <span class="temp-label">H</span>
                    </div>
                    <span class="temp-divider">—</span>
                    <div class="temp-low">
                      <span class="temp-value" style={{ color: getTempColor(minTemp) }}>
                        {minTempFormatted}°
                      </span>
                      <span class="temp-label">L</span>
                    </div>
                  </div>
                </div>
                
                {/* Horizontal Weather Details */}
                <div class="weather-details">
                  <div class="detail-item precip">
                    <span class="detail-icon">Rain</span>
                    <span class="detail-value">{formatPrecipitation(precip)}mm</span>
                  </div>
                  <div class="detail-item wind">
                    <span class="detail-icon">Wind</span>
                    <span class="detail-value">{windSpeed.toFixed(0)} km/h</span>
                  </div>
                  <div class="detail-item humidity">
                    <span class="detail-icon">Humidity</span>
                    <span class="detail-value">{humidity.toFixed(0)}%</span>
                  </div>
                </div>
                
                {/* Horizontal Sun Times */}
                <div class="sun-times">
                  {sunrise && (
                    <div class="sun-time">
                      <span class="sun-icon">Sunrise</span>
                      <span class="sun-time-text">{formatTime(sunrise, location?.timezone || 'UTC').split(' ')[0]}</span>
                    </div>
                  )}
                  {sunset && (
                    <div class="sun-time">
                      <span class="sun-icon">Sunset</span>
                      <span class="sun-time-text">{formatTime(sunset, location?.timezone || 'UTC').split(' ')[0]}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          }) : <p>No daily data available</p>}
        </div>
      </div>
  
    </div>
  );
};