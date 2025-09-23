import { addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

import { HourlyWeatherData } from '../open-meteo';
import { Location } from '../types';

import { formatTimeInTimezone, parseDateString } from './dateUtils';

export interface FilteredHourlyData {
  times: string[];
  temps: number[];
  precip: number[];
  codes: number[];
  cloudcover: number[];
}

export const getLocalDayHours = (hourly: HourlyWeatherData, location: Location, startDate: string): FilteredHourlyData => {
    if (!location || !startDate || !hourly) {
      return { times: [], temps: [], precip: [], codes: [], cloudcover: [] };
    }

    // Check if hourly data arrays exist and have data
    if (!hourly.time || !hourly.temperature_2m || !hourly.precipitation ||
        !hourly.weathercode || !hourly.cloudcover) {
      return { times: [], temps: [], precip: [], codes: [], cloudcover: [] };
    }

    // Use parseDateString for consistency
    const startUtc = parseDateString(startDate);
    if (!startUtc) {
      return { times: [], temps: [], precip: [], codes: [], cloudcover: [] };
    }
    const endUtc = addDays(startUtc, 1);

    const startLocal = toZonedTime(startUtc, location.timezone);
    const endLocal = toZonedTime(endUtc, location.timezone);

    const localTimes: string[] = [];
    const temps: number[] = [];
    const precip: number[] = [];
    const codes: number[] = [];
    const cloudcover: number[] = [];

    // Filter hourly data for the selected day
    hourly.time.forEach((time: Date, i: number) => {
      const localTime = toZonedTime(time, location.timezone);

      // Check if this hour falls within our target day
      if (localTime >= startLocal && localTime < endLocal) {
        localTimes.push(localTime.toISOString());
        temps.push(hourly.temperature_2m[i]);
        precip.push(hourly.precipitation[i]);
        codes.push(hourly.weathercode[i]);
        cloudcover.push(hourly.cloudcover[i]);
      }
    });

    return { times: localTimes, temps, precip, codes, cloudcover };
};

export const formatLocalTime = (time: string, timezone: string): string => {
  try {
    return formatTimeInTimezone(time, timezone);
  } catch {
    console.warn('Failed to format time for timezone:', timezone);
    return '00:00';
  }
};