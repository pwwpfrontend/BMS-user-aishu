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
    
    // Get response as text first to handle parsing errors
    const responseText = await response.text();
    
    // Try to parse as JSON
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      // If it's not JSON, return the text if it's a simple string response
      // (like service ID which might be returned as plain text)
      if (responseText && responseText.trim()) {
        return responseText.trim();
      }
      throw new Error(`Failed to parse response as JSON: ${parseError.message}`);
    }
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}
async function viewAllResources() {
  const response = await apiRequest('/viewAllresources');
  return response || [];
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
  // API returns {data: [], meta: {}, links: {}}
  return Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
}
async function viewAllBookings() {
  const resp = await apiRequest('/viewAllBookings');
  // API returns {data: [], meta: {}, links: {}}
  return Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
}
async function getResourceBookingsForDate(resourceObj, date) {
  const all = await viewAllBookings();
  return all.filter(b => {
    const sameResource = (b.resource?.id && resourceObj.id && b.resource.id === resourceObj.id) || (b.resource?.name && b.resource.name === resourceObj.name);
    if (!sameResource) return false;
    if (!b?.starts_at) return false;
    const bookingDate = b.starts_at.split('T')[0];
    return bookingDate === date && !b.is_canceled;
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
const ResourceCard = ({ resource, onBook, selectedDate, selectedStartTime, selectedEndTime }) => {
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [slotData, setSlotData] = useState({ scheduleSlots: [], bookedSlots: [], slotInterval: 15 });
  const [loading, setLoading] = useState(false);
  const [featuresText, setFeaturesText] = useState('');

  // Generate time slots from 08:00 to 23:00 based on duration_step (same as dashboard)
  const generateTimeSlots = (intervalMinutes = 15) => {
    const slots = [];
    const startHour = 8;
    const endHour = 23;
    
    for (let totalMinutes = startHour * 60; totalMinutes < endHour * 60; totalMinutes += intervalMinutes) {
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      slots.push({ 
        time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`, 
        hour, 
        minute 
      });
    }
    return slots;
  };

  const timeSlots = generateTimeSlots(slotData.slotInterval);

  // Fetch resource features by mongo id if available
  useEffect(() => {
    let isMounted = true;
    const fetchFeatures = async () => {
      const mongoId = resource?.mongoId;
      if (!mongoId) return;
      try {
        const resp = await fetch(`${BASE_URL}/resource/${mongoId}`);
        if (!resp.ok) return;
        const data = await resp.json();
        const groups = ['features', 'amenities', 'security'];
        const enabled = [];
        groups.forEach(g => {
          const obj = data[g] || {};
          Object.entries(obj).forEach(([k, v]) => {
            if (v && v.enabled) {
              const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              enabled.push(label);
            }
          });
        });
        if (isMounted && enabled.length > 0) setFeaturesText(enabled.join(' • '));
      } catch (_) {}
    };
    fetchFeatures();
    return () => { isMounted = false; };
  }, [resource?.mongoId]);

  // Load schedule and bookings when resource or date changes (same logic as dashboard)
  useEffect(() => {
    let isMounted = true;

    const fetchSlotData = async () => {
      if (!resource || !selectedDate) return;

      setLoading(true);
      try {
        // Get resource name and selected date
        const resourceName = resource.name;
        const bookingDate = new Date(selectedDate);
        const weekday = bookingDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

        // Fetch schedule blocks for this resource (same as dashboard)
        const scheduleResponse = await getResourceScheduleInfo(resourceName);
        const allScheduleBlocks = Array.isArray(scheduleResponse) 
          ? scheduleResponse 
          : (scheduleResponse?.schedule_blocks || scheduleResponse?.data || []);
        
        // Filter for the selected weekday
        const todaySchedule = allScheduleBlocks.filter(block => 
          (block.weekday || '').toLowerCase() === weekday
        );

        // Convert schedule blocks to minute ranges (same as dashboard)
        const scheduleSlots = [];
        todaySchedule.forEach(block => {
          const [startHour, startMin] = block.start_time.split(':').map(Number);
          const [endHour, endMin] = block.end_time.split(':').map(Number);
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          scheduleSlots.push({ start: startMinutes, end: endMinutes });
        });

        // Fetch all bookings for this resource on this date
        const allBookings = await viewAllBookings();
        console.log(`[SlotBar] Resource: ${resourceName}, Target date: ${bookingDate.toDateString()}`);
        console.log('[SlotBar] All bookings from API:', allBookings);
        
        const resourceBookings = allBookings.filter(b => {
          const matchesResource = b.resource?.name === resourceName;
          const bookingStart = new Date(b.starts_at);
          const bookingStartDate = bookingStart.toDateString();
          const targetDate = bookingDate.toDateString();
          const matchesDate = bookingStartDate === targetDate;
          
          console.log(`[SlotBar] Checking booking ${b.id}:`, {
            resourceName: b.resource?.name,
            matchesResource,
            bookingStartDate,
            targetDate,
            matchesDate,
            starts_at: b.starts_at
          });
          
          return matchesResource && matchesDate && !b.is_canceled;
        });
        console.log('[SlotBar] Filtered resourceBookings:', resourceBookings);

        // Convert bookings to minute ranges with user info (same as dashboard)
        const bookedSlots = resourceBookings.map(b => {
          const startsAt = b.starts_at;
          const endsAt = b.ends_at;
          
          // Extract just the time part (HH:MM:SS) from the ISO string
          const startTimePart = startsAt.split('T')[1].split('+')[0].split('-')[0];
          const endTimePart = endsAt.split('T')[1].split('+')[0].split('-')[0];
          
          const [startHour, startMin] = startTimePart.split(':').map(Number);
          const [endHour, endMin] = endTimePart.split(':').map(Number);
          
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          
          return {
            start: startMinutes,
            end: endMinutes,
            customerId: b.metadata?.customer_id,
            customerName: b.metadata?.customer_name
          };
        });

        // Get slot interval from service (via resource->service API chain)
        let slotInterval = 15; // default
        try {
          // Get service ID for this resource
          const serviceIdRes = await apiRequest('/getServiceIdbyResourceId', {
            method: 'POST',
            body: JSON.stringify({ resource_id: resource.id })
          });
          
          if (typeof serviceIdRes === 'string' && serviceIdRes.trim()) {
            // Get service details
            const serviceRes = await apiRequest(`/getService/${serviceIdRes}`);
            if (serviceRes) {
              // Try different interval fields in service
              const service = serviceRes;
              if (service.bookable_interval) {
                const match = service.bookable_interval.match(/PT(\d+)M/);
                if (match) slotInterval = parseInt(match[1]);
              } else if (service.duration_step) {
                const match = service.duration_step.match(/PT(\d+)M/);
                if (match) slotInterval = parseInt(match[1]);
              }
              console.log('[SlotBar] Service details:', service);
            }
          }
        } catch (e) {
          console.warn('[SlotBar] Could not fetch service interval, using default:', e);
        }
        console.log('[SlotBar] Using slot interval (minutes):', slotInterval);
        console.log('[SlotBar] Final bookedSlots:', bookedSlots);
        console.log('[SlotBar] Final scheduleSlots:', scheduleSlots);

        if (isMounted) {
          setSlotData({ scheduleSlots, bookedSlots, slotInterval });
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching slot data:', error);
        if (isMounted) setLoading(false);
      }
    };

    fetchSlotData();

    return () => {
      isMounted = false;
    };
  }, [resource.name, selectedDate]);

  // Get slot status based on real data (exactly same logic as dashboard)
  const getSlotStatus = (slot) => {
    const slotTime = slot.hour * 60 + slot.minute;
    
    // Check if slot is booked (red)
    for (const bookedSlot of slotData.bookedSlots) {
      if (slotTime >= bookedSlot.start && slotTime < bookedSlot.end) {
        return { status: 'booked', booking: bookedSlot };
      }
    }
    
    // Check if slot is in schedule (green)
    for (const scheduleSlot of slotData.scheduleSlots) {
      if (slotTime >= scheduleSlot.start && slotTime < scheduleSlot.end) {
        return { status: 'available' };
      }
    }
    
    return { status: 'unavailable' };
  };

  // Get tooltip text for hovered slot
  const getTooltipText = (slot) => {
    const slotStatus = getSlotStatus(slot);
    if (slotStatus.status === 'booked') {
      return 'Booked';
    }
    return `${slot.time} - ${slotStatus.status}`;
  };

  // Selection window mins for highlighting
  const selStart = (() => {
    if (!selectedStartTime || !selectedStartTime.includes(':')) return null;
    const [h, m] = selectedStartTime.split(':').map(Number);
    return h*60+m;
  })();
  const selEnd = (() => {
    if (!selectedEndTime || !selectedEndTime.includes(':')) return null;
    const [h, m] = selectedEndTime.split(':').map(Number);
    return h*60+m;
  })();

  const isInSelection = (slot) => {
    if (selStart == null || selEnd == null) return false;
    const t = slot.hour*60+slot.minute;
    return t >= selStart && t < selEnd;
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
          
          {/* Description */}
          <div className="text-sm text-gray-600 mb-2 flex items-start gap-2" style={{ fontFamily: 'Inter' }}>
            <span className="text-gray-400 flex-shrink-0">+</span>
            <span>{resource.amenities}</span>
          </div>

          {/* Enabled Features (from backend) */}
          {featuresText && (
            <div className="text-sm text-gray-700 mb-4 flex items-start gap-2" style={{ fontFamily: 'Inter' }}>
              <span className="text-gray-400 flex-shrink-0">✓</span>
              <span>{featuresText}</span>
            </div>
          )}

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
                {timeSlots.map((slot, index) => {
                  const slotStatus = getSlotStatus(slot);
                  const status = slotStatus.status;
                  const highlight = isInSelection(slot);
                  return (
                    <div
                      key={index}
                      className={`relative h-5 flex-1 rounded-sm cursor-pointer transition-all ${
                        status === 'available' 
                          ? 'hover:opacity-80' 
                          : status === 'booked'
                          ? 'hover:opacity-80'
                          : 'bg-gray-200 hover:bg-gray-300'
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
                {getTooltipText(hoveredSlot)}
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
  const [selectedDate, setSelectedDate] = useState(today.toFormat('yyyy-LL-dd'));
  const [startTime, setStartTime] = useState('15:00');
  const [endTime, setEndTime] = useState('16:00');
  const [resourceFilter, setResourceFilter] = useState('All Resources');
  const [isResourceFilterOpen, setIsResourceFilterOpen] = useState(false);
  const [isOtherFiltersOpen, setIsOtherFiltersOpen] = useState(false);
  
  // Additional filters state
  const [capacityFilter, setCapacityFilter] = useState('Any');
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  
  // Resources state
  const [resources, setResources] = useState([]);
  const [resourceOptions, setResourceOptions] = useState(['All Resources']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Availability checking state
  const [resourceAvailability, setResourceAvailability] = useState({});
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(today.toFormat('MMMM yyyy'));
  const [currentWeekStart, setCurrentWeekStart] = useState(today.startOf('week'));
  const [currentViewDate, setCurrentViewDate] = useState(today);
  const [calendarView, setCalendarView] = useState('Week'); // Month, Week, Day, 30 days
  const [calendarBookings, setCalendarBookings] = useState([]);

  // resourceOptions is populated dynamically from API categories

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
            mongoId: resource.mongo_id || resource.metadata?.mongo_id || null,
            // Pass through full resource data
            ...resource
          };
        });

        setResources(mappedResources);
        // Build resource categories from API data
        const categories = Array.from(new Set(mappedResources.map(r => r.type))).filter(Boolean).sort();
        setResourceOptions(['All Resources', ...categories]);
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

  // Check resource availability when date/time changes
  useEffect(() => {
    const checkAvailability = async () => {
      if (!selectedDate || !startTime || !endTime || resources.length === 0) return;
      
      try {
        // Get all bookings
        const allBookings = await viewAllBookings();
        
        // Parse selected time range
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        const selectedStartMinutes = startHour * 60 + startMin;
        const selectedEndMinutes = endHour * 60 + endMin;
        
        // Get weekday for schedule checking
        const bookingDate = new Date(selectedDate);
        const weekday = bookingDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        // Check each resource
        const availability = {};
        
        for (const resource of resources) {
          // 1. Check if resource has schedule for this weekday
          let hasSchedule = false;
          try {
            const scheduleResponse = await getResourceScheduleInfo(resource.name);
            const scheduleBlocks = Array.isArray(scheduleResponse) 
              ? scheduleResponse 
              : (scheduleResponse?.schedule_blocks || []);
            
            // Check if any schedule block covers the selected time
            hasSchedule = scheduleBlocks.some(block => {
              if ((block.weekday || '').toLowerCase() !== weekday) return false;
              
              const [blockStartH, blockStartM] = block.start_time.split(':').map(Number);
              const [blockEndH, blockEndM] = block.end_time.split(':').map(Number);
              const blockStart = blockStartH * 60 + blockStartM;
              const blockEnd = blockEndH * 60 + blockEndM;
              
              // Check if selected time range is within schedule block
              return selectedStartMinutes >= blockStart && selectedEndMinutes <= blockEnd;
            });
          } catch (e) {
            console.error(`Error checking schedule for ${resource.name}:`, e);
          }
          
          if (!hasSchedule) {
            availability[resource.id] = false;
            continue;
          }
          
          // 2. Check if resource is booked during selected time
          const resourceBookings = allBookings.filter(b => {
            const matchesResource = b.resource?.name === resource.name;
            const bookingStartDate = new Date(b.starts_at).toDateString();
            const targetDate = bookingDate.toDateString();
            return matchesResource && bookingStartDate === targetDate && !b.is_canceled;
          });
          
          // Check for conflicts
          const hasConflict = resourceBookings.some(b => {
            const bookingStart = new Date(b.starts_at);
            const bookingEnd = new Date(b.ends_at);
            
            const bStartH = bookingStart.getHours();
            const bStartM = bookingStart.getMinutes();
            const bEndH = bookingEnd.getHours();
            const bEndM = bookingEnd.getMinutes();
            
            const bookingStartMin = bStartH * 60 + bStartM;
            const bookingEndMin = bEndH * 60 + bEndM;
            
            // Check overlap
            return (selectedStartMinutes < bookingEndMin && selectedEndMinutes > bookingStartMin);
          });
          
          availability[resource.id] = !hasConflict;
        }
        
        setResourceAvailability(availability);
      } catch (error) {
        console.error('Error checking availability:', error);
      }
    };
    
    checkAvailability();
  }, [selectedDate, startTime, endTime, resources]);

  // Load bookings for calendar view
  useEffect(() => {
    const loadCalendarBookings = async () => {
      try {
        const allBookings = await viewAllBookings();
        setCalendarBookings(allBookings);
      } catch (error) {
        console.error('Error loading calendar bookings:', error);
      }
    };
    
    if (view === 'calendar') {
      loadCalendarBookings();
    }
  }, [view, currentViewDate, calendarView]);

  // Generate calendar dates based on view type
  const generateCalendarDates = () => {
    const dates = [];
    
    if (calendarView === 'Week') {
      // Show 7 days starting from current week start (Sunday)
      for (let i = 0; i < 7; i++) {
        const date = currentViewDate.startOf('week').plus({ days: i });
        dates.push({
          day: date.toFormat('EEE'),
          date: date.day,
          fullDate: date.toFormat('yyyy-MM-dd'),
          key: `${date.toFormat('EEE')}-${date.day}`
        });
      }
    } else if (calendarView === 'Month') {
      // Show entire month in grid format
      const startOfMonth = currentViewDate.startOf('month');
      const endOfMonth = currentViewDate.endOf('month');
      const startDate = startOfMonth.startOf('week'); // Start from Sunday
      const endDate = endOfMonth.endOf('week'); // End on Saturday
      
      let currentDate = startDate;
      while (currentDate <= endDate) {
        dates.push({
          day: currentDate.toFormat('EEE'),
          date: currentDate.day,
          fullDate: currentDate.toFormat('yyyy-MM-dd'),
          key: `${currentDate.toFormat('EEE')}-${currentDate.day}`,
          isCurrentMonth: currentDate.month === currentViewDate.month
        });
        currentDate = currentDate.plus({ days: 1 });
      }
    } else if (calendarView === 'Day') {
      // Show single day
      const date = currentViewDate;
      dates.push({
        day: date.toFormat('EEEE'),
        date: date.day,
        fullDate: date.toFormat('yyyy-MM-dd'),
        key: `${date.toFormat('EEE')}-${date.day}`
      });
    } else if (calendarView === '30 days') {
      // Show 30 days starting from current date
      for (let i = 0; i < 30; i++) {
        const date = currentViewDate.plus({ days: i });
        dates.push({
          day: date.toFormat('EEE'),
          date: date.day,
          fullDate: date.toFormat('yyyy-MM-dd'),
          key: `${date.toFormat('EEE')}-${date.day}-${date.month}`
        });
      }
    }
    
    return dates;
  };
  
  // Navigation handlers
  const goToToday = () => {
    const now = DateTime.now();
    setCurrentViewDate(now);
    setCurrentWeekStart(now.startOf('week'));
    setCurrentMonth(now.toFormat('MMMM yyyy'));
  };
  
  const goToPrevious = () => {
    let newDate;
    if (calendarView === 'Week') {
      newDate = currentViewDate.minus({ weeks: 1 });
    } else if (calendarView === 'Month') {
      newDate = currentViewDate.minus({ months: 1 });
    } else if (calendarView === 'Day') {
      newDate = currentViewDate.minus({ days: 1 });
    } else if (calendarView === '30 days') {
      newDate = currentViewDate.minus({ days: 30 });
    }
    setCurrentViewDate(newDate);
    setCurrentWeekStart(newDate.startOf('week'));
    setCurrentMonth(newDate.toFormat('MMMM yyyy'));
  };
  
  const goToNext = () => {
    let newDate;
    if (calendarView === 'Week') {
      newDate = currentViewDate.plus({ weeks: 1 });
    } else if (calendarView === 'Month') {
      newDate = currentViewDate.plus({ months: 1 });
    } else if (calendarView === 'Day') {
      newDate = currentViewDate.plus({ days: 1 });
    } else if (calendarView === '30 days') {
      newDate = currentViewDate.plus({ days: 30 });
    }
    setCurrentViewDate(newDate);
    setCurrentWeekStart(newDate.startOf('week'));
    setCurrentMonth(newDate.toFormat('MMMM yyyy'));
  };

  // Group bookings by date
  const getBookingsForDate = (dateString) => {
    return calendarBookings
      .filter(booking => {
        if (!booking.starts_at || booking.is_canceled) return false;
        const bookingDate = new Date(booking.starts_at).toISOString().split('T')[0];
        return bookingDate === dateString;
      })
      .map(booking => {
        const startTime = new Date(booking.starts_at);
        const hours = startTime.getHours();
        const minutes = startTime.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';
        const displayHours = hours % 12 || 12;
        const timeStr = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        
        return {
          name: booking.resource?.name || 'Resource',
          time: timeStr,
          id: booking.id,
          customerName: booking.metadata?.customer_name || 'Guest'
        };
      });
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dates = generateCalendarDates();

  const handleBookResource = (resource) => {
    navigate(`/book-resource/${resource.id}`, { 
      state: { 
        resource: {
          ...resource,
          date: selectedDate,
          startTime,
          endTime
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
            {/* Resource Filter Dropdown - Only in Grid View */}
            {view === 'grid' && (
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
            )}
            
            {/* Spacer for calendar view */}
            {view === 'calendar' && <div></div>}

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
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-44 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      style={{ fontFamily: 'Inter' }}
                    />
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
                        type="time"
                        step="900"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-36 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        style={{ fontFamily: 'Inter' }}
                      />
                    </div>
                    
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    
                    <div className="relative">
                      <input
                        type="time"
                        step="900"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-36 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        style={{ fontFamily: 'Inter' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Other Filters Button */}
              <div className="relative">
                <button
                  onClick={() => setIsOtherFiltersOpen(!isOtherFiltersOpen)}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  style={{ fontFamily: 'Inter' }}
                >
                  <span>Other filters</span>
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
                
                {/* Other Filters Dropdown */}
                {isOtherFiltersOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-4">
                      {/* Capacity Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                          Capacity
                        </label>
                        <select
                          value={capacityFilter}
                          onChange={(e) => setCapacityFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          style={{ fontFamily: 'Inter' }}
                        >
                          <option value="Any">Any capacity</option>
                          <option value="1-5">1-5 people</option>
                          <option value="6-10">6-10 people</option>
                          <option value="11-15">11-15 people</option>
                          <option value="16-20">16-20 people</option>
                          <option value="20+">20+ people</option>
                        </select>
                      </div>
                      
                      {/* Features Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                          Features {selectedFeatures.length > 0 && `(${selectedFeatures.length} selected)`}
                        </label>
                        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-white space-y-2">
                          {['Projector', 'Whiteboard', 'Video Conference', 'WiFi', 'Air Conditioning', 'Coffee Machine', 'TV Screen', 'Microphone', 'Sound System', 'Parking'].map((feature) => (
                            <label key={feature} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={selectedFeatures.includes(feature)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedFeatures([...selectedFeatures, feature]);
                                  } else {
                                    setSelectedFeatures(selectedFeatures.filter(f => f !== feature));
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700" style={{ fontFamily: 'Inter' }}>{feature}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      {/* Filter Actions */}
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => {
                            setCapacityFilter('Any');
                            setSelectedFeatures([]);
                          }}
                          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                          style={{ fontFamily: 'Inter' }}
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => setIsOtherFiltersOpen(false)}
                          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                          style={{ fontFamily: 'Inter' }}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
              <div className="flex items-center gap-2">
                <button 
                  onClick={goToPrevious}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <span className="text-lg font-semibold text-gray-900 min-w-[150px] text-center" style={{ fontFamily: 'Inter' }}>
                  {currentViewDate.toFormat('MMMM yyyy')}
                </span>
                <button 
                  onClick={goToNext}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
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
              resources
                .filter(r => {
                  // Filter by resource type/category
                  if (resourceFilter !== 'All Resources' && r.type !== resourceFilter) {
                    return false;
                  }
                  
                  // Filter by availability (date/time)
                  if (resourceAvailability[r.id] === false) {
                    return false;
                  }
                  
                  // Filter by capacity
                  if (capacityFilter !== 'Any') {
                    const capacity = r.capacity || 0;
                    if (capacityFilter === '1-5' && (capacity < 1 || capacity > 5)) return false;
                    if (capacityFilter === '6-10' && (capacity < 6 || capacity > 10)) return false;
                    if (capacityFilter === '11-15' && (capacity < 11 || capacity > 15)) return false;
                    if (capacityFilter === '16-20' && (capacity < 16 || capacity > 20)) return false;
                    if (capacityFilter === '20+' && capacity < 20) return false;
                  }
                  
                  // Filter by features (if any selected)
                  if (selectedFeatures.length > 0) {
                    // Check if resource has ALL the selected features
                    // This is placeholder logic - in real implementation, check resource metadata for features
                    // For now, we show all resources (backend needs to provide feature data in resource metadata)
                    // TODO: When backend provides feature data, check:
                    // const hasAllFeatures = selectedFeatures.every(feature => 
                    //   r.metadata?.features?.includes(feature)
                    // );
                    // if (!hasAllFeatures) return false;
                  }
                  
                  return true;
                })
                .map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    selectedDate={selectedDate}
                    selectedStartTime={startTime}
                    selectedEndTime={endTime}
                    onBook={handleBookResource}
                  />
                ))
            )}
          </div>
        )}

        {/* Calendar View */}
        {view === 'calendar' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Calendar Header - Only show for Week and Month views */}
            {(calendarView === 'Week' || calendarView === 'Month') && (
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
            )}

            {/* Calendar Grid - Week and Month views */}
            {(calendarView === 'Week' || calendarView === 'Month') && (
              <div className={`grid ${
                calendarView === 'Week' ? 'grid-cols-7' : 
                `grid-cols-7 gap-0`
              }`}>
                {dates.map((dateInfo) => (
                  <div
                    key={dateInfo.key}
                    className={`border-r border-b border-gray-200 last:border-r-0 min-h-[150px] p-2 ${
                      dateInfo.isCurrentMonth === false ? 'bg-gray-100/50' : 'bg-gray-50/50'
                    }`}
                    style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(229, 231, 235, 0.3) 1px, rgba(229, 231, 235, 0.3) 2px)'
                    }}
                  >
                    <div className={`text-sm font-medium mb-2 ${
                      dateInfo.isCurrentMonth === false ? 'text-gray-400' : 'text-gray-500'
                    }`} style={{ fontFamily: 'Inter' }}>
                      {dateInfo.date}
                    </div>
                    <div className="space-y-1">
                      {getBookingsForDate(dateInfo.fullDate)?.map((event, idx) => (
                        <CalendarEvent
                          key={event.id || idx}
                          event={event}
                          onClick={() => {}}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Day View - Single day with detailed bookings */}
            {calendarView === 'Day' && dates.length > 0 && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'Inter' }}>
                    {dates[0].day}
                  </h3>
                  <p className="text-lg text-gray-600" style={{ fontFamily: 'Inter' }}>
                    {currentViewDate.toFormat('MMMM d, yyyy')}
                  </p>
                </div>
                <div className="max-w-2xl mx-auto space-y-2">
                  {getBookingsForDate(dates[0].fullDate).length > 0 ? (
                    getBookingsForDate(dates[0].fullDate).map((event, idx) => (
                      <div
                        key={event.id || idx}
                        className="bg-blue-50 border-l-4 border-blue-600 px-4 py-3 rounded hover:bg-blue-100 transition-colors cursor-pointer"
                        style={{ fontFamily: 'Inter' }}
                      >
                        <div className="flex justify-between items-center">
                          <div className="font-semibold text-gray-900">{event.name}</div>
                          <div className="text-gray-600">{event.time}</div>
                        </div>
                        {event.customerName && (
                          <div className="text-sm text-gray-600 mt-1">Booked by: {event.customerName}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500" style={{ fontFamily: 'Inter' }}>
                      No bookings for this day
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 30 Days View - Scrollable list */}
            {calendarView === '30 days' && (
              <div className="max-h-[600px] overflow-y-auto">
                {dates.map((dateInfo) => {
                  const bookingsForDay = getBookingsForDate(dateInfo.fullDate);
                  return (
                    <div
                      key={dateInfo.key}
                      className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 text-center">
                          <div className="text-sm font-medium text-gray-600" style={{ fontFamily: 'Inter' }}>
                            {dateInfo.day}
                          </div>
                          <div className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Inter' }}>
                            {dateInfo.date}
                          </div>
                        </div>
                        <div className="flex-1 space-y-1">
                          {bookingsForDay.length > 0 ? (
                            bookingsForDay.map((event, idx) => (
                              <div
                                key={event.id || idx}
                                className="bg-blue-50 border-l-2 border-blue-600 px-3 py-2 rounded text-sm"
                                style={{ fontFamily: 'Inter' }}
                              >
                                <div className="flex justify-between">
                                  <span className="font-medium text-gray-900">{event.name}</span>
                                  <span className="text-gray-600">{event.time}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-gray-400" style={{ fontFamily: 'Inter' }}>
                              No bookings
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}