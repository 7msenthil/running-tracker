/**
 * Fetch historical weather from Open-Meteo (free, no API key)
 * @param {number} lat
 * @param {number} lon
 * @param {string} startDateIso  e.g. "2025-05-15T03:30:00Z"
 */
export async function fetchWeatherForRun(lat, lon, startDateIso) {
  if (!lat || !lon || !startDateIso) return null
  try {
    const date = startDateIso.slice(0, 10)
    const utcHour = new Date(startDateIso).getUTCHours()
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${date}&end_date=${date}&hourly=temperature_2m,relative_humidity_2m&timezone=UTC`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    return {
      temperature: data.hourly?.temperature_2m?.[utcHour] ?? null,
      humidity:    data.hourly?.relative_humidity_2m?.[utcHour] ?? null,
    }
  } catch {
    return null
  }
}
