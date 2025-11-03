import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronUp, Users, Clock } from 'lucide-react';
import { viewBooking, updateBooking, deleteBooking } from '../utils/bookingApi';
import { formatDate, formatTime } from '../utils/time';

// Custom Time Picker Component
const TimePicker = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hour, minute] = value.split(':').map(Number);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  const handleTimeSelect = (newHour, newMinute) => {
    const timeStr = `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
    onChange(timeStr);
    setIsOpen(false);
  };

  return (
    <div className="mb-4" ref={pickerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex items-center justify-between"
          style={{ fontFamily: 'Inter' }}
        >
          <span>{value}</span>
          <Clock className="w-5 h-5 text-gray-400" />
        </button>

        {isOpen && (
          <div className="absolute z-[100] mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-xl">
            <div className="flex">
              {/* Hours Column */}
              <div className="flex-1 border-r border-gray-200">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <span className="text-xs font-medium text-gray-600" style={{ fontFamily: 'Inter' }}>
                    Hour
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {hours.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleTimeSelect(h, minute)}
                      className={`w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors ${
                        h === hour ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                      style={{ fontFamily: 'Inter' }}
                    >
                      {h.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minutes Column */}
              <div className="flex-1">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <span className="text-xs font-medium text-gray-600" style={{ fontFamily: 'Inter' }}>
                    Minute
                  </span>
                </div>
                <div>
                  {minutes.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleTimeSelect(hour, m)}
                      className={`w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors ${
                        m === minute ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                      style={{ fontFamily: 'Inter' }}
                    >
                      {m.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function BookingDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState('26/10/2025');
  const [startTime, setStartTime] = useState('22:00');
  const [endTime, setEndTime] = useState('23:00');
  const [duration, setDuration] = useState('1hour');
  const [isBookingTimeExpanded, setIsBookingTimeExpanded] = useState(false);

  const durationOptions = ['1hour', '2 hours', '4 hours', '8 hours'];

  // Fetch booking data
  useEffect(() => {
    let isMounted = true;

    const fetchBookingData = async () => {
      if (!id) {
        setError('No booking ID provided');
        setLoading(false);
        return;
      }

      try {
        const bookingData = await viewBooking(id);
        
        if (!isMounted) return;

        console.log('Fetched booking data:', bookingData);
        setBooking(bookingData);
        
        // Set initial form values from booking (with null checks)
        if (bookingData && bookingData.starts_at) {
          const timezone = bookingData.location?.time_zone || 'Asia/Hong_Kong';
          
          // Format date for input (DD/MM/YYYY)
          const dateStr = formatDate(bookingData.starts_at, timezone, 'dd/MM/yyyy');
          setSelectedDate(dateStr);
          
          // Format times for input (HH:mm)
          setStartTime(formatTime(bookingData.starts_at, timezone, 'HH:mm'));
          setEndTime(formatTime(bookingData.ends_at, timezone, 'HH:mm'));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching booking:', error);
        if (isMounted) {
          setError(error.message || 'Failed to load booking');
          setLoading(false);
        }
      }
    };

    fetchBookingData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Calculate end time based on start time and duration
  const calculateEndTime = (start, durationStr) => {
    const [startHour, startMinute] = start.split(':').map(Number);
    const durationHours = parseInt(durationStr.replace(/\D/g, ''));
    
    const totalMinutes = startHour * 60 + startMinute + durationHours * 60;
    const endHour = Math.floor(totalMinutes / 60) % 24;
    const endMinute = totalMinutes % 60;
    
    return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
  };

  // Handle start time change
  const handleStartTimeChange = (newStartTime) => {
    setStartTime(newStartTime);
    setEndTime(calculateEndTime(newStartTime, duration));
  };

  // Handle duration change
  const handleDurationChange = (newDuration) => {
    setDuration(newDuration);
    setEndTime(calculateEndTime(startTime, newDuration));
  };

  if (loading) {
    return (
      <div className="p-8">
        <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900 mb-4">
          ← Back to Dashboard
        </button>
        <p className="text-gray-500">Loading booking details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="p-8">
        <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900 mb-4">
          ← Back to Dashboard
        </button>
        <p className="text-red-600 mt-4">{error || 'Booking not found'}</p>
      </div>
    );
  }

  const timezone = booking.location?.time_zone || 'Asia/Hong_Kong';
  const resourceImage = booking.resource?.metadata?.photo_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop';
  const resourceName = booking.resource?.name || 'Unknown Resource';
  const capacity = booking.resource?.metadata?.capacity || booking.resource?.max_simultaneous_bookings || 1;
  const category = booking.resource?.metadata?.category || 'Resource';
  const isPast = new Date(booking.starts_at) < new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Booking Details */}
          <div className="lg:col-span-2">
            {/* Back Button */}
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
              style={{ fontFamily: 'Inter' }}
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            {/* Room Image and Details */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
              <div className="flex items-start gap-4 p-6">
                <img
                  src={resourceImage}
                  alt={resourceName}
                  className="w-64 h-48 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Inter' }}>
                    {resourceName}
                  </h1>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span style={{ fontFamily: 'Inter' }}>x{capacity}</span>
                    </div>
                    {booking.service?.name && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full" style={{ fontFamily: 'Inter' }}>
                        {booking.service.name}
                      </span>
                    )}
                    {category && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full" style={{ fontFamily: 'Inter' }}>
                        {category}
                      </span>
                    )}
                  </div>
            
                  {booking.resource?.metadata?.resource_details?.description && (
                    <div className="flex items-center gap-2 text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>
                      <span>☑️ {booking.resource.metadata.resource_details.description}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Booking Time Section - Collapsible */}
            <div className="bg-white rounded-xl border border-gray-200">
              {/* Header - Always Visible */}
              <button 
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                onClick={() => setIsBookingTimeExpanded(!isBookingTimeExpanded)}
              >
                <div className="flex-1 text-left">
                  <h2 className="text-xl font-semibold text-gray-900 mb-1" style={{ fontFamily: 'Inter' }}>
                    Booking time
                  </h2>
                  {!isBookingTimeExpanded && (
                    <p className="text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>
                      {selectedDate} • {startTime} - {endTime}
                    </p>
                  )}
                </div>
                <div className="text-gray-600 hover:text-gray-900 transition-colors">
                  {isBookingTimeExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </button>

              {/* Collapsible Content */}
              {isBookingTimeExpanded && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  {/* Date Input */}
                  <div className="mb-4 mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>
                      Date
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{ fontFamily: 'Inter' }}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Start Time Picker */}
                  <TimePicker
                    value={startTime}
                    onChange={handleStartTimeChange}
                    label="Start"
                  />

                  {/* End Time Picker */}
                  <TimePicker
                    value={endTime}
                    onChange={setEndTime}
                    label="End"
                  />

                  {/* Duration Selection */}
                  <div className="flex gap-2">
                    {durationOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => handleDurationChange(option)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          duration === option
                            ? 'bg-blue-800 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        style={{ fontFamily: 'Inter' }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-20">
              <h2 className="text-xl font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Inter' }}>
                Summary
              </h2>
              
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Inter' }}>
                      {resourceName}
                    </p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter' }}>
                      {formatDate(booking.starts_at, timezone, 'EEEE, dd/MM/yyyy')} at {startTime} → {endTime}
                    </p>
                  </div>
                </div>
                {booking.metadata?.customer_name && (
                  <p className="text-xs text-gray-500 mb-2" style={{ fontFamily: 'Inter' }}>
                    Booked by: {booking.metadata.customer_name}
                  </p>
                )}
                {booking.is_canceled && (
                  <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs rounded" style={{ fontFamily: 'Inter' }}>
                    Canceled
                  </span>
                )}
              </div>

              {/* Error Message - only show if booking is in the past */}
              {isPast && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-600" style={{ fontFamily: 'Inter' }}>
                    You can't edit a booking in the past.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}