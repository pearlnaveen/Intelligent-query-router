/**
 * Utility functions for date parsing, validation, and normalization.
 * Standardized for Staff Login -> Activities.
 * 
 * Rules:
 * 1. Accepts formats: DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, DD MM YYYY, DD-MM-YY, YYYY-MM-DD, Excel serials.
 * 2. Interprets 3-part numerical dates strictly as DAY-MONTH-YEAR (DD-MM-YYYY), NEVER MM-DD-YYYY.
 * 3. Normalizes to MySQL DATE format: YYYY-MM-DD.
 * 4. Prevents timezone conversion date shifts.
 * 5. Rejects invalid dates (e.g. 32-13-2025, 29-02-2023).
 */

export function isValidDateComponents(year, month, day) {
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  // Days in month validation (accounting for leap years)
  const daysInMonth = [0, 31, (isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month];
}

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Normalizes input date to YYYY-MM-DD format.
 * Returns YYYY-MM-DD string if valid, or null if invalid/empty.
 */
export function normalizeToDbDate(val) {
  if (val === undefined || val === null || val === '') return null;

  // Handle JS Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    const yyyy = val.getUTCFullYear();
    const mm = String(val.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(val.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Handle Excel Serial Number (e.g., 45884)
  if (typeof val === 'number') {
    if (val >= 1900 && val <= 2100) return `${val}-01-01`;
    if (val > 25567 && val < 100000) {
      // Excel 25567 = 1970-01-01
      const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(jsDate.getTime())) {
        const yyyy = jsDate.getUTCFullYear();
        const mm = String(jsDate.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(jsDate.getUTCDate()).padStart(2, '0');
        if (isValidDateComponents(yyyy, Number(mm), Number(dd))) {
          return `${yyyy}-${mm}-${dd}`;
        }
      }
    }
  }

  let str = String(val).trim();
  if (!str) return null;
  if (str.includes('T')) {
    str = str.split('T')[0].trim();
  }

  // Already YYYY-MM-DD
  const yyyyMmDdMatch = str.match(/^(\d{4})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{1,2})$/);
  if (yyyyMmDdMatch) {
    const yyyy = parseInt(yyyyMmDdMatch[1], 10);
    const mm = parseInt(yyyyMmDdMatch[2], 10);
    const dd = parseInt(yyyyMmDdMatch[3], 10);
    if (isValidDateComponents(yyyy, mm, dd)) {
      return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
    return null;
  }

  // Standard DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY / DD MM YYYY or DD-MM-YY
  const ddMmYyyyMatch = str.match(/^(\d{1,2})[\/\-\.\s](\d{1,2})[\/\-\.\s](\d{2}|\d{4})$/);
  if (ddMmYyyyMatch) {
    const dd = parseInt(ddMmYyyyMatch[1], 10);
    const mm = parseInt(ddMmYyyyMatch[2], 10);
    let rawYear = ddMmYyyyMatch[3];
    let yyyy = parseInt(rawYear, 10);

    if (rawYear.length === 2) {
      yyyy = yyyy > 50 ? 1900 + yyyy : 2000 + yyyy;
    }

    if (isValidDateComponents(yyyy, mm, dd)) {
      return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
    return null;
  }

  // Handle month names like "15 Aug 2025" or "15-August-2025"
  const monthMap = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
    aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10,
    october: 10, nov: 11, november: 11, dec: 12, december: 12,
  };
  const textDateMatch = str.match(/^(\d{1,2})[\/\-\.\s]+([a-z]{3,9})[\/\-\.\s]+(\d{2}|\d{4})$/i);
  if (textDateMatch) {
    const dd = parseInt(textDateMatch[1], 10);
    const mm = monthMap[textDateMatch[2].toLowerCase()];
    let rawYear = textDateMatch[3];
    let yyyy = parseInt(rawYear, 10);

    if (rawYear.length === 2) {
      yyyy = yyyy > 50 ? 1900 + yyyy : 2000 + yyyy;
    }

    if (mm && isValidDateComponents(yyyy, mm, dd)) {
      return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Validates a date string according to DD-MM-YYYY / YYYY-MM-DD rules.
 */
export function validateDateInput(val, fieldLabel = 'Date') {
  if (val === undefined || val === null || val === '') {
    return { isValid: true, normalized: null };
  }

  const normalized = normalizeToDbDate(val);
  if (!normalized) {
    return {
      isValid: false,
      message: `${fieldLabel} is invalid. Supported format is DD-MM-YYYY (e.g. 15-08-2025 or 15/08/2025).`,
    };
  }

  return { isValid: true, normalized };
}

/**
 * Formats YYYY-MM-DD or Date to DD-MM-YYYY display string.
 */
export function formatDisplayDate(val) {
  const normalized = normalizeToDbDate(val);
  if (!normalized) return val || '';
  const [yyyy, mm, dd] = normalized.split('-');
  return `${dd}-${mm}-${yyyy}`;
}
