import { h } from 'preact';

import type { JSX } from 'preact/jsx-runtime';
import { useEffect, useRef } from 'preact/hooks';

import { DailyWeatherData, HourlyWeatherData } from '../open-meteo.js';
import { Location } from '../types.js';
import { getLocalDayHours, formatLocalTime } from '../utils/weatherUtils';
import { getCurrentDateString } from '../utils/dateUtils';

interface PrecipitationChartProps {
  weatherData?: { daily: DailyWeatherData; hourly: HourlyWeatherData } | null;
  temperatureUnit: 'C' | 'F';
  location?: Location | null;
  startDate?: string;
  isLoading?: boolean;
}

export const PrecipitationChart = ({ weatherData, temperatureUnit, location, startDate, isLoading = false }: PrecipitationChartProps): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Chart rendering constants
  const CHART_PADDING = 40;
  const CLOUD_COVER_MAX = 100;
  const PRECIPITATION_BAR_WIDTH_RATIO = 0.6;
  const PRECIPITATION_HEIGHT_RATIO = 0.4;
  const CLOUD_COVER_HEIGHT_RATIO = 0.3;
  const CLOUD_COVER_VERTICAL_POSITION = 0.7;
  const LEGEND_SQUARE_SIZE = 15;
  const FONT_SIZE_SMALL = 12;
  const FONT_SIZE_MEDIUM = 14;
  const LABEL_OFFSET_X = 10;
  const LABEL_OFFSET_Y = 4;
  const HOUR_LABEL_OFFSET = 10;
  const LEGEND_PRECIPITATION_X_OFFSET = 80;
  const LEGEND_PRECIPITATION_TEXT_X_OFFSET = 60;
  const LEGEND_CLOUD_X_OFFSET = 20;
  const LEGEND_CLOUD_TEXT_X_OFFSET = 40;
  const LEGEND_Y_POSITION = 15;
  const LEGEND_TEXT_Y_POSITION = 27;

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
    const precipitationData = localData.precip;
    const cloudCoverData = localData.cloudcover;

    // Find max values for scaling
    const maxPrecipitation = Math.max(...precipitationData) || 1;
    const maxCloudCover = CLOUD_COVER_MAX; // Cloud cover is percentage

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
    const hoursToShow = precipitationData.length;
    for (let i = 0; i <= hoursToShow; i += 3) {
      const x = padding + (chartWidth / hoursToShow) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
    }

    // Draw precipitation bars
    ctx.fillStyle = '#4dabf7';
    precipitationData.forEach((precip: number, index: number) => {
      const x = padding + (chartWidth / hoursToShow) * index;
      const barWidth = chartWidth / hoursToShow * PRECIPITATION_BAR_WIDTH_RATIO;
      const barHeight = (precip / maxPrecipitation) * (chartHeight * PRECIPITATION_HEIGHT_RATIO); // Use 40% of chart height
      const y = padding + chartHeight - barHeight;
      
      ctx.fillRect(x + barWidth * 0.2, y, barWidth, barHeight);
    });

    // Draw cloud cover line
    ctx.strokeStyle = '#868e96';
    ctx.lineWidth = 2;
    ctx.beginPath();

    cloudCoverData.forEach((cover: number, index: number) => {
      const x = padding + (chartWidth / hoursToShow) * index;
      const y = padding + chartHeight * CLOUD_COVER_VERTICAL_POSITION - (cover / maxCloudCover) * (chartHeight * CLOUD_COVER_HEIGHT_RATIO); // Use top 30% of chart
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw cloud cover data points
    ctx.fillStyle = '#868e96';
    cloudCoverData.forEach((cover: number, index: number) => {
      const x = padding + (chartWidth / hoursToShow) * index;
      const y = padding + chartHeight * CLOUD_COVER_VERTICAL_POSITION - (cover / maxCloudCover) * (chartHeight * CLOUD_COVER_HEIGHT_RATIO);
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw Y-axis labels (left side - precipitation)
    ctx.fillStyle = '#4dabf7';
    ctx.font = `${FONT_SIZE_SMALL}px sans-serif`;
    ctx.textAlign = 'right';
    
    Array.from({ length: 6 }).forEach((_, i) => {
      const precip = (maxPrecipitation / 5) * (5 - i);
      const y = padding + (chartHeight / 5) * i;
      ctx.fillText(`${precip.toFixed(1)}mm`, padding - LABEL_OFFSET_X, y + LABEL_OFFSET_Y);
    });

    // Draw Y-axis labels (right side - cloud cover)
    ctx.fillStyle = '#868e96';
    ctx.textAlign = 'left';
    
    Array.from({ length: 6 }).forEach((_, i) => {
      const cover = (maxCloudCover / 5) * (5 - i);
      const y = padding + (chartHeight / 5) * i;
      ctx.fillText(`${cover}%`, padding + chartWidth + LABEL_OFFSET_X, y + LABEL_OFFSET_Y);
    });

    // Draw X-axis labels (hours)
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    
    for (let i = 0; i < hoursToShow; i += 3) {
      const x = padding + (chartWidth / hoursToShow) * i;
      const hourLabel = formatLocalTime(localData.times[i], location.timezone);
      ctx.fillText(hourLabel, x, rect.height - HOUR_LABEL_OFFSET);
    }

    // Draw legend
    ctx.fillStyle = '#4dabf7';
    ctx.fillRect(rect.width / 2 - LEGEND_PRECIPITATION_X_OFFSET, LEGEND_Y_POSITION, LEGEND_SQUARE_SIZE, LEGEND_SQUARE_SIZE);
    ctx.fillStyle = '#333';
    ctx.font = `${FONT_SIZE_SMALL}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('Precipitation', rect.width / 2 - LEGEND_PRECIPITATION_TEXT_X_OFFSET, LEGEND_TEXT_Y_POSITION);

    ctx.fillStyle = '#868e96';
    ctx.fillRect(rect.width / 2 + LEGEND_CLOUD_X_OFFSET, LEGEND_Y_POSITION, LEGEND_SQUARE_SIZE, LEGEND_SQUARE_SIZE);
    ctx.fillStyle = '#333';
    ctx.fillText('Cloud Cover', rect.width / 2 + LEGEND_CLOUD_TEXT_X_OFFSET, LEGEND_TEXT_Y_POSITION);

    // Draw chart title
    ctx.fillStyle = '#333';
    ctx.font = `${FONT_SIZE_MEDIUM}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Precipitation & Cloud Cover', rect.width / 2, 20);

  }, [weatherData, temperatureUnit, location, startDate]);

  // Data guard for empty localData
  const effectiveStartDate = startDate || getCurrentDateString();
  const emptyHourly = {
    time: [],
    precipitation: [],
    cloudcover: [],
    temperature_2m: [],
    weathercode: [],
  } as unknown as HourlyWeatherData;
  const hourlyData = weatherData?.hourly || emptyHourly;
  const localData = getLocalDayHours(hourlyData, location || { timezone: 'UTC' } as unknown as Location, effectiveStartDate);
  if (isLoading) {
    return (
      <div class="chart-container">
        <h4>Precipitation & Cloud Cover</h4>
        <div class="loading-text">.....</div>
      </div>
    );
  }

  if (localData.precip.length === 0 && weatherData && location) {
    return (
      <div class="chart-container">
        <h4>Precipitation & Cloud Cover</h4>
        <div class="chart-placeholder">
          <p>No precipitation or cloud cover data available for the selected date and location. Try a different historical date from 1940 onwards.</p>
        </div>
      </div>
    );
  }

  if (!weatherData || !location) {
    return (
      <div class="chart-container">
        <h4>Precipitation & Cloud Cover</h4>
        <div class="loading-text">.....</div>
      </div>
    );
  }

  return (
    <div class="chart-container">
      <h4>Precipitation & Cloud Cover</h4>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '150px' }}
      />
    </div>
  );
};