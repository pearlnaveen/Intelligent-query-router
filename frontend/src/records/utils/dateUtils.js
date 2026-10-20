/**
 * Frontend utility functions for date parsing, validation, formatting, and normalization.
 * Standardized for Staff Login -> Activities.
 */

export function isValidDateComponents(year, month, day) {
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const daysInMonth = [0, 31, (isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month];
}

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Normalizes any valid input date string or object to YYYY-MM-DD.
 * Interprets 3-part numerical dates strictly as DD-MM-YYYY.
 * Returns YYYY-MM-DD or null if invalid.
 */
export function normalizeToDbDate(val) {
  if (val === undefined || val === null || val === '') return null;

  if (val instanceof Date && !isNaN(val.getTime())) {
    const yyyy = val.getFullYear();
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    const dd = String(val.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  if (typeof val === 'number') {
    if (val >= 1900 && val <= 2100) return `${val}-01-01`;
    if (val > 25567 && val < 100000) {
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

  // YYYY-MM-DD
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

  // DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY / DD MM YYYY or DD-MM-YY
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
 * Formats YYYY-MM-DD or ISO string to DD-MM-YYYY for display in UI tables.
 */
export function formatDisplayDate(val) {
  if (!val) return '';
  const normalized = normalizeToDbDate(val);
  if (!normalized) return String(val);
  const [yyyy, mm, dd] = normalized.split('-');
  return `${dd}-${mm}-${yyyy}`;
}
