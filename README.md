# Weather History Viewer

A web application for exploring historical weather data using the Open-Meteo API. The application features location search, interactive map, date range selection, and visualizations of temperature and precipitation data.

## Features

- Search for locations by name
- Click on the map to select locations
- Select date ranges for historical data (up to 365 days)
- View daily and hourly weather summaries
- Interactive temperature and precipitation charts
- Toggle between Celsius and Fahrenheit
- Responsive design for desktop and mobile
- Client-side caching with automatic cleanup
- Server-side caching for API responses
- Comprehensive error handling and validation
- Environment variable validation
- Multi-environment CORS configuration

## Technologies

- Frontend: Preact (lightweight React alternative), TypeScript, Canvas for charts
- Backend: Express.js, TypeScript
- API: Open-Meteo Historical Weather API
- Map: OpenStreetMap tiles
- Build: Webpack, Jest for testing

## Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)
- Open-Meteo API key (optional but recommended for higher rate limits; free tier available at [Open-Meteo](https://open-meteo.com/en/docs))

## Setup

1. **Clone the repository**
   ```
   git clone https://github.com/your-username/weather-history-viewer.git
   cd weather-history-viewer
   ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Configure environment variables**
   Copy the example environment file and update it with your values:
   ```
   cp .env.example .env
   ```
   
   Edit `.env`:
   - `PORT=3000` - Backend server port (default: 3000)
   - `CORS_ORIGIN=http://localhost:8080` - Frontend origin for CORS (default: http://localhost:8080)
   - `OPEN_METEO_API_KEY=your_open_meteo_api_key_here` - Your Open-Meteo API key (optional but recommended)
   
   For production, also set:
   - `API_BASE_URL=https://your-production-api.com/api` - Frontend API base URL (if deploying separately)
   
   **Environment Variable Details:**
   - `PORT`: The port on which the backend server will run. Default is 3000.
   - `CORS_ORIGIN`: The origin URL of the frontend application, used for CORS configuration. 
     This should match where your frontend is hosted. Default is http://localhost:8080 for development.
   - `OPEN_METEO_API_KEY`: Optional API key for the Open-Meteo API. Using a key increases rate limits 
     and is recommended for production use. You can get a free key at [Open-Meteo](https://open-meteo.com/en/docs).
   - `API_BASE_URL`: Base URL for the backend API when running the frontend separately. 
     This is used by the frontend to make API requests. Default is http://localhost:3000/api for development.

4. **Run the application**

   **Development mode (recommended):**
   ```
   npm run start:all
   ```
   This starts both the backend server (port 3000) and frontend dev server (port 8080).

   **Backend only:**
   ```
   npm run start:server
   ```

   **Frontend only:**
   ```
   npm run start
   ```

   The application will open in your browser at `http://localhost:8080`.

5. **Build for production**
   ```
   npm run build
   ```
   This generates optimized files in the `dist/` directory. Serve the `dist/` folder with a static server.

## Project Structure

- `src/components/` - Preact components (App.tsx, LocationSearch.tsx, etc.)
- `src/api.ts` - Frontend API calls to backend
- `src/server.ts` - Express backend server
- `src/open-meteo.ts` - Backend API integration with Open-Meteo
- `src/styles.css` - Global styles
- `src/utils/` - Utility functions for caching, validation, environment handling, and CORS
- `tests/` - Unit tests

## API Endpoints (Backend)

- `GET /api/search?q={query}` - Search locations
- `GET /api/weather?lat={lat}&lon={lon}&start={start}&end={end}&timezone={tz}` - Get historical weather
- `GET /api/reverse-geocode?lat={lat}&lon={lon}` - Reverse geocode coordinates to location
- `GET /api/cache-stats` - Get cache statistics (development only)
- `POST /api/cache-clear` - Clear all caches (development only)

Rate limited to:
- 100 requests per 15 minutes for search and reverse-geocode endpoints
- 50 requests per 15 minutes for weather data endpoint

## Caching

The application implements caching at multiple levels:

1. **Client-side caching**: Uses in-memory cache with automatic cleanup for location searches, weather data, and reverse geocoding
2. **Server-side caching**: Caches API responses to reduce load on the Open-Meteo API with size limits
   - Location search: 5 minutes TTL, max 500 items
   - Weather data: 30 minutes TTL, max 200 items
   - Reverse geocoding: 10 minutes TTL, max 300 items

## Testing

Run tests:
```
npm test
```

The project now has comprehensive test coverage including:
- Component rendering tests
- Error handling tests
- Cache utility tests
- API interaction tests
- User interaction tests

## Development Scripts

- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking
- `npm run test` - Run Jest tests with coverage
- `npm run build` - Build for production
- `npm run start` - Start frontend development server
- `npm run start:server` - Start backend server
- `npm run start:all` - Start both frontend and backend

## Troubleshooting

- **CORS errors**: Ensure `CORS_ORIGIN` in `.env` matches your frontend URL.
- **API key issues**: If using Open-Meteo API key, ensure it's valid. Without it, free tier limits apply.
- **Map not loading**: Check network connectivity for OpenStreetMap tiles.
- **Weather data not loading**: Verify date range is valid (1940-present) and within 365 days.
- **Type errors**: Run `npm run type-check` to diagnose.
- **Cache issues**: Use the `/api/cache-clear` endpoint to clear caches during development.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC License