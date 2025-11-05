import React, { useState, useEffect } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DateTime } from 'luxon';

// Inlined booking/time utilities (from src/utils)
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
async function viewAllBookings() {
  const response = await apiRequest('/viewAllBookings');
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
function isoToZonedDate(isoString, timezone = null) {
  const dt = DateTime.fromISO(isoString);
  return timezone ? dt.setZone(timezone) : dt;
}
function formatTime(isoString, timezone = 'UTC', format = 'hh:mm a') {
  const dt = isoToZonedDate(isoString, timezone);
  return dt.toFormat(format);
}
function formatDate(isoString, timezone = 'UTC', format = 'EEE, d MMM yyyy') {
  const dt = isoToZonedDate(isoString, timezone);
  return dt.toFormat(format);
}

// Booking Card Component with Interactive Time Slots
const BookingCard = ({ booking, onClick, currentUserEmail }) => {
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [slotData, setSlotData] = useState({ scheduleSlots: [], bookedSlots: [], slotInterval: 15 });
  const [loading, setLoading] = useState(true);

  // Generate time slots from 08:00 to 23:00 based on duration_step
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

  // Fetch schedule and bookings for this resource
  useEffect(() => {
    let isMounted = true;

    const fetchSlotData = async () => {
      try {
        // Get resource name and booking date
        const resourceName = booking.name;
        const bookingDate = new Date(booking.rawStartsAt || new Date());
        const weekday = bookingDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

        // Fetch schedule blocks for this resource
        const scheduleResponse = await getResourceScheduleInfo(resourceName);
        const allScheduleBlocks = scheduleResponse?.schedule_blocks || [];
        
        // Filter for the current weekday
        const todaySchedule = allScheduleBlocks.filter(block => 
          block.weekday.toLowerCase() === weekday
        );

        // Convert schedule blocks to minute ranges
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
          
          return matchesResource && matchesDate;
        });
        console.log('[SlotBar] Filtered resourceBookings:', resourceBookings);

        // Convert bookings to minute ranges with user info
        const bookedSlots = resourceBookings.map(b => {
          // Parse the ISO string to get the time in the booking's timezone
          // Format: "2025-11-04T10:30:00+08:00"
          const startsAt = b.starts_at; // e.g., "2025-11-04T10:30:00+08:00"
          const endsAt = b.ends_at;
          
          // Extract just the time part (HH:MM:SS) from the ISO string
          // This preserves the original timezone time
          const startTimePart = startsAt.split('T')[1].split('+')[0].split('-')[0]; // "10:30:00"
          const endTimePart = endsAt.split('T')[1].split('+')[0].split('-')[0];
          
          const [startHour, startMin] = startTimePart.split(':').map(Number);
          const [endHour, endMin] = endTimePart.split(':').map(Number);
          
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          
          const slotInfo = {
            start: startMinutes,
            end: endMinutes,
            customerId: b.metadata?.customer_id,
            customerName: b.metadata?.customer_name,
            isCurrentUser: b.metadata?.customer_id === currentUserEmail
          };
          
          console.log(`[SlotBar] Converted booking to slot:`, {
            bookingId: b.id,
            starts_at: b.starts_at,
            ends_at: b.ends_at,
            startTimePart,
            endTimePart,
            startMinutes,
            endMinutes,
            timeRange: `${Math.floor(startMinutes/60)}:${(startMinutes%60).toString().padStart(2,'0')} - ${Math.floor(endMinutes/60)}:${(endMinutes%60).toString().padStart(2,'0')}`
          });
          
          return slotInfo;
        });
        
        console.log('[SlotBar] Final bookedSlots:', bookedSlots);
        console.log('[SlotBar] Final scheduleSlots:', scheduleSlots);

        // Get slot interval from service duration_step (default 15 minutes)
        let slotInterval = 15; // default
        if (resourceBookings.length > 0 && resourceBookings[0].service?.duration_step) {
          const durationStep = resourceBookings[0].service.duration_step;
          // Parse PT15M to 15 minutes
          const match = durationStep.match(/PT(\d+)M/);
          if (match) {
            slotInterval = parseInt(match[1]);
          }
        }
        console.log('[SlotBar] Using slot interval (minutes):', slotInterval);

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
  }, [booking.name, booking.rawStartsAt, currentUserEmail]);

  // Get slot status based on real data
  const getSlotStatus = (slot) => {
    const slotTime = slot.hour * 60 + slot.minute;
    
    // Check if slot is booked
    for (const bookedSlot of slotData.bookedSlots) {
      if (slotTime >= bookedSlot.start && slotTime < bookedSlot.end) {
        return { status: 'booked', booking: bookedSlot };
      }
    }
    
    // Check if slot is in schedule (available)
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
      return slotStatus.booking?.isCurrentUser ? 'Your booking' : 'Booked';
    }
    return `${slot.time} - ${slotStatus.status}`;
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-1" style={{ fontFamily: 'Inter' }}>
            {booking.name}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span style={{ fontFamily: 'Inter' }}>{booking.location}</span>
          </div>
          <div>
            <p className="text-sm text-gray-700 mb-0.5" style={{ fontFamily: 'Inter' }}>
              {booking.date}
            </p>
            <p className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Inter' }}>
              {booking.time}
            </p>
          </div>
        </div>
        <div className="ml-4">
          <img 
            src={booking.image} 
            alt={booking.name}
            className="w-36 h-24 object-cover rounded-lg"
          />
        </div>
      </div>

      {/* Interactive Time Slots */}
      <div className="relative">
        {loading ? (
          <div className="text-xs text-gray-400 mb-2" style={{ fontFamily: 'Inter' }}>
            Loading schedule...
          </div>
        ) : (
          <div className="flex items-center gap-0.5 mb-2">
            {timeSlots.map((slot, index) => {
              const slotStatus = getSlotStatus(slot);
              const status = slotStatus.status;
              return (
                <div
                  key={index}
                  className={`h-5 flex-1 rounded-sm cursor-pointer transition-all ${
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
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-md whitespace-nowrap" style={{ fontFamily: 'Inter' }}>
            {getTooltipText(hoveredSlot)}
          </div>
        )}
      </div>
    </div>
  );
};

export default function Dashboard({ view = 'individual' }) {
  const [user, setUser] = useState({ username: 'Loading...' });
  const [timeFilter, setTimeFilter] = useState('This Week');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [bookings, setBookings] = useState([]); // mapped for display
  const [allUserBookings, setAllUserBookings] = useState([]); // raw API objects for current user
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const timeFilterOptions = ['Today', 'This Week', 'This Month'];

  // Auth0 Management API configuration
  const config = {
    domain: "bms-optimus.us.auth0.com",
    clientId: "x3UIh4PsAjdW1Y0uTmjDUk5VIA36iQ12",
    clientSecret: "xYfZ6lk_kJoLy73sgh3jAY_4U4bMnwm58EjN97Ozw-JcsQTs36JpA2UM4C2xVn-r",
    audience: "https://bms-optimus.us.auth0.com/api/v2/",
  };

  // Fetch Management API access token
  const getManagementAccessToken = async () => {
    try {
      const response = await fetch(`https://${config.domain}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          audience: config.audience,
          grant_type: "client_credentials",
          scope: "read:users read:users_app_metadata update:users_app_metadata read:user_idp_tokens",
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get management token');
      }
      
      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error("Error getting management token:", error);
      return null;
    }
  };

  // Load user from session and optionally fetch from Auth0 (non-blocking)
  useEffect(() => {
    let isMounted = true;

    const fetchCurrentUser = async () => {
      try {
        // Get stored user info
        const storedUser = JSON.parse(sessionStorage.getItem("user"));
        
        if (!storedUser || !storedUser.email) {
          console.error("No user found in session");
          return;
        }

        // Use stored data immediately
        if (isMounted && storedUser.username) {
          setUser(storedUser);
        }

        // Try to fetch updated user data from Auth0 (optional - don't block if it fails)
        try {
          const token = await getManagementAccessToken();
          
          if (token) {
            const response = await fetch(`${config.audience}users`, {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
            });

            if (!isMounted) return;

            if (response.ok) {
              const allUsers = await response.json();
              const auth0User = allUsers.find((u) => u.email === storedUser.email);

              if (auth0User) {
                const userData = {
                  username: auth0User.user_metadata?.username || 
                            auth0User.username || 
                            auth0User.email.split("@")[0],
                  email: auth0User.email,
                  role: auth0User.app_metadata?.role || "User",
                };

                if (isMounted) {
                  setUser(userData);
                  sessionStorage.setItem("user", JSON.stringify(userData));
                }
              }
            }
          }
        } catch (auth0Error) {
          // Auth0 fetch failed - that's OK, we already have user from sessionStorage
          console.warn("Could not fetch updated user from Auth0, using cached data:", auth0Error);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };

    fetchCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch bookings for current user (all, not just upcoming)
  useEffect(() => {
    let isMounted = true;

    const fetchBookings = async () => {
      try {
        const storedUser = JSON.parse(sessionStorage.getItem("user"));
        if (!storedUser || !storedUser.email) {
          console.error("No user email found in sessionStorage");
          setLoading(false);
          return;
        }

        const all = await viewAllBookings();
        const mine = (all || []).filter(b => b.metadata?.customer_id === storedUser.email && !b.is_canceled);
        if (!isMounted) return;
        setAllUserBookings(mine);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        if (isMounted) setLoading(false);
      }
    };

    fetchBookings();
    return () => { isMounted = false; };
  }, []);

  // Apply time filter and map for display whenever data or filter changes
  useEffect(() => {
    const filtered = (allUserBookings || []).filter(b => {
      const tz = b.location?.time_zone || 'Asia/Hong_Kong';
      const start = DateTime.fromISO(b.starts_at).setZone(tz);
      const now = DateTime.now().setZone(tz);
      if (timeFilter === 'Today') {
        return start.hasSame(now, 'day');
      } else if (timeFilter === 'This Week') {
        const startOfWeek = now.startOf('week');
        const endOfWeek = now.endOf('week');
        return start >= startOfWeek && start <= endOfWeek;
      } else if (timeFilter === 'This Month') {
        return start.hasSame(now, 'month');
      }
      return true;
    });

    const mapped = filtered
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
      .map(booking => {
        const timezone = booking.location?.time_zone || 'Asia/Hong_Kong';
        return {
          id: booking.id,
          name: booking.resource?.name || 'Unknown Resource',
          location: booking.location?.name || 'Unknown Location',
          date: formatDate(booking.starts_at, timezone, 'EEE, d MMM yyyy'),
          time: `${formatTime(booking.starts_at, timezone, 'h:mm a')} - ${formatTime(booking.ends_at, timezone, 'h:mm a')}`,
          image: booking.resource?.metadata?.photo_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
          rawStartsAt: booking.starts_at,
          raw: booking,
        };
      });

    setBookings(mapped);
  }, [allUserBookings, timeFilter]);


  return (
    <div className="p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Greeting Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-1" style={{ fontFamily: 'Inter' }}>
            Hello, {user.username}
          </h1>
          <p className="text-sm text-gray-500" style={{ fontFamily: 'Inter' }}>
            Insights for you today
          </p>
        </div>

        {/* Recent Bookings Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'Inter' }}>
              My Bookings
            </h2>
            
            {/* Time Filter Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors" 
                style={{ fontFamily: 'Inter' }}
              >
                {timeFilter}
                <ChevronDown className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {timeFilterOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setTimeFilter(option);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        timeFilter === option ? 'text-blue-600 font-medium' : 'text-gray-700'
                      }`}
                      style={{ fontFamily: 'Inter' }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Gray divider line */}
          <div className="h-px bg-gray-200 mb-6"></div>

          {/* Booking Cards Grid */}
          {loading ? (
            <div className="text-center py-8 text-gray-500" style={{ fontFamily: 'Inter' }}>
              Loading bookings...
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500" style={{ fontFamily: 'Inter' }}>
              No bookings for this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {bookings.map((booking) => (
                <BookingCard 
                  key={booking.id} 
                  booking={booking}
                  currentUserEmail={user.email}
                  onClick={() => navigate(`/booking/${booking.id}`, { state: { booking: booking.raw } })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Current Plan Section */}
        <div className="mb-8">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'Inter' }}>
              Current Plan
            </h2>
          </div>

          {/* Gray divider line */}
          <div className="h-px bg-gray-200 mb-6"></div>

          <div className="flex items-start justify-between gap-6">
            {/* Plan Card - Clickable */}
            <button
              onClick={() => navigate('/plans')}
              className="bg-white rounded-xl border-2 border-blue-500 p-6 flex-1 max-w-md hover:shadow-md transition-all text-left"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-blue-600 mb-2" style={{ fontFamily: 'Inter' }}>
                    InnoPeers
                  </h3>
                  <p className="text-sm text-gray-700" style={{ fontFamily: 'Inter' }}>
                    Mon - Sun / 9am - 11pm
                  </p>
                  <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Inter' }}>
                    UGB
                  </p>
                </div>
                <ExternalLink className="w-5 h-5 text-blue-600 flex-shrink-0" />
              </div>
            </button>

            {/* Join Plans Button */}
            <button 
              onClick={() => navigate('/plans')}
              className="px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap" 
              style={{ fontFamily: 'Inter' }}
            >
              Join Plans
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}