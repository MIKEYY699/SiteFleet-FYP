export interface GeocodedLocation {
  displayName: string;
  latitude: number;
  longitude: number;
}

// Resolves to null when the place isn't found. Throws when the lookup service can't
// be reached, so callers can tell "no such place" apart from "try again later".
export async function geocodeLocation(query: string): Promise<GeocodedLocation | null> {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`);
  if (!res.ok) throw new Error(`Location search failed (HTTP ${res.status})`);
  const data = await res.json();
  const result = data?.results?.[0];
  if (!result) return null;
  const parts = [result.name, result.admin1, result.country].filter(Boolean);
  return {
    displayName: parts.join(', '),
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

export interface HourPoint {
  label: string;
  temperatureC: number;
  weatherCode: number;
  isDay: boolean;
}

export interface WeatherSnapshot {
  temperatureC: number;
  weatherCode: number;
  isDay: boolean;
  hourly: HourPoint[];
}

// Resolves to null on any failure (offline, service down, unexpected response).
export async function fetchWeather(lat: number, lon: number): Promise<WeatherSnapshot | null> {
  let data;
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&hourly=temperature_2m,weather_code,is_day&timezone=auto`
    );
    if (!res.ok) return null;
    data = await res.json();
  } catch (err) {
    console.error('fetchWeather failed', err);
    return null;
  }
  if (data?.current?.temperature_2m === undefined) return null;

  const currentHourKey = String(data.current.time).slice(0, 13);
  const times: string[] = data.hourly?.time || [];
  let idx = times.findIndex((t) => t.slice(0, 13) === currentHourKey);
  if (idx === -1) idx = 0;

  const hourly: HourPoint[] = times.slice(idx, idx + 6).map((t, i) => ({
    label: i === 0 ? 'Now' : t.slice(11, 16),
    temperatureC: data.hourly.temperature_2m[idx + i],
    weatherCode: data.hourly.weather_code[idx + i],
    isDay: data.hourly.is_day[idx + i] === 1,
  }));

  return {
    temperatureC: data.current.temperature_2m,
    weatherCode: data.current.weather_code,
    isDay: data.current.is_day === 1,
    hourly,
  };
}

export function weatherIcon(code: number, isDay: boolean): string {
  if (code === 0 || code === 1) return isDay ? '☀️' : '🌙';
  if (code === 2 || code === 3) return isDay ? '⛅' : '☁️';
  if ([45, 48].includes(code)) return '🌫️';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '🌡️';
}

export function weatherLabel(code: number): string {
  const map: Record<number, string> = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Foggy',
    51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
    56: 'Freezing drizzle', 57: 'Freezing drizzle',
    61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
    66: 'Freezing rain', 67: 'Freezing rain',
    71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
    80: 'Rain showers', 81: 'Rain showers', 82: 'Violent rain showers',
    85: 'Snow showers', 86: 'Snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm w/ hail', 99: 'Thunderstorm w/ hail',
  };
  return map[code] || 'Weather';
}
