import { parseISO, addDays } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

import { HourlyWeatherData, Location } from '../open-meteo';

export interface FilteredHourlyData {
  times: string[];
  temps: number[];
  precip: number[];
  codes: number[];
  cloudcover: number[];
}

export const getLocalDayHours = (hourly: HourlyWeatherData, location: Location, startDate: string): FilteredHourlyData => {
  if (!location || !startDate) {
    return { times: [], temps: [], precip: [], codes: [], cloudcover: [] };
  }

  const startUtc = parseISO(startDate);
  const endUtc = addDays(startUtc, 1);

  const startLocal = toZonedTime(startUtc, location.timezone);
  const endLocal = toZonedTime(endUtc, location.timezone);

  const localTimes: string[] = [];
  const temps: number[] = [];
  const precip: number[] = [];
  const codes: number[] = [];
  const cloudcover: number[] = [];

  // Filter hourly data for the selected day
  for (let i = 0; i < hourly.time.length; i++) {
    const time = hourly.time[i];
    const localTime = toZonedTime(time, location.timezone);

    // Check if this hour falls within our target day
    if (localTime >= startLocal && localTime < endLocal) {
      localTimes.push(localTime.toISOString());
      temps.push(hourly.temperature_2m[i]);
      precip.push(hourly.precipitation[i]);
      codes.push(hourly.weathercode[i]);
      cloudcover.push(hourly.cloudcover[i]);
    }
  }

  return { times: localTimes, temps, precip, codes, cloudcover };
};

export const formatLocalTime = (time: string, timezone: string): string => {
  const date = new Date(time);
  return formatInTimeZone(date, timezone, 'HH:mm');
};