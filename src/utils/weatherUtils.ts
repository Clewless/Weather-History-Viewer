import { addDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

import { HourlyWeatherData } from '../open-meteo.js';
import { Location } from '../types.js';

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
      console.log('[DEBUG] getLocalDayHours: Missing inputs', { location: !!location, startDate, hourly: !!hourly });
      return { times: [], temps: [], precip: [], codes: [], cloudcover: [] };
    }

    // Check if hourly data arrays exist and have data
    if (!hourly.time || !hourly.temperature_2m || !hourly.precipitation ||
        !hourly.weathercode || !hourly.cloudcover) {
      console.log('[DEBUG] getLocalDayHours: Missing hourly arrays', {
        time: !!hourly.time,
        temperature_2m: !!hourly.temperature_2m,
        precipitation: !!hourly.precipitation,
        weathercode: !!hourly.weathercode,
        cloudcover: !!hourly.cloudcover,
        timeLength: hourly.time?.length || 0
      });
      return { times: [], temps: [], precip: [], codes: [], cloudcover: [] };
    }

    // Use parseDateString for consistency
    const startUtc = parseDateString(startDate);
    if (!startUtc) {
      console.log('[DEBUG] getLocalDayHours: Invalid startDate', startDate);
      return { times: [], temps: [], precip: [], codes: [], cloudcover: [] };
    }
    const endUtc = addDays(startUtc, 1);

    const startLocal = toZonedTime(startUtc, location.timezone);
    const endLocal = toZonedTime(endUtc, location.timezone);

    let sampleHourlyTime: Date | string = hourly.time[0];
    let sampleHourlyTimeStr = typeof sampleHourlyTime === 'string' ? sampleHourlyTime : sampleHourlyTime.toISOString();
    let sampleLocalTime: Date;
    try {
      const sampleTimeDate = typeof sampleHourlyTime === 'string' ? new Date(sampleHourlyTime) : sampleHourlyTime;
      sampleLocalTime = toZonedTime(sampleTimeDate, location.timezone);
    } catch (e) {
      sampleLocalTime = new Date(0); // fallback
    }
    const sampleLocalTimeStr = sampleLocalTime.toISOString();

    console.log('[DEBUG] getLocalDayHours: Date boundaries', {
      startDate,
      timezone: location.timezone,
      startLocal: startLocal.toISOString(),
      endLocal: endLocal.toISOString(),
      hourlyTimeLength: hourly.time.length,
      sampleHourlyTime: sampleHourlyTimeStr,
      sampleLocalTime: sampleLocalTimeStr
    });

    const localTimes: string[] = [];
    const temps: number[] = [];
    const precip: number[] = [];
    const codes: number[] = [];
    const cloudcover: number[] = [];

    let filteredCount = 0;
    // Filter hourly data for the selected day
    hourly.time.forEach((timeItem, i: number) => {
      let time: Date;
      if (typeof timeItem === 'string') {
        time = new Date(timeItem);
        if (isNaN(time.getTime())) {
          console.warn('[DEBUG] getLocalDayHours: Invalid time string at index', i, timeItem);
          return;
        }
      } else if (timeItem instanceof Date) {
        time = timeItem;
      } else {
        console.warn('[DEBUG] getLocalDayHours: Invalid time type at index', i, typeof timeItem);
        return;
      }

      const localTime = toZonedTime(time, location.timezone);

      // Check if this hour falls within our target day
      if (localTime >= startLocal && localTime < endLocal) {
        localTimes.push(localTime.toISOString());
        temps.push(hourly.temperature_2m[i]);
        precip.push(hourly.precipitation[i]);
        codes.push(hourly.weathercode[i]);
        cloudcover.push(hourly.cloudcover[i]);
        filteredCount++;
      }
    });

    console.log('[DEBUG] getLocalDayHours: Filtered results', {
      filteredCount,
      localTimes: localTimes.slice(0, 3), // First 3 for brevity
      tempsSample: temps.slice(0, 3),
      precipSample: precip.slice(0, 3)
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