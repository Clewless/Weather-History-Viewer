import { h, Component, render } from 'preact';

import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';

import { startOfDay } from 'date-fns';

import { bffSearchLocations, bffGetWeather, bffReverseGeocode } from '../api';
import { Location, DailyWeatherData, HourlyWeatherData } from '../open-meteo';
import { CacheManager } from '../utils/cacheManager';
import { getCurrentDateString, parseDateString, getCurrentTimestamp, createDateFromTimestamp } from '../utils/dateUtils';
import { DEFAULT_LATITUDE, DEFAULT_LONGITUDE, CACHE_TTL } from '../constants';

import { MapComponent } from './MapComponent';
import { DateSelector } from './DateSelector';
import { LocationSearch } from './LocationSearch';
import { WeatherDisplay } from './WeatherDisplay';
import { TemperatureChart } from './TemperatureChart';
import { PrecipitationChart } from './PrecipitationChart';
import { useErrorHandler } from './useErrorHandler';
import { ErrorBoundary } from './ErrorBoundary';

import '../styles.css';



interface WeatherData {
  daily: DailyWeatherData;
  hourly: HourlyWeatherData;
}

const App = () => {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [geolocationRequested, setGeolocationRequested] = useState<boolean>(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [temperatureUnit, setTemperatureUnit] = useState<'C' | 'F'>('F');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { error, handleError, clearError } = useErrorHandler();

  // Create cache managers with different TTLs for different data types using useMemo
  const searchCache = useMemo(() => new CacheManager<Location[]>(CACHE_TTL.SEARCH), []);
  const weatherCache = useMemo(() => new CacheManager<WeatherData>(CACHE_TTL.WEATHER), []);
  const reverseGeocodeCache = useMemo(() => new CacheManager<Location>(CACHE_TTL.REVERSE_GEOCODE), []);

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
    setIsLoading(true);
    clearError();
    try {
      const data = await cachedGetWeather(location, start, end);
      setWeatherData(data);
    } catch {
      const errorMsg = 'Failed to fetch weather data. Please check your inputs and try again.';
      handleError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [cachedGetWeather, setIsLoading, clearError, handleError, setWeatherData]);

  const handleGeolocationClick = useCallback(async () => {
    if (geolocationRequested) return;
    setGeolocationRequested(true);
    setIsLoading(true);
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
        setIsLoading(false);
      }
    } else {
      handleError('Geolocation not supported by this browser.', 'warning');
      setIsLoading(false);
    }
  }, [geolocationRequested, cachedReverseGeocode, handleError, setCurrentLocation, setIsLoading, clearError, setGeolocationRequested]);

  const handleLocationSelect = useCallback((location: Location) => {
    clearError();
    setCurrentLocation(location);
    // fetch triggered by useEffect
  }, [clearError, setCurrentLocation]);

  const handleMapLocationSelect = useCallback(async (lat: number, lng: number) => {
    clearError();
    setIsLoading(true);
    try {
      const location = await cachedReverseGeocode(lat, lng);
      setCurrentLocation(location);
      // fetch triggered by useEffect
    } catch {
      handleError('Failed to get location from map click');
    } finally {
      setIsLoading(false);
    }
  }, [clearError, setIsLoading, cachedReverseGeocode, setCurrentLocation, handleError]);

  const handleTemperatureUnitChange = useCallback((unit: 'C' | 'F') => {
    setTemperatureUnit(unit);
  }, [setTemperatureUnit]);

  // Set default to today
  const todayString = getCurrentDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayString);

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
    const parsedDate = parseDateString(date); // Use dateUtils function
    
    // Check if the date is valid
    if (!parsedDate) {
      handleError('Invalid date provided');
      return false;
    }
    
    // Check if date is in the future
    const todayString = getCurrentDateString();
    const todayDate = parseDateString(todayString);
    if (!todayDate) {
      handleError('Unable to determine current date');
      return false;
    }
    const today = startOfDay(todayDate);
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
      setIsLoading(true);
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
      setIsLoading(false);
    };

    loadDefaultLocation();
    return () => controller.abort();
  }, [cachedSearchLocations, fetchWeatherData, setIsLoading, clearError, handleError, selectedDate, setCurrentLocation]);

  useEffect(() => {
    if (currentLocation && selectedDate) {
      fetchWeatherData(currentLocation, selectedDate, selectedDate);
    }
  }, [currentLocation, selectedDate, fetchWeatherData]);

  // Cleanup cache managers on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      searchCache.stopCleanup();
      weatherCache.stopCleanup();
      reverseGeocodeCache.stopCleanup();
    };
  }, [searchCache, weatherCache, reverseGeocodeCache]);

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
            <ErrorBoundary>
              <MapComponent
                latitude={currentLocation?.latitude || DEFAULT_LATITUDE}
                longitude={currentLocation?.longitude || DEFAULT_LONGITUDE}
                onLocationSelect={handleMapLocationSelect}
                aria-label="Interactive map for location selection"
              />
            </ErrorBoundary>
          </div>
        </div>

        {!isLoading && !error?.message && (
          <div class="weather-section">
            <ErrorBoundary>
              <WeatherDisplay
                weatherData={weatherData}
                location={currentLocation}
                temperatureUnit={temperatureUnit}
                onTemperatureUnitChange={handleTemperatureUnitChange}
                aria-label="Weather display for selected location and date range"
              />
            </ErrorBoundary>
            <ErrorBoundary>
              <TemperatureChart
                weatherData={weatherData}
                temperatureUnit={temperatureUnit}
                aria-label="Temperature chart"
              />
            </ErrorBoundary>
            <ErrorBoundary>
              <PrecipitationChart
                weatherData={weatherData}
                temperatureUnit={temperatureUnit}
                aria-label="Precipitation chart"
              />
            </ErrorBoundary>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;