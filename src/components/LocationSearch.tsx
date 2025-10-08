import { h } from 'preact';

import { useState, useMemo, useCallback, useRef, useEffect } from 'preact/hooks';

import debounce from 'lodash/debounce';

import { bffSearchLocations as searchLocations } from '../api';
import { Location } from '../types';

interface LocationSearchProps {
  onLocationSelect: (location: Location) => void;
  currentLocation?: Location | null;
}

export const LocationSearch = ({ onLocationSelect, currentLocation }: LocationSearchProps) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
        const results = await searchLocations(searchQuery);
        // Ensure results is an array before slicing
        const suggestionsList = Array.isArray(results) ? results.slice(0, 5) : [];
        setSuggestions(suggestionsList);
        setShowSuggestions(true);
        if (suggestionsList.length === 0) {
          setError('No locations found. Please try a different search term.');
        }
      } catch {
        setError('Failed to fetch locations. Please check your connection and try again.');
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
  }, []);

  const debouncedSearch = useMemo(() => debounce(handleSearch, 300), [handleSearch]);

  const blurTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      try {
        debouncedSearch.cancel();
      } catch (err) {
        // Cancellation may throw in some implementations; not fatal
        console.debug('debouncedSearch.cancel() threw:', err);
      }
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current as unknown as number);
      }
    };
  }, [debouncedSearch]);

  const handleInputChange = (e: Event) => {
    const {value} = (e.target as HTMLInputElement);
    setQuery(value);
    debouncedSearch(value);
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current as unknown as number);
    }
    blurTimeoutRef.current = (setTimeout(() => {
      setShowSuggestions(false);
      blurTimeoutRef.current = null;
    }, 200) as unknown) as number;
  };

  const handleInputFocus = () => {
    if (query.length >= 2) {
      setShowSuggestions(true);
    }
  };

  const handleSuggestionClick = (location: Location) => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    onLocationSelect(location);
  };

  return (
    <div class="location-search" role="search" aria-label="Location search">
      <h3>Search Location</h3>
      <input
        type="text"
        class="search-input"
        placeholder="Search for a location..."
        value={query}
        onInput={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        aria-label="Search locations"
        id="location-search-input"
      />
      
      {showSuggestions && (
        <div class="search-suggestions" role="listbox" aria-label="Location suggestions">
          {isLoading && (
            <div class="loading" role="status" aria-live="polite">
              <div class="loading-text">.....</div>
            </div>
          )}
          
          {!isLoading && suggestions.length > 0 && (
            suggestions.map((location) => (
              <div
                class="suggestion-item"
                key={location.id}
                role="option"
                tabIndex={0}
                aria-selected="false"
                onClick={() => handleSuggestionClick(location)}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSuggestionClick(location);
                  }
                }}
              >
                <div class="suggestion-name">{location.name}</div>
                <div class="suggestion-details">
                  {location.admin1 && `${location.admin1}, `}
                  {location.country}
                </div>
              </div>
            ))
          )}
          
          {!isLoading && suggestions.length === 0 && query.length >= 2 && (
            <div class="loading" role="status" aria-live="polite">No locations found</div>
          )}
        </div>
      )}

      {error && <div class="error-message error">{error}</div>}
      
      {currentLocation && (
        <div class="current-location">
          <strong>Current Location:</strong> {currentLocation.name}, {currentLocation.country}
        </div>
      )}
    </div>
  );
};