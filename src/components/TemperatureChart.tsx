import { h } from 'preact'; // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Required for JSX factory
import { useEffect, useRef } from 'preact/hooks';
import { DailyWeatherData, HourlyWeatherData } from '../open-meteo';

interface TemperatureChartProps {
  weatherData?: { daily: DailyWeatherData; hourly: HourlyWeatherData } | null;
  temperatureUnit: 'C' | 'F';
}

export const TemperatureChart = ({ weatherData, temperatureUnit }: TemperatureChartProps) => {
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

    // Convert temperatures
    const temperatures = weatherData.hourly.temperature_2m.map((temp: number) => 
      temperatureUnit === 'F' ? (temp * 9/5) + 32 : temp
    );

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
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines
    const hoursToShow = Math.min(24, weatherData.hourly.time.length);
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

    temperatures.slice(0, hoursToShow).forEach((temp: number, index: number) => {
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
    temperatures.slice(0, hoursToShow).forEach((temp: number, index: number) => {
      const x = padding + (chartWidth / hoursToShow) * index;
      const y = padding + chartHeight - ((temp - minTemp) / tempRange) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw Y-axis labels (temperatures)
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 5; i++) {
      const temp = minTemp + (tempRange / 5) * (5 - i);
      const y = padding + (chartHeight / 5) * i;
      ctx.fillText(`${Math.round(temp)}°`, padding - 10, y + 4);
    }

    // Draw X-axis labels (hours)
    ctx.textAlign = 'center';
    const hoursToShowLimited = Math.min(24, weatherData.hourly.time.length);
    
    for (let i = 0; i < hoursToShowLimited; i += 3) {
      const x = padding + (chartWidth / hoursToShowLimited) * i;
      const time = weatherData.hourly.time[i];
      const hourLabel = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      ctx.fillText(hourLabel, x, rect.height - 10);
    }

    // Draw chart title
    ctx.fillStyle = '#333';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Temperature Trends', rect.width / 2, 20);

  }, [weatherData, temperatureUnit]);

  if (!weatherData) {
    return (
      <div class="chart-container">
        <h4>Temperature Trends</h4>
        <div class="chart-placeholder">
          <p>Select a location and date range to view temperature chart</p>
        </div>
      </div>
    );
  }

  return (
    <div class="chart-container">
      <h4>Temperature Trends</h4>
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '150px' }}
      />
    </div>
  );
};