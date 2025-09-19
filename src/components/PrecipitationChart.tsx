import { h } from 'preact'; // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Required for JSX factory
import { useEffect, useRef } from 'preact/hooks';
import { DailyWeatherData, HourlyWeatherData } from '../open-meteo';

interface PrecipitationChartProps {
  weatherData?: { daily: DailyWeatherData; hourly: HourlyWeatherData } | null;
  temperatureUnit: 'C' | 'F';
}

export const PrecipitationChart = ({ weatherData, temperatureUnit }: PrecipitationChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!weatherData || !canvasRef.current) return;

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
    const padding = 40;
    const chartWidth = rect.width - padding * 2;
    const chartHeight = rect.height - padding * 2;

    // Data to show
    const hoursToShow = Math.min(24, weatherData.hourly.time.length);
    const precipitationData = weatherData.hourly.precipitation.slice(0, hoursToShow);
    const cloudCoverData = weatherData.hourly.cloudcover.slice(0, hoursToShow);

    // Find max values for scaling
    const maxPrecipitation = Math.max(...precipitationData) || 1;
    const maxCloudCover = 100; // Cloud cover is percentage

    // Draw chart background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(padding, padding, chartWidth, chartHeight);

    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines
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
      const barWidth = chartWidth / hoursToShow * 0.6;
      const barHeight = (precip / maxPrecipitation) * (chartHeight * 0.4); // Use 40% of chart height
      const y = padding + chartHeight - barHeight;
      
      ctx.fillRect(x + barWidth * 0.2, y, barWidth, barHeight);
    });

    // Draw cloud cover line
    ctx.strokeStyle = '#868e96';
    ctx.lineWidth = 2;
    ctx.beginPath();

    cloudCoverData.forEach((cover: number, index: number) => {
      const x = padding + (chartWidth / hoursToShow) * index;
      const y = padding + chartHeight * 0.7 - (cover / maxCloudCover) * (chartHeight * 0.3); // Use top 30% of chart
      
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
      const y = padding + chartHeight * 0.7 - (cover / maxCloudCover) * (chartHeight * 0.3);
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw Y-axis labels (left side - precipitation)
    ctx.fillStyle = '#4dabf7';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 5; i++) {
      const precip = (maxPrecipitation / 5) * (5 - i);
      const y = padding + (chartHeight / 5) * i;
      ctx.fillText(`${precip.toFixed(1)}mm`, padding - 10, y + 4);
    }

    // Draw Y-axis labels (right side - cloud cover)
    ctx.fillStyle = '#868e96';
    ctx.textAlign = 'left';
    
    for (let i = 0; i <= 5; i++) {
      const cover = (maxCloudCover / 5) * (5 - i);
      const y = padding + (chartHeight / 5) * i;
      ctx.fillText(`${cover}%`, padding + chartWidth + 10, y + 4);
    }

    // Draw X-axis labels (hours)
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    
    for (let i = 0; i < hoursToShow; i += 3) {
      const x = padding + (chartWidth / hoursToShow) * i;
      const time = new Date(weatherData.hourly.time[i]);
      const hourLabel = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      ctx.fillText(hourLabel, x, rect.height - 10);
    }

    // Draw legend
    ctx.fillStyle = '#4dabf7';
    ctx.fillRect(rect.width / 2 - 80, 15, 15, 15);
    ctx.fillStyle = '#333';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Precipitation', rect.width / 2 - 60, 27);

    ctx.fillStyle = '#868e96';
    ctx.fillRect(rect.width / 2 + 20, 15, 15, 15);
    ctx.fillStyle = '#333';
    ctx.fillText('Cloud Cover', rect.width / 2 + 40, 27);

    // Draw chart title
    ctx.fillStyle = '#333';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Precipitation & Cloud Cover', rect.width / 2, 20);

  }, [weatherData, temperatureUnit]);

  if (!weatherData) {
    return (
      <div class="chart-container">
        <h4>Precipitation & Cloud Cover</h4>
        <div class="chart-placeholder">
          <p>Select a location and date range to view precipitation chart</p>
        </div>
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