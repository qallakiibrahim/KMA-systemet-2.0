/**
 * Safely parses any date-like value (including Firestore Timestamps, ISO strings,
 * and serialized timestamp objects) into a valid JavaScript Date object.
 * Always resolves to a valid Date object, falling back to the current date
 * rather than throwing a RangeError or returning "Invalid Date".
 */
export const parseSafeDate = (val) => {
  if (val === null || val === undefined) {
    return new Date();
  }

  // If it's already a JS Date object
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? new Date() : val;
  }

  // If it has Firestore `.toDate()` method
  if (typeof val.toDate === 'function') {
    try {
      const d = val.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) {
        return d;
      }
    } catch (e) {
      console.warn('Error converting Firestore timestamp toDate:', e);
    }
  }

  // If it's a Firestore-like plain object { seconds, nanoseconds } or { _seconds, _nanoseconds }
  if (typeof val === 'object') {
    const seconds = val.seconds ?? val._seconds;
    const nanoseconds = val.nanoseconds ?? val._nanoseconds;
    if (typeof seconds === 'number') {
      const ms = seconds * 1000 + Math.floor((nanoseconds || 0) / 1000000);
      const d = new Date(ms);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
  }

  // Handle number or string
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  // Safe fallback to current date
  return new Date();
};

/**
 * Formats a date safely to standard locale string representation.
 */
export const formatLocalDate = (val, locale = 'sv-SE', options = {}) => {
  try {
    return parseSafeDate(val).toLocaleDateString(locale, options);
  } catch (error) {
    console.error('Error in formatLocalDate:', error);
    return new Date().toLocaleDateString(locale, options);
  }
};

/**
 * Formats a date + time safely to standard locale representation.
 */
export const formatLocalDateTime = (val, locale = 'sv-SE', options = { dateStyle: 'short', timeStyle: 'short' }) => {
  try {
    return parseSafeDate(val).toLocaleString(locale, options);
  } catch (error) {
    console.error('Error in formatLocalDateTime:', error);
    return new Date().toLocaleString(locale, options);
  }
};
