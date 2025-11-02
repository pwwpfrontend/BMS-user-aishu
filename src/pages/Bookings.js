import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Grid3x3, ChevronLeft, ChevronRight, ChevronDown, SlidersHorizontal } from 'lucide-react';

// Resource Card Component for Grid View
const ResourceCard = ({ resource, onBook }) => {
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

  // Get slot status based on resource data
  const getSlotStatus = (slot) => {
    const slotTime = slot.hour * 60 + slot.minute;
    
    // Check if slot is in booked ranges
    for (const range of resource.bookedSlots) {
      if (slotTime >= range.start && slotTime < range.end) {
        return 'booked';
      }
    }
    
    // Check if slot is in available ranges
    for (const range of resource.availableSlots) {
      if (slotTime >= range.start && slotTime < range.end) {
        return 'available';
      }
    }
    
    return 'unavailable';
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
            <div className="flex items-center gap-0.5 mb-2">
              {timeSlots.map((slot, index) => {
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
  const [selectedDate, setSelectedDate] = useState('21/10/2025');
  const [startTime, setStartTime] = useState('3:00 PM');
  const [endTime, setEndTime] = useState('4:00 PM');
  const [resourceFilter, setResourceFilter] = useState('All Resources');
  const [isResourceFilterOpen, setIsResourceFilterOpen] = useState(false);
  const [isOtherFiltersOpen, setIsOtherFiltersOpen] = useState(false);
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState('October 2025');
  const [calendarView, setCalendarView] = useState('Month'); // Month, Week, Day, 30 days

  const resourceOptions = ['All Resources', 'Meeting Rooms', 'Event Halls', 'Co-Working Spaces'];

  // Sample resources data
  const resources = [
    {
      id: 1,
      name: '2A Meeting Room - Large',
      capacity: 8,
      pricing: 'Free of Charge',
      type: 'Meeting Room',
      note: '',
      amenities: 'Air conditioning, Internet, CCTV',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop',
      availableSlots: [
        { start: 8 * 60, end: 12 * 60 }, // 8:00 - 12:00
        { start: 18 * 60, end: 20 * 60 }, // 18:00 - 20:00
      ],
      bookedSlots: [
        { start: 14 * 60, end: 16 * 60 }, // 14:00 - 16:00
      ]
    },
    {
      id: 2,
      name: '3A Meeting Room',
      capacity: 1,
      pricing: 'Free of Charge',
      type: 'Meeting Room',
      note: '',
      amenities: 'Air conditioning, Internet, CCTV',
      image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&h=300&fit=crop',
      availableSlots: [
        { start: 8 * 60, end: 12 * 60 },
        { start: 18 * 60, end: 22 * 60 },
      ],
      bookedSlots: [
        { start: 14 * 60, end: 16 * 60 },
      ]
    },
    {
      id: 3,
      name: 'UGA Event hall',
      capacity: 1,
      pricing: 'Event Hall',
      type: 'Event Hall',
      note: 'The booking hour must be ≥ 2-hour',
      amenities: 'Air conditioning, Projector, Internet, Whiteboard, Large display, Security lock, Soundproof',
      image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&h=300&fit=crop',
      availableSlots: [
        { start: 8 * 60, end: 13 * 60 },
        { start: 18 * 60, end: 21 * 60 },
      ],
      bookedSlots: [
        { start: 14 * 60, end: 17 * 60 },
      ]
    },
    {
      id: 4,
      name: '1B Meeting Room',
      capacity: 1,
      pricing: 'Meeting Room',
      type: 'Meeting Room',
      note: '',
      amenities: 'Air conditioning, Projector, Internet, Conference phone, Standard phone, Whiteboard',
      image: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=400&h=300&fit=crop',
      availableSlots: [
        { start: 8 * 60, end: 14 * 60 },
        { start: 18 * 60, end: 22 * 60 },
      ],
      bookedSlots: [
        { start: 14.5 * 60, end: 17 * 60 },
      ]
    }
  ];

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
            {resources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onBook={handleBookResource}
              />
            ))}
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