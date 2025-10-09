# Gemini Project Overview: Weather History Viewer

## Project Overview

This is a full-stack web application that allows users to view historical weather data for a given location. It features a Preact-based frontend and an Express.js backend, both written in TypeScript. The application fetches data from the Open-Meteo API and displays it in an interactive map and charts.

**Key Technologies:**

*   **Frontend:** Preact, TypeScript, webpack, Babel
*   **Backend:** Express.js, TypeScript
*   **Testing:** Jest, Preact Testing Library
*   **Styling:** CSS
*   **Linting & Formatting:** ESLint, Prettier

## Building and Running

### Prerequisites

*   Node.js (v18 or later)
*   npm (v9 or later)

### Installation

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Create a `.env` file from the example:
    ```bash
    cp .env.example .env
    ```
    Update the `.env` file with your configuration, including your Open-Meteo API key if you have one.

### Development

*   **Run the frontend and backend concurrently:**
    ```bash
    npm run start:all
    ```
    This will start the frontend development server on port 3000 and the backend server on port 3001.

*   **Run only the frontend:**
    ```bash
    npm run start
    ```

*   **Run only the backend:**
    ```bash
    npm run start:server
    ```

### Production

*   **Build the application:**
    ```bash
    npm run build
    ```
    This will create a `dist` directory with the production-ready client and server files.

*   **Run the production server:**
    ```bash
    npm run prod
    ```

### Testing and Linting

*   **Run tests:**
    ```bash
    npm test
    ```

*   **Run the linter:**
    ```bash
    npm run lint
    ```

*   **Check for TypeScript errors:**
    ```bash
    npm run type-check
    ```

## Development Conventions

*   **Code Style:** The project uses ESLint and Prettier to enforce a consistent code style. Before committing, it's recommended to run `npm run lint` to check for any issues.
*   **Testing:** The project has a comprehensive test suite using Jest and the Preact Testing Library. All new features should be accompanied by corresponding tests.
*   **Environment Variables:** The application uses a `.env` file for managing environment variables. The `src/utils/env.ts` file provides a validation schema for these variables.
*   **Commits:** While no formal commit message convention is enforced, a clear and descriptive commit message is encouraged.
