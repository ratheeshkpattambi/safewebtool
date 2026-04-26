export const POPULAR_TIME_ZONES = [
  ['Local time', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'],
  ['UTC', 'UTC'],
  ['San Francisco', 'America/Los_Angeles'],
  ['New York', 'America/New_York'],
  ['London', 'Europe/London'],
  ['Berlin', 'Europe/Berlin'],
  ['Dubai', 'Asia/Dubai'],
  ['India', 'Asia/Kolkata'],
  ['Singapore', 'Asia/Singapore'],
  ['Tokyo', 'Asia/Tokyo'],
  ['Sydney', 'Australia/Sydney']
];

export function uniqueTimeZones() {
  const seen = new Set();
  return POPULAR_TIME_ZONES.filter(([, zone]) => {
    if (seen.has(zone)) return false;
    seen.add(zone);
    return true;
  });
}

export function renderTimeZoneOptions(selectedZone) {
  return uniqueTimeZones().map(([label, zone]) => {
    const selected = zone === selectedZone ? ' selected' : '';
    return `<option value="${zone}"${selected}>${label} - ${zone}</option>`;
  }).join('');
}

export function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toDateTimeInputValue(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${toDateInputValue(date)}T${hours}:${minutes}`;
}

export function formatInTimeZone(date, timeZone, options = {}) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: options.weekday || undefined,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: options.timeZoneName || 'short'
  }).format(date);
}

export function getTimeZoneParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
}

export function getTimeZoneOffsetMs(date, timeZone) {
  const parts = getTimeZoneParts(date, timeZone);
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return localAsUtc - date.getTime();
}

export function zonedDateTimeToDate(dateTimeValue, timeZone) {
  const [datePart, timePart = '00:00'] = dateTimeValue.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const baseUtcMs = Date.UTC(year, month - 1, day, hour || 0, minute || 0, 0);
  let instant = new Date(baseUtcMs);

  for (let i = 0; i < 3; i += 1) {
    instant = new Date(baseUtcMs - getTimeZoneOffsetMs(instant, timeZone));
  }

  return instant;
}

export function getLocalHour(date, timeZone) {
  const parts = getTimeZoneParts(date, timeZone);
  return parts.hour + (parts.minute / 60);
}

export function getUtcOffsetLabel(date, timeZone) {
  const offsetMinutes = Math.round(getTimeZoneOffsetMs(date, timeZone) / 60000);
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hours = String(Math.floor(abs / 60)).padStart(2, '0');
  const minutes = String(abs % 60).padStart(2, '0');
  return `UTC${sign}${hours}:${minutes}`;
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
