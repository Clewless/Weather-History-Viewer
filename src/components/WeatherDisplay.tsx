import { h } from 'preact';

import type { JSX } from 'preact/jsx-runtime';

import { DailyWeatherData, HourlyWeatherData } from '../open-meteo.js';
import { Location } from '../types';
import { getLocalDayHours, formatLocalTime } from '../utils/weatherUtils';
import { parseDateString } from '../utils/dateUtils';

interface WeatherDisplayProps {
  weatherData?: { daily: DailyWeatherData; hourly: HourlyWeatherData } | null;
  location?: Location | null;
  temperatureUnit: 'C' | 'F';
  onTemperatureUnitChange?: (unit: 'C' | 'F') => void;
  error?: string;
}


export const WeatherDisplay = ({ weatherData, location, temperatureUnit, onTemperatureUnitChange, error }: WeatherDisplayProps): JSX.Element => {
  if (error != null) {
    return (
      <div class="weather-info">
        <div class="error-message error">
          {error}
        </div>
      </div>
    );
  }

  if (!weatherData || !location) {
    return (
      <div class="weather-info">
        <p>Select a location and date range to view weather data</p>
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
      0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
      45: '🌫️', 48: '🌫️',
      51: '🌦️', 53: '🌦️', 55: '🌦️', 56: '🌨️', 57: '🌨️',
      61: '🌧️', 63: '🌧️', 65: '⛈️', 66: '🌨️', 67: '🌨️',
      71: '🌨️', 73: '🌨️', 75: '🌨️', 77: '🌨️',
      80: '🌦️', 81: '🌦️', 82: '⛈️',
      85: '🌨️', 86: '🌨️',
      95: '⛈️', 96: '⛈️', 99: '⛈️'
    };
    return icons[code] || '❓';
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
            return (
              <div key={index} class="daily-item" role="gridcell">
                <div class="daily-date">{formatDate(date)}</div>
                <div class="daily-icon" aria-label={getWeatherDescription(weatherData.daily.weathercode?.[index] ?? 0)}>
                  {getWeatherIcon(weatherData.daily.weathercode?.[index] ?? 0)}
                </div>
                <div class="daily-temp">
                  {formatTemperature(weatherData.daily.temperature_2m_max?.[index] ?? 0)}°
                  /{formatTemperature(weatherData.daily.temperature_2m_min?.[index] ?? 0)}°
                </div>
                <div class="daily-precip">
                  {formatPrecipitation(weatherData.daily.precipitation_sum?.[index] ?? 0)}mm
                </div>
              </div>
            );
          }) : <p>No daily data available</p>}
        </div>
      </div>
  
      {/* Hourly Weather */}
      <div class="hourly-weather">
        <h4>Hourly Details</h4>
        <div class="hourly-grid" role="grid" aria-label="Hourly weather grid">
          {(() => {
            const firstTime = weatherData?.daily.time[0];
            const startDate = firstTime ?
              (typeof firstTime === 'string' ? firstTime : firstTime.toISOString()).split('T')[0] :
              '';
            const localHours = getLocalDayHours(weatherData.hourly, location || { timezone: 'UTC' } as Location, startDate);
            return localHours.times.length > 0 ? localHours.times.map((time: string, index: number) => (
              <div key={index} class="hourly-item" role="gridcell">
                <div class="hourly-time">{formatTime(time, location?.timezone ?? 'UTC')}</div>
                <div class="hourly-icon" aria-label={getWeatherDescription(localHours.codes[index])}>
                  {getWeatherIcon(localHours.codes[index])}
                </div>
                <div class="hourly-temp">
                  {Math.round(convertTemperature(localHours.temps[index]))}°
                </div>
                <div class="hourly-precip">
                  {localHours.precip[index]}mm
                </div>
              </div>
            )) : <p>No hourly data available</p>;
          })()}
        </div>
      </div>
    </div>
  );
};