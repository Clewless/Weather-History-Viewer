import { ConfigurationError } from '../errors';

import { validateEnvVars, getEnvVar } from './env';

describe('validateEnvVars', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test('does not throw when optional vars are missing or empty', () => {
    // Ensure optional env vars are unset or empty
    delete process.env.OPEN_METEO_API_KEY;
    process.env.CORS_ORIGIN = '';
    process.env.CORS_FALLBACK_DISABLED = '';

    expect(() => validateEnvVars()).not.toThrow();
  });

  test('throws ConfigurationError when required var is missing or invalid', () => {
    // Temporarily modify default env to make PORT required via process.env override behavior
    // Since defaultEnvVars marks PORT as optional, we simulate an invalid value to force an error
    process.env.PORT = 'not-a-number';

    expect(() => validateEnvVars()).toThrow(ConfigurationError);
  });
});

describe('getEnvVar return behavior', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test('returns undefined for unset optional variables', () => {
    delete process.env.OPEN_METEO_API_KEY;
    const val = getEnvVar('OPEN_METEO_API_KEY');
    expect(val).toBeUndefined();
  });

  test('returns default value when defined', () => {
    delete process.env.PORT;
    const val = getEnvVar('PORT');
    expect(val).toBe('3001');
  });
});
