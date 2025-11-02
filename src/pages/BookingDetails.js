import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronUp, Users, Clock } from 'lucide-react';

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
  const location = useLocation();
  const { booking } = location.state || {};

  const [selectedDate, setSelectedDate] = useState('26/10/2025');
  const [startTime, setStartTime] = useState('22:00');
  const [endTime, setEndTime] = useState('23:00');
  const [duration, setDuration] = useState('1hour');
  const [isBookingTimeExpanded, setIsBookingTimeExpanded] = useState(false);

  const durationOptions = ['1hour', '2 hours', '4 hours', '8 hours'];

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

  if (!booking) {
    return (
      <div className="p-8">
        <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900">
          ← Back to Dashboard
        </button>
        <p className="mt-4">No booking data available</p>
      </div>
    );
  }

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
                  src={booking.image}
                  alt={booking.name}
                  className="w-64 h-48 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Inter' }}>
                    {booking.name}
                  </h1>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span style={{ fontFamily: 'Inter' }}>x8</span>
                    </div>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full" style={{ fontFamily: 'Inter' }}>
                      Free of Charge
                    </span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full" style={{ fontFamily: 'Inter' }}>
                      Meeting Room
                    </span>
                  </div>
            
                  <div className="flex items-center gap-2 text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>
                    <span>☑️ Air conditioning, Internet, Printer</span>
                  </div>
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
                      {booking.name}
                    </p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter' }}>
                      Sunday, 26/10/2025 at {startTime} → {endTime}
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-600" style={{ fontFamily: 'Inter' }}>
                  You can't edit a booking in the past.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}