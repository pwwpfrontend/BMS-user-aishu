import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Calendar1, CalendarCheck, Plus } from 'lucide-react';

// Booking Card Component for Activity Page
const ActivityBookingCard = ({ booking, onClick }) => {
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

  // Determine booking status
  const getBookingStatus = () => {
    const now = new Date();
    const bookingDate = new Date(booking.fullDate);
    
    if (bookingDate < now) {
      return { label: 'Completed', color: 'bg-green-100 text-green-700 border-green-200' };
    } else if (bookingDate.toDateString() === now.toDateString()) {
      return { label: 'Ongoing', color: 'bg-purple-100 text-purple-700 border-purple-200' };
    } else {
      return { label: 'Upcoming', color: 'bg-orange-100 text-orange-700 border-orange-200' };
    }
  };

  const status = getBookingStatus();

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'Inter' }}>
              {booking.name}
            </h3>
            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${status.color}`} style={{ fontFamily: 'Inter' }}>
              {status.label}
            </span>
          </div>
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

export default function Activity() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Bookings');
  const [startDate, setStartDate] = useState('11/10/2025');
  const [endDate, setEndDate] = useState('20/10/2025');
  const [statusFilter, setStatusFilter] = useState('Completed');
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  
  const statusOptions = [ 'Completed', 'Upcoming', 'Ongoing'];
  
  // Sample bookings data - set to empty array to show empty state
  const [bookings, setBookings] = useState([
    {
      id: 1,
      name: '1B Co-Working Space',
      location: 'CUHK InnoPort',
      date: 'Thu, 6 Mar 2025',
      fullDate: '2025-03-06',
      time: '9:00 AM - 11:00 AM',
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
      date: 'Fri, 7 Mar 2025',
      fullDate: '2025-03-07',
      time: '2:00 PM - 5:00 PM',
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
      name: 'Conference Room A',
      location: 'CUHK InnoPort',
      date: 'Mon, 10 Mar 2025',
      fullDate: '2025-03-10',
      time: '10:00 AM - 12:00 PM',
      image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&h=300&fit=crop',
      availableSlots: [
        { start: 10 * 60, end: 11.5 * 60 }, // 10:00 - 11:30
        { start: 18.5 * 60, end: 21.5 * 60 }, // 18:30 - 21:30
      ],
      bookedSlots: [
        { start: 14 * 60, end: 16 * 60 }, // 14:00 - 16:00
      ]
    }
  ]);

  // Filter bookings based on date range and status
  const filteredBookings = bookings.filter((booking) => {
    // Parse booking date
    const bookingDate = new Date(booking.fullDate);
    const start = startDate ? new Date(startDate.split('/').reverse().join('-')) : null;
    const end = endDate ? new Date(endDate.split('/').reverse().join('-')) : null;
    
    // Date range filter
    if (start && bookingDate < start) return false;
    if (end && bookingDate > end) return false;
    
    // Status filter
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time to compare dates only
    bookingDate.setHours(0, 0, 0, 0);
    
    let bookingStatus = '';
    
    if (bookingDate < now) {
      bookingStatus = 'Completed';
    } else if (bookingDate.getTime() === now.getTime()) {
      bookingStatus = 'Ongoing';
    } else {
      bookingStatus = 'Upcoming';
    }
    
    // Match status filter (Available means show all)
    if (statusFilter !== 'Available' && bookingStatus !== statusFilter) {
      return false;
    }
    
    return true;
  });


  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Inter' }}>
            My Activity
          </h1>
          <p className="text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>
            This page provides a comprehensive and intuitive overview of your engagement.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <button
            onClick={() => setActiveTab('Bookings')}
            className={`px-6 py-2.5 font-medium text-sm rounded-lg transition-colors ${
              activeTab === 'Bookings'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
            style={{ fontFamily: 'Inter' }}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Bookings</span>
            </div>
          </button>
        </div>

        {/* Filters Section */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {/* Date Filters */}
            <div className="flex items-center gap-4">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                  Start Date
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-48 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    style={{ fontFamily: 'Inter' }}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                  End Date
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-48 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    style={{ fontFamily: 'Inter' }}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors min-w-[140px] justify-between"
                style={{ fontFamily: 'Inter' }}
              >
                <span>{statusFilter}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isStatusFilterOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {statusOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setStatusFilter(option);
                        setIsStatusFilterOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                        statusFilter === option ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-700'
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
        </div>

        {/* Content Area */}
        {filteredBookings.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-xl border border-gray-200 p-16">
            <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
              {/* Calendar Check Icon */}
              <div className="mb-6">
               <CalendarCheck className="w-12 h-12 text-gray-400" />
              </div>

              {/* Text */}
              <h2 className="text-xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Inter' }}>
                You've got no bookings.
              </h2>
              <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'Inter' }}>
                You can make a booking by checking available resources.
              </p>
              <p className="text-sm text-gray-600 mb-6" style={{ fontFamily: 'Inter' }}>
                Please create a booking
              </p>

              {/* Create Booking Button */}
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                style={{ fontFamily: 'Inter' }}
              >
                <Plus className="w-4 h-4" />
                Create booking
              </button>
            </div>
          </div>
        ) : (
          /* Bookings Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredBookings.map((booking) => (
              <ActivityBookingCard
                key={booking.id}
                booking={booking}
                onClick={() => navigate(`/booking/${booking.id}`, { state: { booking } })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}