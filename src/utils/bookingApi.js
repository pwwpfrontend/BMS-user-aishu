/**
 * Hapio Booking System API Wrappers
 * Base URL: https://njs-01.optimuslab.space/booking_system
 */

const BASE_URL = 'https://njs-01.optimuslab.space/booking_system';

/**
 * Generic fetch wrapper with error handling
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

/**
 * GET /viewAllBookings
 * Returns all bookings
 */
export async function viewAllBookings() {
  const response = await apiRequest('/viewAllBookings');
  return response.data || [];
}

/**
 * GET /viewFilteredBookings
 * Returns filtered bookings based on query parameters
 * @param {Object} filters - { resource_id, location_id, service_id }
 * Note: API does NOT support customer_id filtering. Use viewAllBookings() and filter client-side instead.
 */
export async function viewFilteredBookings(filters = {}) {
  const params = new URLSearchParams();
  
  // Only add supported filter parameters
  const validFilters = ['resource_id', 'location_id', 'service_id'];
  Object.entries(filters).forEach(([key, value]) => {
    if (validFilters.includes(key) && value !== undefined && value !== null && value !== '') {
      params.append(key, value);
    }
  });
  
  const queryString = params.toString();
  const endpoint = queryString ? `/viewFilteredBookings?${queryString}` : '/viewFilteredBookings';
  
  const response = await apiRequest(endpoint);
  return response.data || [];
}

/**
 * GET /viewBooking/<booking_id>
 * Returns a single booking by ID
 */
export async function viewBooking(bookingId) {
  const response = await apiRequest(`/viewBooking/${bookingId}`);
  return response.data;
}

/**
 * POST /createBookings
 * Creates a new booking
 * @param {Object} bookingData - Booking data to create
 */
export async function createBooking(bookingData) {
  const response = await apiRequest('/createBookings', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  });
  return response;
}

/**
 * PATCH /updateBooking/<booking_id>
 * Updates an existing booking
 * @param {string} bookingId - Booking ID to update
 * @param {Object} updates - Fields to update
 */
export async function updateBooking(bookingId, updates) {
  const response = await apiRequest(`/updateBooking/${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return response;
}

/**
 * DELETE /deleteBooking/<booking_id>
 * Deletes a booking
 */
export async function deleteBooking(bookingId) {
  const response = await apiRequest(`/deleteBooking/${bookingId}`, {
    method: 'DELETE',
  });
  return response;
}

/**
 * GET /viewAllresources
 * Returns all resources
 */
export async function viewAllResources() {
  const response = await apiRequest('/viewAllresources');
  return response.data || [];
}

/**
 * GET /getResourceScheduleInfo/<resource_name>?weekday=<weekday>
 * Returns resource schedule info for a specific weekday (or all weekdays if not specified)
 * @param {string} resourceName - URL-encoded resource name
 * @param {string} weekday - Optional weekday name (lowercase, e.g., 'monday', 'tuesday'). If omitted, returns all weekdays
 */
export async function getResourceScheduleInfo(resourceName, weekday = null) {
  const encodedName = encodeURIComponent(resourceName);
  const url = weekday 
    ? `/getResourceScheduleInfo/${encodedName}?weekday=${weekday.toLowerCase()}`
    : `/getResourceScheduleInfo/${encodedName}`;
  const response = await apiRequest(url);
  return response;
}

/**
 * GET /getResourceWeeklySchedule/<resource_name>
 * Returns weekly schedule for a resource
 */
export async function getResourceWeeklySchedule(resourceName) {
  const encodedName = encodeURIComponent(resourceName);
  const response = await apiRequest(`/getResourceWeeklySchedule/${encodedName}`);
  return response.data;
}

/**
 * GET /getAllResourceScheduleBlocks/<resource_name>
 * Returns all schedule blocks for a resource
 */
export async function getAllResourceScheduleBlocks(resourceName) {
  const encodedName = encodeURIComponent(resourceName);
  const response = await apiRequest(`/getAllResourceScheduleBlocks/${encodedName}`);
  return response.data;
}

/**
 * GET /getService/<service_id>
 * Returns service details
 */
export async function getService(serviceId) {
  const response = await apiRequest(`/getService/${serviceId}`);
  return response.data;
}

/**
 * POST /getServiceIdbyResourceId
 * Returns service ID for a resource ID
 * @param {string} resourceId - Resource ID
 */
export async function getServiceIdByResourceId(resourceId) {
  const response = await apiRequest('/getServiceIdbyResourceId', {
    method: 'POST',
    body: JSON.stringify({ resource_id: resourceId }),
  });
  return response.data;
}

/**
 * Helper: Get bookings for current user
 * Note: API doesn't support customer_id filtering, so we fetch all bookings and filter client-side
 */
export async function getMyBookings(userEmail) {
  const allBookings = await viewAllBookings();
  return allBookings.filter(booking => booking.metadata?.customer_id === userEmail);
}

/**
 * Helper: Get bookings for a specific resource on a date
 * @param {string} resourceId - Resource ID
 * @param {string} date - Date in YYYY-MM-DD format
 * Note: API doesn't support date filtering, so we filter by resource then filter by date client-side
 */
export async function getResourceBookingsForDate(resourceId, date) {
  // Get all bookings for this resource
  const resourceBookings = await viewFilteredBookings({ resource_id: resourceId });
  
  // Filter by date client-side (check if booking starts_at is on the target date)
  return resourceBookings.filter(booking => {
    if (!booking.starts_at) return false;
    const bookingDate = booking.starts_at.split('T')[0]; // Extract YYYY-MM-DD from ISO string
    return bookingDate === date;
  });
}
