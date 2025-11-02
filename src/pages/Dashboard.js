import React, { useState, useEffect } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Booking Card Component with Interactive Time Slots
const BookingCard = ({ booking, onClick }) => {
  const [hoveredSlot, setHoveredSlot] = useState(null);

  // Generate time slots from 08:00 to 23:00 (every 30 minutes)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 23; hour++) {
      slots.push({ time: `${hour.toString().padStart(2, '0')}:00`, hour, minute: 0 });
      slots.push({ time: `${hour.toString().padStart(2, '0')}:30`, hour, minute: 30 });
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Get slot status based on booking data
  const getSlotStatus = (slot) => {
    const slotTime = slot.hour * 60 + slot.minute;
    
    // Check if slot is in booked ranges
    for (const range of booking.bookedSlots) {
      if (slotTime >= range.start && slotTime < range.end) {
        return 'booked';
      }
    }
    
    // Check if slot is in available ranges
    for (const range of booking.availableSlots) {
      if (slotTime >= range.start && slotTime < range.end) {
        return 'available';
      }
    }
    
    return 'unavailable';
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
        <div className="flex items-center gap-0.5 mb-2">
          {timeSlots.map((slot, index) => {
            const status = getSlotStatus(slot);
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
                title={`${slot.time} - ${status}`}
              />
            );
          })}
        </div>

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
            {hoveredSlot.time} - {getSlotStatus(hoveredSlot)}
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

  // Load user from session and fetch from Auth0
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

        // Get management API token
        const token = await getManagementAccessToken();
        
        if (!token) {
          console.error("Failed to get management token");
          return;
        }

        // Fetch all users and find current user
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
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sample booking data with time slots
  const bookings = [
    {
      id: 1,
      name: '1B Co-Working Space',
      location: 'CUHK InnoPort',
      date: 'Thu, 6 Mar 2025',
      time: '9:00 AM - 11 AM',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
      availableSlots: [
        { start: 9 * 60, end: 11 * 60 }, // 9:00 - 11:00
        { start: 18 * 60, end: 20.5 * 60 }, // 18:00 - 20:30
      ],
      bookedSlots: [
        { start: 14 * 60, end: 16.5 * 60 }, // 14:00 - 16:30
      ]
    },
    {
      id: 2,
      name: '2B Event Hall',
      location: 'CUHK InnoPort',
      date: 'Thu, 6 Mar 2025',
      time: '9:00 AM - 11 AM',
      image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&h=300&fit=crop',
      availableSlots: [
        { start: 9 * 60, end: 10.5 * 60 }, // 9:00 - 10:30
        { start: 18 * 60, end: 21 * 60 }, // 18:00 - 21:00
      ],
      bookedSlots: [
        { start: 14 * 60, end: 17 * 60 }, // 14:00 - 17:00
      ]
    },
    {
      id: 3,
      name: '2B Event Hall',
      location: 'CUHK InnoPort',
      date: 'Thu, 6 Mar 2025',
      time: '9:00 AM - 11 AM',
      image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&h=300&fit=crop',
      availableSlots: [
        { start: 10 * 60, end: 11.5 * 60 }, // 10:00 - 11:30
        { start: 18.5 * 60, end: 21.5 * 60 }, // 18:30 - 21:30
      ],
      bookedSlots: [
        { start: 14 * 60, end: 16 * 60 }, // 14:00 - 16:00
      ]
    }
  ];

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
              Recent Bookings
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {bookings.map((booking) => (
              <BookingCard 
                key={booking.id} 
                booking={booking}
                onClick={() => navigate(`/booking/${booking.id}`, { state: { booking } })}
              />
            ))}
          </div>
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