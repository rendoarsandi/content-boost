// Date and time utilities for the platform

/**
 * Indonesian timezone utilities
 */
export const INDONESIA_TIMEZONE = 'Asia/Jakarta';
export const WIB_OFFSET = 7; // UTC+7

/**
 * Get current time in Indonesian timezone (WIB)
 */
export function getCurrentWIBTime(): Date {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: INDONESIA_TIMEZONE })
  );
}

/**
 * Convert UTC date to WIB
 */
export function convertToWIB(utcDate: Date): Date {
  return new Date(
    utcDate.toLocaleString('en-US', { timeZone: INDONESIA_TIMEZONE })
  );
}

/**
 * Convert WIB date to UTC
 */
export function convertToUTC(wibDate: Date): Date {
  const wibTime = wibDate.getTime();
  const wibOffset = WIB_OFFSET * 60 * 60 * 1000; // Convert hours to milliseconds
  return new Date(wibTime - wibOffset);
}

/**
 * Get start of day in WIB (00:00:00)
 * Requirement 6.1: Daily payout calculation at 00:00 WIB
 */
export function getStartOfDayWIB(date?: Date): Date {
  const targetDate = date || getCurrentWIBTime();
  const wibDate = convertToWIB(targetDate);

  wibDate.setHours(0, 0, 0, 0);
  return wibDate;
}

/**
 * Get end of day in WIB (23:59:59.999)
 */
export function getEndOfDayWIB(date?: Date): Date {
  const targetDate = date || getCurrentWIBTime();
  const wibDate = convertToWIB(targetDate);

  wibDate.setHours(23, 59, 59, 999);
  return wibDate;
}

/**
 * Get yesterday's date range in WIB
 * Used for daily payout calculations
 */
export function getYesterdayRangeWIB(): { start: Date; end: Date } {
  const today = getCurrentWIBTime();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return {
    start: getStartOfDayWIB(yesterday),
    end: getEndOfDayWIB(yesterday),
  };
}

/**
 * Get current week range in WIB (Monday to Sunday)
 */
export function getCurrentWeekRangeWIB(): { start: Date; end: Date } {
  const today = getCurrentWIBTime();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday as 0

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: getStartOfDayWIB(monday),
    end: getEndOfDayWIB(sunday),
  };
}

/**
 * Get current month range in WIB
 */
export function getCurrentMonthRangeWIB(): { start: Date; end: Date } {
  const today = getCurrentWIBTime();

  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    start: getStartOfDayWIB(firstDay),
    end: getEndOfDayWIB(lastDay),
  };
}

/**
 * Check if a date is today in WIB timezone
 */
export function isToday(date: Date): boolean {
  const today = getCurrentWIBTime();
  const targetDate = convertToWIB(date);

  return (
    today.getFullYear() === targetDate.getFullYear() &&
    today.getMonth() === targetDate.getMonth() &&
    today.getDate() === targetDate.getDate()
  );
}

/**
 * Check if a date is yesterday in WIB timezone
 */
export function isYesterday(date: Date): boolean {
  const today = getCurrentWIBTime();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const targetDate = convertToWIB(date);

  return (
    yesterday.getFullYear() === targetDate.getFullYear() &&
    yesterday.getMonth() === targetDate.getMonth() &&
    yesterday.getDate() === targetDate.getDate()
  );
}

/**
 * Format date for Indonesian locale
 */
export function formatDateIndonesian(
  date: Date,
  includeTime: boolean = false
): string {
  const wibDate = convertToWIB(date);

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: INDONESIA_TIMEZONE,
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
  }

  return wibDate.toLocaleDateString('id-ID', options);
}

/**
 * Format time for Indonesian locale (24-hour format)
 */
export function formatTimeIndonesian(date: Date): string {
  const wibDate = convertToWIB(date);

  return wibDate.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: INDONESIA_TIMEZONE,
    hour12: false,
  });
}

/**
 * Get relative time string in Indonesian
 */
export function getRelativeTimeIndonesian(date: Date): string {
  const now = getCurrentWIBTime();
  const targetDate = convertToWIB(date);
  const diffMs = now.getTime() - targetDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'Baru saja';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} menit yang lalu`;
  } else if (diffHours < 24) {
    return `${diffHours} jam yang lalu`;
  } else if (diffDays < 7) {
    return `${diffDays} hari yang lalu`;
  } else {
    return formatDateIndonesian(date);
  }
}

/**
 * Calculate age in days
 */
export function getAgeInDays(date: Date): number {
  const now = getCurrentWIBTime();
  const targetDate = convertToWIB(date);
  const diffMs = now.getTime() - targetDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate age in hours
 */
export function getAgeInHours(date: Date): number {
  const now = getCurrentWIBTime();
  const targetDate = convertToWIB(date);
  const diffMs = now.getTime() - targetDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60));
}

/**
 * Calculate age in minutes
 */
export function getAgeInMinutes(date: Date): number {
  const now = getCurrentWIBTime();
  const targetDate = convertToWIB(date);
  const diffMs = now.getTime() - targetDate.getTime();
  return Math.floor(diffMs / (1000 * 60));
}

/**
 * Check if date is within a specific time window
 */
export function isWithinTimeWindow(
  date: Date,
  windowMinutes: number,
  referenceDate?: Date
): boolean {
  const reference = referenceDate || getCurrentWIBTime();
  const targetDate = convertToWIB(date);
  const diffMs = Math.abs(reference.getTime() - targetDate.getTime());
  const diffMinutes = diffMs / (1000 * 60);

  return diffMinutes <= windowMinutes;
}

/**
 * Generate date range for analytics
 */
export function generateDateRange(
  startDate: Date,
  endDate: Date,
  intervalDays: number = 1
): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + intervalDays);
  }

  return dates;
}

/**
 * Get business days between two dates (excluding weekends)
 */
export function getBusinessDaysBetween(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Not Sunday (0) or Saturday (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Check if current time is within business hours (9 AM - 6 PM WIB)
 */
export function isBusinessHours(): boolean {
  const now = getCurrentWIBTime();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();

  // Monday (1) to Friday (5), 9 AM to 6 PM
  return dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour < 18;
}

/**
 * Get next business day
 */
export function getNextBusinessDay(date?: Date): Date {
  const targetDate = date || getCurrentWIBTime();
  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  // Skip weekends
  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
    nextDay.setDate(nextDay.getDate() + 1);
  }

  return getStartOfDayWIB(nextDay);
}

/**
 * Parse Indonesian date string
 */
export function parseIndonesianDate(dateString: string): Date | null {
  try {
    // Try parsing common Indonesian date formats
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    ];

    for (const format of formats) {
      const match = dateString.match(format);
      if (match) {
        let day, month, year;

        if (format === formats[2]) {
          // YYYY-MM-DD
          [, year, month, day] = match;
        } else {
          // DD/MM/YYYY or DD-MM-YYYY
          [, day, month, year] = match;
        }

        const date = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );

        // Validate the date
        if (
          date.getFullYear() == parseInt(year) &&
          date.getMonth() == parseInt(month) - 1 &&
          date.getDate() == parseInt(day)
        ) {
          return date;
        }
      }
    }

    // Fallback to standard Date parsing
    return new Date(dateString);
  } catch {
    return null;
  }
}

/**
 * Create cron expression for daily execution at specific WIB time
 */
export function createDailyCronWIB(hour: number, minute: number = 0): string {
  // Convert WIB to UTC for cron
  const utcHour = (hour - WIB_OFFSET + 24) % 24;
  return `${minute} ${utcHour} * * *`;
}

/**
 * Get time until next daily payout (00:00 WIB)
 */
export function getTimeUntilNextPayout(): {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
} {
  const now = getCurrentWIBTime();
  const nextPayout = getStartOfDayWIB();
  nextPayout.setDate(nextPayout.getDate() + 1); // Tomorrow at 00:00

  const diffMs = nextPayout.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return {
    hours,
    minutes,
    seconds,
    totalMs: diffMs,
  };
}
