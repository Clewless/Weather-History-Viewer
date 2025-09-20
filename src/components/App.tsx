import { h, Component } from 'preact';

import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';

import { bffSearchLocations, bffGetWeather, bffReverseGeocode } from '../api';
import { Location, DailyWeatherData, HourlyWeatherData } from '../open-meteo';
import { CacheManager } from '../utils/cacheManager';

import { MapComponent } from './MapComponent';
import { DateSelector } from './DateSelector';
import { LocationSearch } from './LocationSearch';
import { WeatherDisplay } from './WeatherDisplay';
import { TemperatureChart } from './TemperatureChart';
import { PrecipitationChart } from './PrecipitationChart';
import { useErrorHandler } from './useErrorHandler';

import '../styles.css';

// Default location coordinates (New York City)
const DEFAULT_LATITUDE = 40.7128;
const DEFAULT_LONGITUDE = -74.0060;


interface ErrorBoundaryProps {
  children: unknown;
  onError: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// ErrorBoundary component to catch and handle errors gracefully
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    // Unused param, but kept for standard signature
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    // Log error info for debugging
    console.error('Error boundary caught:', error, errorInfo);
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div class="error-boundary">
          <h2>Something went wrong</h2>
          <p>We're sorry, but an unexpected error occurred. Please try refreshing the page or come back later.</p>
          <button onClick={() => window.location.reload()} class="retry-button">
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface WeatherData {
  daily: DailyWeatherData;
  hourly: HourlyWeatherData;
}

const App = () => {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [geolocationRequested, setGeolocationRequested] = useState<boolean>(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [temperatureUnit, setTemperatureUnit] = useState<'C' | 'F'>('F');
  const { error, isLoading, handleError, clearError, setLoadingState } = useErrorHandler();

  // Create cache managers with different TTLs for different data types using useMemo
  const searchCache = useMemo(() => new CacheManager<Location[]>(5 * 60 * 1000), []); // 5 minutes
  const weatherCache = useMemo(() => new CacheManager<WeatherData>(60 * 60 * 1000), []); // 1 hour
  const reverseGeocodeCache = useMemo(() => new CacheManager<Location>(30 * 60 * 1000), []); // 30 minutes

  const getCacheKey = useCallback((fnName: string, ...args: unknown[]) => `${fnName}:${JSON.stringify(args)}`, []);

  const cachedSearchLocations = useCallback(async (query: string): Promise<Location[]> => {
    const key = getCacheKey('searchLocations', query);
    const cached = searchCache.get(key);
    if (cached) return cached;
    const data = await bffSearchLocations(query);
    searchCache.set(key, data);
    return data;
  }, [searchCache, getCacheKey]);

  const cachedGetWeather = useCallback(async (location: Location, start: string, end: string): Promise<WeatherData> => {
    const key = getCacheKey('getWeather', location.latitude, location.longitude, start, end);
    const cached = weatherCache.get(key);
    if (cached) return cached;
    const data = await bffGetWeather(location, start, end);
    weatherCache.set(key, data);
    return data;
  }, [weatherCache, getCacheKey]);

  const cachedReverseGeocode = useCallback(async (lat: number, lng: number): Promise<Location> => {
    const key = getCacheKey('reverseGeocode', lat, lng);
    const cached = reverseGeocodeCache.get(key);
    if (cached) return cached;
    const data = await bffReverseGeocode(lat, lng);
    reverseGeocodeCache.set(key, data);
    return data;
  }, [reverseGeocodeCache, getCacheKey]);

  const fetchWeatherData = useCallback(async (location: Location, start: string, end: string) => {
    setLoadingState(true);
    clearError();
    try {
      const data = await cachedGetWeather(location, start, end);
      setWeatherData(data);
    } catch {
      const errorMsg = 'Failed to fetch weather data. Please check your inputs and try again.';
      handleError(errorMsg);
    } finally {
      setLoadingState(false);
    }
  }, [cachedGetWeather, setLoadingState, clearError, handleError, setWeatherData]);

  const handleGeolocationClick = useCallback(async () => {
    if (geolocationRequested) return;
    setGeolocationRequested(true);
    setLoadingState(true);
    clearError();
    
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
          });
        });
        
        try {
          const location = await cachedReverseGeocode(position.coords.latitude, position.coords.longitude);
          setCurrentLocation(location);
          handleError('Location set to your current position.', 'info');
        } catch {
          handleError('Could not determine your exact location. Using coordinates.', 'warning');
          const fallbackLocation: Location = {
            id: 0,
            name: `Your location (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            elevation: 0,
            feature_code: 'PPL',
            country_code: 'XX',
            timezone: 'UTC',
            country: 'Unknown'
          };
          setCurrentLocation(fallbackLocation);
        }
      } catch (err) {
        if (err instanceof GeolocationPositionError) {
          if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
            handleError('Geolocation access denied. Using default location.', 'warning');
          } else if (err.code === GeolocationPositionError.POSITION_UNAVAILABLE) {
            handleError('Location information unavailable. Using default location.', 'warning');
          } else {
            handleError('Geolocation timeout. Using default location.', 'warning');
          }
        } else {
          handleError('Geolocation error. Using default location.', 'warning');
        }
      } finally {
        setLoadingState(false);
      }
    } else {
      handleError('Geolocation not supported by this browser.', 'warning');
      setLoadingState(false);
    }
  }, [geolocationRequested, cachedReverseGeocode, handleError, setCurrentLocation, setLoadingState, clearError, setGeolocationRequested]);

  const handleLocationSelect = useCallback((location: Location) => {
    clearError();
    setCurrentLocation(location);
    // fetch triggered by useEffect
  }, [clearError, setCurrentLocation]);

  const handleMapLocationSelect = useCallback(async (lat: number, lng: number) => {
    clearError();
    setLoadingState(true);
    try {
      const location = await cachedReverseGeocode(lat, lng);
      setCurrentLocation(location);
      // fetch triggered by useEffect
    } catch {
      handleError('Failed to get location from map click');
    } finally {
      setLoadingState(false);
    }
  }, [clearError, setLoadingState, cachedReverseGeocode, setCurrentLocation, handleError]);

  const handleTemperatureUnitChange = useCallback((unit: 'C' | 'F') => {
    setTemperatureUnit(unit);
  }, [setTemperatureUnit]);

  // Set default to today
  const today = new Date();
  const formatDate = (date: Date): string => date.toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(today));

  // Debounce utility to prevent excessive API calls on rapid date changes
  const debounce = useCallback((callback: (date: string) => void, delay: number) => {
    let timeoutId: number;
    return (date: string) => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => callback(date), delay);
    };
  }, []);

  const validateDate = useCallback((date: string): boolean => {
    // Validate format for date
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      handleError('Date must be in YYYY-MM-DD format');
      return false;
    }
    
    // More robust date validation
    const [year, month, day] = date.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day); // month is 0-indexed in Date constructor
    
    // Check if the date is valid (e.g., not February 30)
    if (parsedDate.getFullYear() !== year || 
        parsedDate.getMonth() !== month - 1 || 
        parsedDate.getDate() !== day) {
      handleError('Invalid date provided (e.g., February 30)');
      return false;
    }
    
    // Check if date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsedDate.setHours(0, 0, 0, 0);
    
    if (parsedDate > today) {
      handleError('Selected date cannot be in the future');
      return false;
    }
    
    return true;
  }, [handleError]);

  const handleDateChange = useCallback((date: string) => {
    if (!validateDate(date)) return;
    clearError();
    setSelectedDate(date);
  }, [validateDate, clearError, setSelectedDate]);

  const debouncedDateChange = useCallback(debounce(handleDateChange, 500), [debounce, handleDateChange]);

  const handleDateChangeDebounced = useCallback((date: string) => debouncedDateChange(date), [debouncedDateChange]);

  useEffect(() => {
    // Load default location without geolocation
    const controller = new AbortController();
    const loadDefaultLocation = async () => {
      setLoadingState(true);
      clearError();
      
      // Use hardcoded default location (New York) to avoid API dependency on startup
      const defaultLocation: Location = {
        id: 5128581,
        name: 'New York',
        latitude: DEFAULT_LATITUDE,
        longitude: DEFAULT_LONGITUDE,
        elevation: 10,
        feature_code: 'PPL',
        country_code: 'US',
        timezone: 'America/New_York',
        country: 'United States'
      };
      
      setCurrentLocation(defaultLocation);
      handleError('Using default location: New York', 'info');
      // Initial fetch with selected date
      fetchWeatherData(defaultLocation, selectedDate, selectedDate);
      setLoadingState(false);
    };

    loadDefaultLocation();
    return () => controller.abort();
  }, [cachedSearchLocations, fetchWeatherData, setLoadingState, clearError, handleError, selectedDate, setCurrentLocation]);

  useEffect(() => {
    if (currentLocation && selectedDate && !isLoading) {
      fetchWeatherData(currentLocation, selectedDate, selectedDate);
    }
  }, [currentLocation, selectedDate, isLoading, fetchWeatherData]);

  return (
    <ErrorBoundary onError={(error) => handleError(error.message, 'error')}>
      <div class="app-container">
        <header class="header">
          <h1>Weather History Viewer</h1>
          <p>Explore historical weather data from 1940 to present</p>
        </header>

        {error && (
          <div class={`error-message ${error.type}`} role="alert">
            {error.message}
          </div>
        )}

        {isLoading && (
          <div class="loading-message" role="status" aria-live="polite">
            Loading weather data...
          </div>
        )}

        <div class="left-panel">
          <div class="controls-section">
            <div class="geolocation-section">
              <button onClick={handleGeolocationClick} disabled={geolocationRequested} class="geolocation-btn" aria-label="Use my current location" aria-describedby="geolocation-desc">
                {geolocationRequested ? 'Using your location...' : 'Use My Location'}
              </button>
              <p id="geolocation-desc" class="geolocation-desc">
                Click to use your current location (requires permission for privacy).
              </p>
            </div>
            <LocationSearch
              onLocationSelect={handleLocationSelect}
              currentLocation={currentLocation}
            />
            <DateSelector
             selectedDate={selectedDate}
             onDateChange={handleDateChangeDebounced}
             loading={isLoading}
           />
          </div>
          <div class="map-section">
            <MapComponent
             latitude={currentLocation?.latitude || DEFAULT_LATITUDE}
             longitude={currentLocation?.longitude || DEFAULT_LONGITUDE}
             onLocationSelect={handleMapLocationSelect}
             aria-label="Interactive map for location selection"
           />
          </div>
        </div>

        {!isLoading && !error?.message && (
          <div class="weather-section">
            <WeatherDisplay
              weatherData={weatherData}
              location={currentLocation}
              temperatureUnit={temperatureUnit}
              onTemperatureUnitChange={handleTemperatureUnitChange}
              aria-label="Weather display for selected location and date range"
            />
            <TemperatureChart
              weatherData={weatherData}
              temperatureUnit={temperatureUnit}
              aria-label="Temperature chart"
            />
            <PrecipitationChart
              weatherData={weatherData}
              temperatureUnit={temperatureUnit}
              aria-label="Precipitation chart"
            />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;