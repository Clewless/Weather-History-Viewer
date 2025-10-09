import { h } from 'preact';

import { useState, useEffect, useCallback, useRef } from 'preact/hooks';


import { bffGetWeather, bffReverseGeocode } from '../api';
import { Location } from '../types';
import { DailyWeatherData, HourlyWeatherData } from '../open-meteo';
import { SimpleCacheManager } from '../utils/simpleCacheManager';
import { getCurrentDateString, parseDateString } from '../utils/dateUtils';
import { DEFAULT_LATITUDE, DEFAULT_LONGITUDE, CACHE_TTL, APP_VERSION } from '../constants';
import { ValidationError, APIError, NetworkError } from '../utils/simpleErrors';

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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const { error, handleError, clearError } = useErrorHandler();

  // Use refs to track cache managers for proper cleanup
  const searchCacheRef = useRef<SimpleCacheManager<Location[]>>(new SimpleCacheManager<Location[]>(CACHE_TTL.SEARCH));
  const weatherCacheRef = useRef<SimpleCacheManager<WeatherData>>(new SimpleCacheManager<WeatherData>(CACHE_TTL.WEATHER));
  const reverseGeocodeCacheRef = useRef<SimpleCacheManager<Location>>(new SimpleCacheManager<Location>(CACHE_TTL.REVERSE_GEOCODE));

  // Create cache managers with different TTLs for different data types
  const _searchCache = searchCacheRef.current;
  const weatherCache = weatherCacheRef.current;
  const reverseGeocodeCache = reverseGeocodeCacheRef.current;

  const getCacheKey = useCallback((fnName: string, ...args: unknown[]) => {
    // Create a more reliable cache key by handling different argument types
    const stringifiedArgs = args.map(arg => {
      if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
        return String(arg);
      }
      if (arg === null || arg === undefined) {
        return 'null';
      }
      // For objects, create a deterministic string representation
      try {
        return JSON.stringify(Object.keys(arg).sort().reduce((obj: Record<string, unknown>, key: string) => {
          obj[key] = (arg as Record<string, unknown>)[key];
          return obj;
        }, {} as Record<string, unknown>));
      } catch {
        return 'complex-object';
      }
    });
    return `${fnName}:${stringifiedArgs.join(':')}`;
  }, []);


  const cachedGetWeather = useCallback(async (location: Location, start: string, end: string): Promise<WeatherData> => {
    const key = `weather:${getCacheKey('getWeather', location.latitude, location.longitude, start, end)}`;
    const cached = weatherCache.get(key);
    if (cached) return cached;
    const data = await bffGetWeather(location, start, end);
    weatherCache.set(key, data);
    return data;
  }, [weatherCache, getCacheKey]);

  const cachedReverseGeocode = useCallback(async (lat: number, lng: number): Promise<Location> => {
    const key = `reverse-geocode:${getCacheKey('reverseGeocode', lat, lng)}`;
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
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        handleError(`Invalid input: ${err.message}`, 'error');
      } else if (err instanceof APIError) {
        handleError(`API error: ${err.message}`, 'error');
      } else if (err instanceof NetworkError) {
        handleError(`Network error: ${err.message}`, 'error');
      } else {
        handleError('An unexpected error occurred. Please try again later.', 'error');
      }
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
            timeout: 10_000,
            maximumAge: 300_000
          });
        });
        
        try {
          const location = await cachedReverseGeocode(position.coords.latitude, position.coords.longitude);
          setCurrentLocation(location);
          handleError('Location set to your current position.', 'info');
        } catch {
          handleError('Could not determine your exact location. Using coordinates.', 'warning');
          const fallbackLocation: Location = {
            id: 1, // Positive ID for schema
            name: `Your location (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            elevation: 0,
            feature_code: 'PPL',
            country_code: 'XX',
            timezone: 'UTC',
            country: ''
          };
          setCurrentLocation(fallbackLocation);
        }
      } catch (err: unknown) {
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
    setGeolocationRequested(false);
    // fetch triggered by useEffect
  }, [clearError, setCurrentLocation, setGeolocationRequested]);

  const handleMapLocationSelect = useCallback(async (lat: number, lng: number) => {
    console.log(`[DEBUG] Map location select: lat=${lat}, lng=${lng}`);
    clearError();
    setIsLoading(true);
    try {
      const location = await cachedReverseGeocode(lat, lng);
      console.log(`[DEBUG] Reverse geocode success:`, location);
      setCurrentLocation(location);
      // fetch triggered by useEffect
    } catch (error) {
      console.error(`[DEBUG] Reverse geocode failed in map select:`, error);
      handleError('Could not determine location name. Using coordinates.', 'warning');
      const fallbackLocation: Location = {
        id: 0,
        name: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        latitude: lat,
        longitude: lng,
        elevation: 0,
        feature_code: 'PPL',
        country_code: 'XX',
        timezone: 'UTC',
        country: 'Unknown'
      };
      setCurrentLocation(fallbackLocation);
    } finally {
      setIsLoading(false);
      setGeolocationRequested(false);
    }
  }, [clearError, setIsLoading, cachedReverseGeocode, setCurrentLocation, handleError, setGeolocationRequested]);

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
    
    // Parse and validate date
    const parsedDate = parseDateString(date);
    if (!parsedDate) {
      handleError('Invalid date provided');
      return false;
    }
    
    // Check if date is before 1940 (Open-Meteo historical data starts ~1940)
    const minHistoricalDate = new Date(1940, 0, 1);
    if (parsedDate < minHistoricalDate) {
      handleError('Historical weather data available from 1940 onwards');
      return false;
    }
    
    // Check if date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
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

  // Don't load default location automatically - wait for user selection
  // useEffect for default location removed to prevent auto-selection

  useEffect(() => {
    console.log('[DEBUG] App useEffect triggered:', {
      currentLocation: currentLocation ? `${currentLocation.name} (${currentLocation.latitude}, ${currentLocation.longitude})` : 'null',
      selectedDate,
      hasLocation: !!currentLocation,
      hasDate: !!selectedDate,
      dateIsValid: selectedDate ? /^\d{4}-\d{2}-\d{2}$/.test(selectedDate) : false
    });

    // Only fetch weather data if both location and date are selected
    if (currentLocation && selectedDate) {
      console.log('[DEBUG] Calling fetchWeatherData with:', {
        location: currentLocation.name,
        startDate: selectedDate,
        endDate: selectedDate,
        dateFormat: selectedDate.match(/^\d{4}-\d{2}-\d{2}$/) ? 'valid' : 'invalid'
      });
      fetchWeatherData(currentLocation, selectedDate, selectedDate);
    } else {
      console.log('[DEBUG] Missing location or date - not fetching weather data');
    }
  }, [currentLocation, selectedDate, fetchWeatherData]);

  // Cleanup cache managers on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Simple cache manager doesn't require cleanup
      console.log('Cache managers cleaned up');
    };
  }, []); // Empty dependency array since we want this to run only on unmount


  // Initialize dark mode from localStorage or system preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedDarkMode = localStorage.getItem('darkMode');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedDarkMode !== null) {
          setIsDarkMode(savedDarkMode === 'true');
        } else {
          setIsDarkMode(systemPrefersDark);
        }
      } catch (error) {
        console.warn('Could not access localStorage, using system preference:', error);
        setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    }
  }, []);

  // Apply dark mode class to body
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (isDarkMode) {
          document.body.classList.add('dark-mode');
        } else {
          document.body.classList.remove('dark-mode');
        }
        localStorage.setItem('darkMode', isDarkMode.toString());
      } catch (error) {
        console.warn('Could not save dark mode preference:', error);
      }
    }
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  return (
    <ErrorBoundary onError={(error: Error) => handleError(error.message, 'error')}>
      <>
        <div className="app-container">
          <header className="header">
            <h1>Weather History Viewer <span className="version-text">v{APP_VERSION.CURRENT}</span></h1>
            <p className="header-subtitle">Vibe Coded by Clewless (sorry)</p>
            <div className="theme-toggle-container">
              <button
                onClick={toggleDarkMode}
                className="theme-toggle"
                aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDarkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
          </header>

          {error && !isLoading && (
            <div className={`error-message ${error.type}`} role="alert">
              <div>{error.message}</div>
            </div>
          )}

          <div className="left-panel">
            <div className="controls-section">
              <div className="geolocation-section">
                <h3>Location</h3>
                <button onClick={handleGeolocationClick} disabled={geolocationRequested} className="geolocation-btn" aria-label="Use my current location" aria-describedby="geolocation-desc">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
                  </svg>
                  {geolocationRequested ? 'Using your location...' : 'Use My Location'}
                </button>
                <p id="geolocation-desc" className="geolocation-desc">
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
            <div className="map-section">
              <h3>Map</h3>
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

          <div className="weather-section">
            {!error?.message && (
              <>
                <ErrorBoundary>
                  <WeatherDisplay
                    weatherData={weatherData}
                    location={currentLocation}
                    temperatureUnit={temperatureUnit}
                    onTemperatureUnitChange={handleTemperatureUnitChange}
                    isLoading={isLoading}
                    aria-label="Weather display for selected location and date range"
                  />
                </ErrorBoundary>
                <ErrorBoundary>
                  <TemperatureChart
                    weatherData={weatherData}
                    temperatureUnit={temperatureUnit}
                    location={currentLocation}
                    startDate={selectedDate}
                    isLoading={isLoading}
                    aria-label="Daily temperature chart"
                  />
                </ErrorBoundary>
                <ErrorBoundary>
                  <PrecipitationChart
                    weatherData={weatherData}
                    temperatureUnit={temperatureUnit}
                    location={currentLocation}
                    startDate={selectedDate}
                    isLoading={isLoading}
                    aria-label="Daily precipitation chart"
                  />
                </ErrorBoundary>
              </>
            )}
            {error?.message && (
              <div className="error-message error" role="alert">
                <div>{error.message}</div>
              </div>
            )}
          </div>
        </div>
      </>
    </ErrorBoundary>
  );
};

export default App;