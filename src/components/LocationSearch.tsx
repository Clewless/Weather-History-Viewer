import { h } from 'preact';

import { useState, useMemo } from 'preact/hooks';

import debounce from 'lodash/debounce';

import { bffSearchLocations as searchLocations } from '../api';
import { Location } from '../open-meteo';

interface LocationSearchProps {
  onLocationSelect: (location: Location) => void;
  currentLocation?: Location | null;
}

export const LocationSearch = ({ onLocationSelect, currentLocation }: LocationSearchProps) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
        const results = await searchLocations(searchQuery);
        // Ensure results is an array before slicing
        const suggestionsList = Array.isArray(results) ? results.slice(0, 5) : [];
        setSuggestions(suggestionsList);
        setShowSuggestions(true);
      } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
  };

  const debouncedSearch = useMemo(() => debounce(handleSearch, 300), []);

  const handleInputChange = (e: Event) => {
    const {value} = (e.target as HTMLInputElement);
    setQuery(value);
    debouncedSearch(value);
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
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
            <div class="loading" role="status" aria-live="polite">Searching...</div>
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
                onKeyDown={(e) => {
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
      
      {currentLocation && (
        <div class="current-location">
          <strong>Current Location:</strong> {currentLocation.name}, {currentLocation.country}
        </div>
      )}
    </div>
  );
};