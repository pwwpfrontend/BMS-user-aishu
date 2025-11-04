import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Grid3x3, ChevronLeft, ChevronRight, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { DateTime, Duration } from 'luxon';

// Inlined booking utilities (from src/utils/bookingApi)
const BASE_URL = 'https://njs-01.optimuslab.space/booking_system';
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
async function viewAllResources() {
  const response = await apiRequest('/viewAllresources');
  return response.data || [];
}
async function getResourceScheduleInfo(resourceName, weekday = null) {
  const encodedName = encodeURIComponent(resourceName);
  const url = weekday 
    ? `/getResourceScheduleInfo/${encodedName}?weekday=${weekday.toLowerCase()}`
    : `/getResourceScheduleInfo/${encodedName}`;
  const response = await apiRequest(url);
  return response;
}
async function viewFilteredBookings(filters = {}) {
  const params = new URLSearchParams();
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
async function getResourceBookingsForDate(resourceId, date) {
  const resourceBookings = await viewFilteredBookings({ resource_id: resourceId });
  return resourceBookings.filter(booking => {
    if (!booking.starts_at) return false;
    const bookingDate = booking.starts_at.split('T')[0];
    return bookingDate === date;
  });
}

// Inlined time utilities (from src/utils/time)
function isoToZonedDate(isoString, timezone = null) {
  const dt = DateTime.fromISO(isoString);
  return timezone ? dt.setZone(timezone) : dt;
}
function minutesFromMidnight(dateTime) {
  return dateTime.hour * 60 + dateTime.minute;
}
function parseDurationToMinutes(isoDuration) {
  try {
    const duration = Duration.fromISO(isoDuration);
    return duration.as('minutes');
  } catch (error) {
    console.error('Error parsing duration:', isoDuration, error);
    return 15;
  }
}
function splitBlockIntoSlots(startTimeStr, endTimeStr, stepMinutes, date) {
  const slots = [];
  const [startHour, startMin] = startTimeStr.split(':').map(Number);
  const [endHour, endMin] = endTimeStr.split(':').map(Number);
  let current = date.set({ hour: startHour, minute: startMin, second: 0, millisecond: 0 });
  const end = date.set({ hour: endHour, minute: endMin, second: 0, millisecond: 0 });
  while (current < end) {
    const next = current.plus({ minutes: stepMinutes });
    if (next > end) break;
    slots.push({
      startMin: minutesFromMidnight(current),
      endMin: minutesFromMidnight(next),
      isoStart: current.toISO(),
      isoEnd: next.toISO(),
      isBooked: false,
      bookingId: null,
      bookingMeta: null,
      availableCount: 1,
    });
    current = next;
  }
  return slots;
}
function markBookedSlots(slots, bookings, maxSimultaneous = 1, timezone = 'UTC') {
  const slotBookingCounts = new Map();
  slots.forEach((slot, idx) => slotBookingCounts.set(idx, []));
  bookings.forEach((booking) => {
    const bookingStart = isoToZonedDate(booking.starts_at, timezone);
    const bookingEnd = isoToZonedDate(booking.ends_at, timezone);
    const bookingStartMin = minutesFromMidnight(bookingStart);
    const bookingEndMin = minutesFromMidnight(bookingEnd);
    slots.forEach((slot, idx) => {
      const slotOverlaps = (slot.startMin < bookingEndMin && slot.endMin > bookingStartMin);
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
function generateSlotGroups(scheduleBlocks, bookings, date, stepMinutes = 15, maxSimultaneous = 1, timezone = 'UTC') {
  const slotGroups = [];
  const zonedDate = date.setZone(timezone);
  scheduleBlocks.forEach((block) => {
    const slots = splitBlockIntoSlots(
      block.start_time,
      block.end_time,
      stepMinutes,
      zonedDate
    );
    const slotsWithBookings = markBookedSlots(
      slots,
      bookings,
      maxSimultaneous,
      timezone
    );
    slotGroups.push({
      blockStart: block.start_time.substring(0, 5),
      blockEnd: block.end_time.substring(0, 5),
      slots: slotsWithBookings,
    });
  });
  return slotGroups;
}
function getWeekdayName(date, timezone = 'UTC') {
  let dt;
  if (typeof date === 'string') {
    dt = isoToZonedDate(date, timezone);
  } else {
    dt = date.setZone(timezone);
  }
  return dt.weekdayLong.toLowerCase();
}
function formatDateToYYYYMMDD(dateTime) {
  return dateTime.toFormat('yyyy-MM-dd');
}

// Resource Card Component for Grid View
const ResourceCard = ({ resource, onBook, selectedDate }) => {
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [slotGroups, setSlotGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  // Flatten all slots from all groups for rendering
  const allSlots = slotGroups.flatMap(group => group.slots);

  // Generate display time slots (for UI visualization)
  const generateDisplayTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 23; hour++) {
      slots.push({ time: `${hour.toString().padStart(2, '0')}:00`, hour, minute: 0 });
      slots.push({ time: `${hour.toString().padStart(2, '0')}:30`, hour, minute: 30 });
    }
    return slots;
  };

  const displaySlots = generateDisplayTimeSlots();

  // Load schedule and bookings when resource or date changes
  useEffect(() => {
    let isMounted = true;

    const loadSlots = async () => {
      if (!resource || !selectedDate) return;

      setLoading(true);
      try {
        // Get timezone - from resource's associated location if available, otherwise UTC
        const timezone = 'Asia/Hong_Kong'; // Default timezone based on API response
        
        // Parse selected date
        const dateObj = DateTime.fromFormat(selectedDate, 'dd/MM/yyyy', { zone: timezone });
        const weekday = getWeekdayName(dateObj, timezone);
        const dateStr = formatDateToYYYYMMDD(dateObj);

        // Fetch schedule blocks for this resource (returns all weekdays)
        const scheduleResponse = await getResourceScheduleInfo(resource.name);
        const allScheduleBlocks = scheduleResponse?.schedule_blocks || [];
        
        // Filter schedule blocks for the selected weekday
        const scheduleBlocks = allScheduleBlocks.filter(block => 
          block.weekday.toLowerCase() === weekday.toLowerCase()
        );

        // Fetch bookings for this resource on this date
        const bookings = await getResourceBookingsForDate(resource.id, dateStr);

        if (!isMounted) return;

        // Determine slot step from service
        const stepMinutes = resource.service?.duration_step 
          ? parseDurationToMinutes(resource.service.duration_step) 
          : 15;

        // Generate slot groups
        const groups = generateSlotGroups(
          scheduleBlocks,
          bookings,
          dateObj,
          stepMinutes,
          resource.max_simultaneous_bookings || 1,
          timezone
        );

        setSlotGroups(groups);
      } catch (error) {
        console.error('Error loading slots:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadSlots();

    return () => {
      isMounted = false;
    };
  }, [resource, selectedDate]);

  // Get slot status based on real data
  const getSlotStatus = (displaySlot) => {
    const slotTime = displaySlot.hour * 60 + displaySlot.minute;
    
    // Find matching slot in allSlots
    const matchingSlot = allSlots.find(s => 
      s.startMin <= slotTime && s.endMin > slotTime
    );

    if (!matchingSlot) {
      return 'unavailable';
    }

    return matchingSlot.isBooked ? 'booked' : 'available';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex gap-4 p-4">
        {/* Image - Left Side */}
        <div className="flex-shrink-0">
          <img 
            src={resource.image} 
            alt={resource.name}
            className="w-64 h-48 object-cover rounded-lg"
          />
        </div>

        {/* Content - Right Side */}
        <div className="flex-1 flex flex-col">
          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 mb-3" style={{ fontFamily: 'Inter' }}>
            {resource.name}
          </h3>

          {/* Tags */}
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center gap-1 text-sm text-gray-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span style={{ fontFamily: 'Inter' }}>x{resource.capacity}</span>
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-md" style={{ fontFamily: 'Inter' }}>
              {resource.pricing}
            </span>
            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-md" style={{ fontFamily: 'Inter' }}>
              {resource.type}
            </span>
          </div>

          {/* Note (if exists) */}
          {resource.note && (
            <p className="text-sm text-gray-900 mb-2" style={{ fontFamily: 'Inter' }}>
              {resource.note}
            </p>
          )}
          
          {/* Amenities */}
          <div className="text-sm text-gray-600 mb-4 flex items-start gap-2" style={{ fontFamily: 'Inter' }}>
            <span className="text-gray-400 flex-shrink-0">+</span>
            <span>{resource.amenities}</span>
          </div>

          {/* Spacer to push button and timeline to bottom */}
          <div className="flex-1"></div>

          {/* Book Now Button - Aligned to right */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => onBook(resource)}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              style={{ fontFamily: 'Inter' }}
            >
              Book now
            </button>
          </div>

          {/* Interactive Time Slots - At Bottom */}
          <div className="relative">
            {loading ? (
              <div className="text-xs text-gray-500 mb-2" style={{ fontFamily: 'Inter' }}>
                Loading schedule...
              </div>
            ) : (
              <div className="flex items-center gap-0.5 mb-2">
                {displaySlots.map((slot, index) => {
                  const status = getSlotStatus(slot);
                  return (
                    <div
                      key={index}
                      className={`h-5 flex-1 transition-all ${
                        status === 'available' 
                          ? 'hover:opacity-80 cursor-pointer' 
                          : status === 'booked'
                          ? 'cursor-not-allowed'
                          : 'bg-gray-200 cursor-not-allowed'
                      }`}
                      style={
                        status === 'available' 
                          ? { backgroundColor: '#96D395' }
                          : status === 'booked'
                          ? { backgroundColor: '#D09090' }
                          : {}
                      }
                      onMouseEnter={() => setHoveredSlot(slot)}
                      onMouseLeave={() => setHoveredSlot(null)}
                      title={`${slot.time} - ${status}`}
                    />
                  );
                })}
              </div>
            )}

            {/* Time Labels */}
            <div className="flex justify-between text-xs text-gray-500" style={{ fontFamily: 'Inter' }}>
              <span>08:00</span>
              <span>10:00</span>
              <span>12:00</span>
              <span>14:00</span>
              <span>16:00</span>
              <span>18:00</span>
              <span>20:00</span>
              <span>22:00</span>
            </div>

            {/* Hover Tooltip */}
            {hoveredSlot && (
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-md whitespace-nowrap z-10" style={{ fontFamily: 'Inter' }}>
                {hoveredSlot.time} - {getSlotStatus(hoveredSlot)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Calendar Event Component
const CalendarEvent = ({ event, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-blue-50 border-l-2 border-blue-600 px-2 py-1 mb-1 rounded text-xs cursor-pointer hover:bg-blue-100 transition-colors"
      style={{ fontFamily: 'Inter' }}
    >
      <div className="font-medium text-gray-900">{event.name}</div>
      <div className="text-gray-600">{event.time}</div>
    </div>
  );
};

export default function Bookings() {
  const navigate = useNavigate();
  const [view, setView] = useState('grid'); // 'grid' or 'calendar'
  
  // Set default date to today
  const today = DateTime.now();
  const [selectedDate, setSelectedDate] = useState(today.toFormat('dd/MM/yyyy'));
  const [startTime, setStartTime] = useState('3:00 PM');
  const [endTime, setEndTime] = useState('4:00 PM');
  const [resourceFilter, setResourceFilter] = useState('All Resources');
  const [isResourceFilterOpen, setIsResourceFilterOpen] = useState(false);
  const [isOtherFiltersOpen, setIsOtherFiltersOpen] = useState(false);
  
  // Resources state
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(today.toFormat('MMMM yyyy'));
  const [calendarView, setCalendarView] = useState('Month'); // Month, Week, Day, 30 days

  const resourceOptions = ['All Resources', 'Meeting Rooms', 'Event Halls', 'Co-Working Spaces'];

  // Fetch resources on mount
  useEffect(() => {
    let isMounted = true;

    const fetchResources = async () => {
      try {
        const apiResources = await viewAllResources();
        
        if (!isMounted) return;

        // Map API resources to UI format
        const mappedResources = apiResources.map(resource => {
          // Handle rates - it's an array of rate objects
          let pricingDisplay = 'Free of Charge';
          if (resource.metadata?.rates && Array.isArray(resource.metadata.rates) && resource.metadata.rates.length > 0) {
            // Use the first rate's price_name or price
            const firstRate = resource.metadata.rates[0];
            if (firstRate.price_name) {
              pricingDisplay = firstRate.price_name;
            } else if (firstRate.price !== undefined) {
              pricingDisplay = `$${firstRate.price}`;
            }
          }

          return {
            id: resource.id,
            name: resource.name,
            capacity: resource.metadata?.capacity || resource.max_simultaneous_bookings || 1,
            pricing: pricingDisplay,
            type: resource.metadata?.category || 'Resource',
            note: resource.metadata?.resource_details?.note || '',
            amenities: resource.metadata?.resource_details?.description || 'Standard amenities',
            image: resource.metadata?.photo_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
            // Pass through full resource data
            ...resource
          };
        });

        setResources(mappedResources);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching resources:', error);
        if (isMounted) {
          setError(error.message || 'Failed to load resources');
          setLoading(false);
        }
      }
    };

    fetchResources();

    return () => {
      isMounted = false;
    };
  }, []);


  // Sample calendar events
  const calendarEvents = {
    'Sun-28': [],
    'Mon-29': [
      { name: '2A Meeting Room - Large', time: '03:00 pm' },
      { name: 'UGA Event hall', time: '09:00 am' },
      { name: '2A Meeting Room - Large', time: '11:00 am' },
      { name: '2A Meeting Room - Small', time: '11:00 am' },
      { name: '1B Meeting Room', time: '04:00 pm' },
      { name: '3A Meeting Room', time: '05:30 pm' },
      { name: 'UGA Event hall', time: '07:00 pm' },
    ],
    'Tue-30': [
      { name: 'UGA Event hall', time: '09:00 am' },
      { name: '2A Meeting Room - Small', time: '09:00 am' },
      { name: '1B Meeting Room', time: '10:00 am' },
      { name: '2A Meeting Room - Small', time: '11:30 am' },
      { name: '1B Meeting Room', time: '02:00 pm' },
      { name: '2A Meeting Room - Large', time: '03:30 pm' },
    ],
    'Wed-1': [
      { name: '1B Meeting Room', time: '10:00 am' },
      { name: '3A Meeting Room', time: '10:00 am' },
      { name: '3B VIP Room', time: '01:30 pm' },
      { name: 'UGA Event hall', time: '02:00 pm' },
      { name: '1B Meeting Room', time: '04:30 pm' },
    ],
    'Thu-2': [
      { name: '1B Meeting Room', time: '09:00 am' },
      { name: '1B Meeting Room', time: '02:00 pm' },
      { name: '1B Meeting Room', time: '04:00 pm' },
    ],
    'Fri-3': [
      { name: '1B Meeting Room', time: '09:00 am' },
      { name: '3A Meeting Room', time: '10:00 am' },
      { name: '1B Meeting Room', time: '02:00 pm' },
    ],
    'Sat-4': [],
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dates = [
    { day: 'Sun', date: 28, key: 'Sun-28' },
    { day: 'Mon', date: 29, key: 'Mon-29' },
    { day: 'Tue', date: 30, key: 'Tue-30' },
    { day: 'Wed', date: 1, key: 'Wed-1' },
    { day: 'Thu', date: 2, key: 'Thu-2' },
    { day: 'Fri', date: 3, key: 'Fri-3' },
    { day: 'Sat', date: 4, key: 'Sat-4' },
  ];

  const handleBookResource = (resource) => {
    navigate(`/booking/${resource.id}`, { 
      state: { 
        booking: {
          ...resource,
          date: selectedDate,
          time: `${startTime} - ${endTime}`,
          location: 'CUHK InnoPort'
        } 
      } 
    });
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header with Filters */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            {/* Resource Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsResourceFilterOpen(!isResourceFilterOpen)}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                style={{ fontFamily: 'Inter' }}
              >
                <span>{resourceFilter}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {isResourceFilterOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {resourceOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setResourceFilter(option);
                        setIsResourceFilterOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        resourceFilter === option ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-700'
                      }`}
                      style={{ fontFamily: 'Inter' }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View Toggle Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('grid')}
                className={`p-2.5 rounded-lg transition-colors ${
                  view === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`p-2.5 rounded-lg transition-colors ${
                  view === 'calendar'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Date and Time Filters (Grid View Only) */}
          {view === 'grid' && (
            <div className="flex items-end justify-between gap-4 mb-6">
              <div className="flex items-end gap-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                    Date
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      placeholder="DD/MM/YYYY"
                      className="w-40 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      style={{ fontFamily: 'Inter' }}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                    Time
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-32 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        style={{ fontFamily: 'Inter' }}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    
                    <div className="relative">
                      <input
                        type="text"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-32 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        style={{ fontFamily: 'Inter' }}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other Filters Button */}
              <button
                onClick={() => setIsOtherFiltersOpen(!isOtherFiltersOpen)}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                style={{ fontFamily: 'Inter' }}
              >
                <span>Other filters</span>
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Calendar View Controls */}
          {view === 'calendar' && (
            <div className="flex items-center justify-between mb-4">
              {/* Calendar View Type Buttons */}
              <div className="flex items-center gap-2">
                {['Month', 'Week', 'Day', '30 days'].map((viewType) => (
                  <button
                    key={viewType}
                    onClick={() => setCalendarView(viewType)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      calendarView === viewType
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                    style={{ fontFamily: 'Inter' }}
                  >
                    {viewType}
                  </button>
                ))}
              </div>

              {/* Month Navigation */}
              <div className="flex items-center gap-4">
                <button className="text-blue-600 text-sm font-medium hover:underline" style={{ fontFamily: 'Inter' }}>
                  Today
                </button>
                <div className="flex items-center gap-2">
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <span className="text-lg font-semibold text-gray-900 min-w-[150px] text-center" style={{ fontFamily: 'Inter' }}>
                    {currentMonth}
                  </span>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Grid View */}
        {view === 'grid' && (
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-8 text-gray-500" style={{ fontFamily: 'Inter' }}>
                Loading resources...
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600" style={{ fontFamily: 'Inter' }}>
                {error}
              </div>
            ) : resources.length === 0 ? (
              <div className="text-center py-8 text-gray-500" style={{ fontFamily: 'Inter' }}>
                No resources available.
              </div>
            ) : (
              resources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  selectedDate={selectedDate}
                  onBook={handleBookResource}
                />
              ))
            )}
          </div>
        )}

        {/* Calendar View */}
        {view === 'calendar' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Calendar Header */}
            <div className="grid grid-cols-7 border-b border-gray-200">
              {days.map((day) => (
                <div
                  key={day}
                  className="p-4 text-center text-sm font-semibold text-gray-700 border-r border-gray-200 last:border-r-0"
                  style={{ fontFamily: 'Inter' }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {dates.map((dateInfo) => (
                <div
                  key={dateInfo.key}
                  className="border-r border-gray-200 last:border-r-0 min-h-[150px] p-2 bg-gray-50/50"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(229, 231, 235, 0.3) 1px, rgba(229, 231, 235, 0.3) 2px)'
                  }}
                >
                  <div className="text-sm font-medium text-gray-500 mb-2" style={{ fontFamily: 'Inter' }}>
                    {dateInfo.date}
                  </div>
                  <div className="space-y-1">
                    {calendarEvents[dateInfo.key]?.map((event, idx) => (
                      <CalendarEvent
                        key={idx}
                        event={event}
                        onClick={() => {}}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}