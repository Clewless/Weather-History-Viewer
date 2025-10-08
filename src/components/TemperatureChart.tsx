import { h } from 'preact';

import type { JSX } from 'preact/jsx-runtime';
import { useEffect, useRef } from 'preact/hooks';

import { DailyWeatherData, HourlyWeatherData } from '../open-meteo.js';
import { Location } from '../types.js';
import { getLocalDayHours, formatLocalTime } from '../utils/weatherUtils';
import { getCurrentDateString } from '../utils/dateUtils';

interface TemperatureChartProps {
  weatherData?: { daily: DailyWeatherData; hourly: HourlyWeatherData } | null;
  temperatureUnit: 'C' | 'F';
  location?: Location | null;
  startDate?: string;
  isLoading?: boolean;
}

export const TemperatureChart = ({ weatherData, temperatureUnit, location, startDate, isLoading = false }: TemperatureChartProps): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Chart rendering constants
  const CHART_PADDING = 40;
  const FAHRENHEIT_CONVERSION_FACTOR = 9/5;
  const FAHRENHEIT_CONVERSION_OFFSET = 32;
  const CHART_TITLE_Y_POSITION = 20;

  useEffect(() => {
    if (!weatherData || !location || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Chart dimensions
    const padding = CHART_PADDING;
    const chartWidth = rect.width - padding * 2;
    const chartHeight = rect.height - padding * 2;

    const effectiveStartDate = startDate || getCurrentDateString();
    const localData = getLocalDayHours(weatherData.hourly, location, effectiveStartDate);
    console.log('[DEBUG] TemperatureChart: localData', {
      tempsLength: localData.temps.length,
      timesLength: localData.times.length,
      startDate: effectiveStartDate,
      location: location?.name
    });
    const temperatures = localData.temps.map((temp: number) =>
      temperatureUnit === 'F' ? (temp * FAHRENHEIT_CONVERSION_FACTOR) + FAHRENHEIT_CONVERSION_OFFSET : temp
    );

    if (temperatures.length === 0) {
      console.log('[DEBUG] TemperatureChart: No temperatures data, skipping render');
      return;
    }

    // Find min and max temperatures
    const maxTemp = Math.max(...temperatures);
    const minTemp = Math.min(...temperatures);
    const tempRange = maxTemp - minTemp || 1; // Avoid division by zero

    // Draw chart background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(padding, padding, chartWidth, chartHeight);

    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    Array.from({ length: 6 }).forEach((_, i) => {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    });

    // Vertical grid lines
    const hoursToShow = temperatures.length;
    for (let i = 0; i <= hoursToShow; i += 3) {
      const x = padding + (chartWidth / hoursToShow) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
    }

    // Draw temperature line
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.beginPath();

    temperatures.forEach((temp: number, index: number) => {
      const x = padding + (chartWidth / hoursToShow) * index;
      const y = padding + chartHeight - ((temp - minTemp) / tempRange) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw data points
    ctx.fillStyle = '#ff6b6b';
    temperatures.forEach((temp: number, index: number) => {
      const x = padding + (chartWidth / hoursToShow) * index;
      const y = padding + chartHeight - ((temp - minTemp) / tempRange) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw Y-axis labels
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    
    Array.from({ length: 6 }).forEach((_, i) => {
      const temp = minTemp + (tempRange / 5) * (5 - i);
      const y = padding + (chartHeight / 5) * i;
      ctx.fillText(`${Math.round(temp)}°${temperatureUnit}`, padding - 10, y + 4);
    });

    // Draw X-axis labels (hours)
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    
    for (let i = 0; i < hoursToShow; i += 3) {
      const x = padding + (chartWidth / hoursToShow) * i;
      const hourLabel = formatLocalTime(localData.times[i], location.timezone);
      ctx.fillText(hourLabel, x, rect.height - 10);
    }

    // Draw chart title
    ctx.fillStyle = '#333';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Temperature', rect.width / 2, CHART_TITLE_Y_POSITION);

  }, [weatherData, temperatureUnit, location, startDate]);

  // Data guard for empty localData
  const effectiveStartDate = startDate || getCurrentDateString();
  const emptyHourly = {
    time: [],
    temperature_2m: [],
    precipitation: [],
    weathercode: [],
    cloudcover: [],
  } as unknown as HourlyWeatherData;
  const hourlyData = weatherData?.hourly || emptyHourly;
  const localData = getLocalDayHours(hourlyData, location || {
    id: 0,
    name: 'Unknown Location',
    latitude: 0,
    longitude: 0,
    elevation: 0,
    feature_code: 'PPL',
    country_code: 'XX',
    timezone: 'UTC',
    country: 'Unknown'
  } as Location, effectiveStartDate);
  if (isLoading) {
    return (
      <div class="chart-container">
        <h4>Temperature</h4>
        <div class="loading-text">.....</div>
      </div>
    );
  }

  if (localData.temps.length === 0 && weatherData && location) {
    return (
      <div class="chart-container">
        <h4>Temperature</h4>
        <div class="chart-placeholder">
          <p>No temperature data available for the selected date and location. Try a different historical date from 1940 onwards.</p>
        </div>
      </div>
    );
  }

  if (!weatherData || !location) {
    return (
      <div class="chart-container">
        <h4>Temperature</h4>
        <div class="loading-text">.....</div>
      </div>
    );
  }

  return (
    <div class="chart-container">
      <h4>Temperature</h4>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '150px' }}
      />
    </div>
  );
};