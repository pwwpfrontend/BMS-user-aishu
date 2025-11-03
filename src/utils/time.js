/**
 * Time utilities for booking slot generation with timezone support
 * Uses Luxon for robust timezone handling
 */

import { DateTime, Duration } from 'luxon';

/**
 * Convert ISO string with timezone to a Luxon DateTime object in the specified timezone
 * @param {string} isoString - ISO 8601 datetime string (e.g., "2025-11-04T09:30:00+08:00")
 * @param {string} timezone - IANA timezone (e.g., "Asia/Hong_Kong")
 * @returns {DateTime} Luxon DateTime object
 */
export function isoToZonedDate(isoString, timezone = null) {
  const dt = DateTime.fromISO(isoString);
  
  if (timezone) {
    return dt.setZone(timezone);
  }
  
  return dt;
}

/**
 * Get minutes from midnight for a given DateTime
 * @param {DateTime} dateTime - Luxon DateTime object
 * @returns {number} Minutes since midnight (0-1439)
 */
export function minutesFromMidnight(dateTime) {
  return dateTime.hour * 60 + dateTime.minute;
}

/**
 * Parse ISO 8601 duration to minutes (e.g., "PT15M" -> 15)
 * @param {string} isoDuration - ISO 8601 duration string
 * @returns {number} Duration in minutes
 */
export function parseDurationToMinutes(isoDuration) {
  try {
    const duration = Duration.fromISO(isoDuration);
    return duration.as('minutes');
  } catch (error) {
    console.error('Error parsing duration:', isoDuration, error);
    return 15; // Default to 15 minutes
  }
}

/**
 * Split a schedule block into time slots
 * @param {string} startTimeStr - Start time string (e.g., "09:00:00")
 * @param {string} endTimeStr - End time string (e.g., "18:00:00")
 * @param {number} stepMinutes - Slot interval in minutes
 * @param {DateTime} date - The date for this schedule (Luxon DateTime in resource timezone)
 * @returns {Array} Array of slot objects
 */
export function splitBlockIntoSlots(startTimeStr, endTimeStr, stepMinutes, date) {
  const slots = [];
  
  // Parse start and end times (HH:MM:SS format)
  const [startHour, startMin] = startTimeStr.split(':').map(Number);
  const [endHour, endMin] = endTimeStr.split(':').map(Number);
  
  // Create DateTime objects for start and end in the resource's timezone
  let current = date.set({ hour: startHour, minute: startMin, second: 0, millisecond: 0 });
  const end = date.set({ hour: endHour, minute: endMin, second: 0, millisecond: 0 });
  
  while (current < end) {
    const next = current.plus({ minutes: stepMinutes });
    
    // Don't create slot if it would exceed the block end
    if (next > end) {
      break;
    }
    
    slots.push({
      startMin: minutesFromMidnight(current),
      endMin: minutesFromMidnight(next),
      isoStart: current.toISO(),
      isoEnd: next.toISO(),
      isBooked: false,
      bookingId: null,
      bookingMeta: null,
      availableCount: 1, // Will be updated based on resource capacity
    });
    
    current = next;
  }
  
  return slots;
}

/**
 * Mark slots as booked based on existing bookings
 * @param {Array} slots - Array of slot objects
 * @param {Array} bookings - Array of booking objects from API
 * @param {number} maxSimultaneous - Max simultaneous bookings allowed
 * @param {string} timezone - Resource timezone
 * @returns {Array} Slots with booking information updated
 */
export function markBookedSlots(slots, bookings, maxSimultaneous = 1, timezone = 'UTC') {
  // Initialize booking counters for each slot
  const slotBookingCounts = new Map();
  slots.forEach((slot, idx) => slotBookingCounts.set(idx, []));
  
  // Process each booking
  bookings.forEach((booking) => {
    const bookingStart = isoToZonedDate(booking.starts_at, timezone);
    const bookingEnd = isoToZonedDate(booking.ends_at, timezone);
    
    const bookingStartMin = minutesFromMidnight(bookingStart);
    const bookingEndMin = minutesFromMidnight(bookingEnd);
    
    // Mark all overlapping slots
    slots.forEach((slot, idx) => {
      // Check if slot overlaps with booking
      const slotOverlaps = 
        (slot.startMin < bookingEndMin && slot.endMin > bookingStartMin);
      
      if (slotOverlaps) {
        const bookingList = slotBookingCounts.get(idx);
        bookingList.push({
          bookingId: booking.id,
          customerId: booking.customer_id,
          customerName: booking.metadata?.customer_name,
          starts_at: booking.starts_at,
          ends_at: booking.ends_at,
        });
      }
    });
  });
  
  // Update slots with booking information
  return slots.map((slot, idx) => {
    const bookingList = slotBookingCounts.get(idx);
    const bookingCount = bookingList.length;
    
    return {
      ...slot,
      isBooked: bookingCount >= maxSimultaneous,
      availableCount: Math.max(0, maxSimultaneous - bookingCount),
      bookingId: bookingCount > 0 ? bookingList[0].bookingId : null,
      bookingMeta: bookingCount > 0 ? bookingList : null,
    };
  });
}

/**
 * Generate slot groups for UI rendering
 * Combines schedule blocks + bookings into the slot-bar data structure
 * 
 * @param {Array} scheduleBlocks - Schedule blocks from API (e.g., [{start_time: "09:00:00", end_time: "18:00:00"}])
 * @param {Array} bookings - Bookings for this date from API
 * @param {DateTime} date - The date in the resource's timezone
 * @param {number} stepMinutes - Slot duration in minutes (default 15)
 * @param {number} maxSimultaneous - Max simultaneous bookings (default 1)
 * @param {string} timezone - Resource timezone
 * @returns {Array} Array of slot groups for UI
 */
export function generateSlotGroups(
  scheduleBlocks,
  bookings,
  date,
  stepMinutes = 15,
  maxSimultaneous = 1,
  timezone = 'UTC'
) {
  const slotGroups = [];
  
  // Ensure date is in the correct timezone
  const zonedDate = date.setZone(timezone);
  
  // Process each schedule block
  scheduleBlocks.forEach((block) => {
    const slots = splitBlockIntoSlots(
      block.start_time,
      block.end_time,
      stepMinutes,
      zonedDate
    );
    
    // Mark booked slots
    const slotsWithBookings = markBookedSlots(
      slots,
      bookings,
      maxSimultaneous,
      timezone
    );
    
    slotGroups.push({
      blockStart: block.start_time.substring(0, 5), // "09:00"
      blockEnd: block.end_time.substring(0, 5), // "18:00"
      slots: slotsWithBookings,
    });
  });
  
  return slotGroups;
}

/**
 * Format ISO datetime for display
 * @param {string} isoString - ISO datetime string
 * @param {string} timezone - Target timezone
 * @param {string} format - Format string (default: 'hh:mm a')
 * @returns {string} Formatted time string
 */
export function formatTime(isoString, timezone = 'UTC', format = 'hh:mm a') {
  const dt = isoToZonedDate(isoString, timezone);
  return dt.toFormat(format);
}

/**
 * Format date for display
 * @param {string} isoString - ISO datetime string
 * @param {string} timezone - Target timezone
 * @param {string} format - Format string (default: 'EEE, d MMM yyyy')
 * @returns {string} Formatted date string
 */
export function formatDate(isoString, timezone = 'UTC', format = 'EEE, d MMM yyyy') {
  const dt = isoToZonedDate(isoString, timezone);
  return dt.toFormat(format);
}

/**
 * Get weekday name from date
 * @param {DateTime|string} date - Luxon DateTime or ISO string
 * @param {string} timezone - Timezone to use
 * @returns {string} Lowercase weekday name (e.g., 'monday', 'tuesday')
 */
export function getWeekdayName(date, timezone = 'UTC') {
  let dt;
  if (typeof date === 'string') {
    dt = isoToZonedDate(date, timezone);
  } else {
    dt = date.setZone(timezone);
  }
  
  return dt.weekdayLong.toLowerCase();
}

/**
 * Get today's date in a specific timezone
 * @param {string} timezone - IANA timezone
 * @returns {DateTime} Luxon DateTime for today
 */
export function getTodayInTimezone(timezone = 'UTC') {
  return DateTime.now().setZone(timezone).startOf('day');
}

/**
 * Convert date string (YYYY-MM-DD) to DateTime in timezone
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {string} timezone - IANA timezone
 * @returns {DateTime} Luxon DateTime
 */
export function dateStringToZonedDate(dateString, timezone = 'UTC') {
  return DateTime.fromFormat(dateString, 'yyyy-MM-dd', { zone: timezone });
}

/**
 * Format DateTime to YYYY-MM-DD string
 * @param {DateTime} dateTime - Luxon DateTime
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function formatDateToYYYYMMDD(dateTime) {
  return dateTime.toFormat('yyyy-MM-dd');
}
