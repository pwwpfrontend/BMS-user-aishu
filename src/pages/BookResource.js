import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { X, Calendar, Clock, MapPin, Building, User, AlertCircle } from 'lucide-react';
import { Toast } from '../components/Toast';

const API_BASE_URL = 'https://njs-01.optimuslab.space/booking_system';

// Utils from AddBookingForm
function parseDuration(duration) {
  if (!duration) return 60;
  const match = duration.match(/PT(\d+H)?(\d+M)?/);
  if (!match) return 60;
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  return hours * 60 + minutes;
}

function getHongKongTime() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Hong_Kong' }));
}

function isTimePast(dateString, timeString) {
  const selectedDate = new Date(dateString);
  const hkNow = getHongKongTime();
  const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  const todayOnly = new Date(hkNow.getFullYear(), hkNow.getMonth(), hkNow.getDate());
  if (selectedDateOnly < todayOnly) return true;
  if (selectedDateOnly > todayOnly) return false;
  const [hours, minutes] = timeString.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;
  const nowInMinutes = hkNow.getHours() * 60 + hkNow.getMinutes();
  return timeInMinutes <= nowInMinutes;
}

function addMinutesToTime(timeString, minutes) {
  const [hours, mins] = timeString.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

function getTimezoneOffset(timezone) {
  const offsets = {
    'Asia/Hong_Kong': '+08:00',
    'UTC': '+00:00',
    'America/New_York': '-05:00',
    'Europe/London': '+00:00'
  };
  return offsets[timezone] || '+00:00';
}

// TimePickerInline component (from AddBookingForm)
function TimePickerInline({ value, onChange, onClose, availableSlots = [], scheduleBlocks = [], selectedDate, startTime, interval = 15 }) {
  const getWeekdayForDate = () => {
    if (!selectedDate) return null;
    const date = new Date(selectedDate);
    return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  };

  const weekday = getWeekdayForDate();
  
  const getDayScheduleBlocks = () => {
    if (!weekday || !scheduleBlocks || scheduleBlocks.length === 0) return [];
    return scheduleBlocks.filter(block => block.weekday === weekday);
  };

  const dayBlocks = getDayScheduleBlocks();

  const generateTimeSlotsFromSchedule = () => {
    if (dayBlocks.length === 0) return [];
    const slots = [];
    dayBlocks.forEach(block => {
      const [startHour, startMin] = block.start_time.split(':').map(Number);
      const [endHour, endMin] = block.end_time.split(':').map(Number);
      const blockStart = startHour * 60 + startMin;
      const blockEnd = endHour * 60 + endMin;
      
      for (let time = blockStart; time < blockEnd; time += interval) {
        const hour = Math.floor(time / 60);
        const minute = time % 60;
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const isPast = isTimePast(selectedDate, timeStr);
        const isBeforeStartTime = startTime && timeStr <= startTime;
        const slot = availableSlots.find(s => s.time === timeStr);
        const isAvailable = slot ? slot.available : true;
        
        slots.push({ 
          time: timeStr, 
          available: isAvailable && !isPast && !isBeforeStartTime,
          isPast: isPast || isBeforeStartTime,
          isBooked: slot ? !slot.available : false
        });
      }
    });
    return slots;
  };

  const timeSlots = generateTimeSlotsFromSchedule();

  const [hour, setHour] = useState(() => {
    const [h] = value.split(':').map(Number);
    return h % 12 === 0 ? 12 : h % 12;
  });
  const [minute, setMinute] = useState(() => {
    const [, m] = value.split(':').map(Number);
    return Math.round(m / interval) * interval;
  });
  const [period, setPeriod] = useState(() => {
    const [h] = value.split(':').map(Number);
    return h >= 12 ? 'PM' : 'AM';
  });

  const hourRef = useRef(null);
  const minuteRef = useRef(null);
  const periodRef = useRef(null);

  useEffect(() => {
    const [h] = value.split(':').map(Number);
    const [, m] = value.split(':').map(Number);
    setHour(h % 12 === 0 ? 12 : h % 12);
    setMinute(Math.round(m / interval) * interval);
    setPeriod(h >= 12 ? 'PM' : 'AM');
  }, [value, interval]);

  const availableHours24 = Array.from(new Set(timeSlots.map(s => parseInt(s.time.split(':')[0])))).sort((a,b)=>a-b);
  const convertTo24Hour = (h12, p) => {
    let h24 = h12;
    if (p === 'PM' && h12 !== 12) h24 = h12 + 12;
    if (p === 'AM' && h12 === 12) h24 = 0;
    return h24;
  };
  
  const getTimeStatus = (h, m, p) => {
    const h24 = convertTo24Hour(h, p);
    const timeStr = `${h24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    const slot = timeSlots.find(s => s.time === timeStr);
    return { available: slot ? slot.available : false, isPast: slot ? slot.isPast : false, isBooked: slot ? slot.isBooked : false };
  };

  const hoursAM = availableHours24.filter(h=>h<12).map(h=>h===0?12:h).sort((a,b)=> (a===12? -1: a)-(b===12? -1: b));
  const hoursPM = availableHours24.filter(h=>h>=12).map(h=>h%12===0?12:h%12).sort((a,b)=> (a===12? -1: a)-(b===12? -1: b));
  const availablePeriods = [hoursAM.length?'AM':null, hoursPM.length?'PM':null].filter(Boolean);
  const hoursForPeriod = period==='AM'?hoursAM:hoursPM;

  const minutesByHour = availableHours24.reduce((acc, h24) => {
    acc[h24] = Array.from(new Set(timeSlots.filter(s => parseInt(s.time.split(':')[0])===h24).map(s => parseInt(s.time.split(':')[1])))).sort((a,b)=>a-b);
    return acc;
  }, {});
  
  const minutesForHour = (minutesByHour[convertTo24Hour(hour, period)]||[]);

  useEffect(() => {
    const h24 = convertTo24Hour(hour, period);
    const mins = minutesByHour[h24] || [];
    if (mins.length && !mins.includes(minute)) setMinute(mins[0]);
  }, [hour, period]);

  const handleConfirm = () => {
    const status = getTimeStatus(hour, minute, period);
    if (status.isPast) return alert('Cannot select a past time.');
    if (status.isBooked) return alert('This slot is booked.');
    if (!status.available) return alert('This slot is not available.');
    const h24 = convertTo24Hour(hour, period);
    const timeStr = `${h24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onChange(timeStr);
    onClose();
  };

  if (timeSlots.length === 0 || availableHours24.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 mt-2">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">No available time slots for this date</p>
        </div>
        <div className="flex gap-2 pt-4 border-t border-gray-200 mt-4">
          <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6 mt-2">
      <div className="flex justify-center gap-16 mb-4">
        <div className="w-16 text-center"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Hour</p></div>
        <div className="w-16 text-center"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Minute</p></div>
        <div className="w-16 text-center"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Period</p></div>
      </div>
      <div className="flex justify-center gap-16 mb-6">
        <div className="w-16 h-44 overflow-y-scroll" ref={hourRef} style={{ scrollBehavior:'smooth', scrollbarWidth:'none' }}>
          {hoursForPeriod.map((h)=>{
            const h24 = convertTo24Hour(h, period);
            const hasAvailable = (minutesByHour[h24]||[]).some(m=>{ const s=getTimeStatus(h, m, period); return s.available && !s.isPast && !s.isBooked; });
            return (
              <button key={h} type="button" disabled={!hasAvailable} onClick={()=>setHour(h)} className={`w-full h-11 flex items-center justify-center text-base font-semibold rounded transition-all ${hour===h? 'bg-blue-100 text-blue-600': !hasAvailable? 'text-gray-300 cursor-not-allowed': 'text-gray-400 hover:text-gray-500'}`}>
                {h.toString().padStart(2,'0')}
              </button>
            );
          })}
        </div>
        <div className="w-16 h-44 overflow-y-scroll" ref={minuteRef} style={{ scrollBehavior:'smooth', scrollbarWidth:'none' }}>
          {minutesForHour.map((m)=>{
            const status = getTimeStatus(hour, m, period);
            return (
              <button key={m} type="button" disabled={status.isPast || status.isBooked} onClick={()=>setMinute(m)} className={`w-full h-11 flex items-center justify-center text-base font-semibold rounded transition-all relative ${minute===m? 'bg-blue-100 text-blue-600': status.isPast? 'text-gray-300 cursor-not-allowed': status.isBooked? 'text-red-300 cursor-not-allowed': 'text-gray-400 hover:text-gray-500'}`}>
                <span className={status.isBooked ? 'line-through' : ''}>{m.toString().padStart(2,'0')}</span>
              </button>
            );
          })}
        </div>
        <div className="w-16 h-44 overflow-y-scroll" ref={periodRef} style={{ scrollBehavior:'smooth', scrollbarWidth:'none' }}>
          {availablePeriods.map((p)=> (
            <button key={p} type="button" onClick={()=>setPeriod(p)} className={`w-full h-11 flex items-center justify-center text-base font-semibold rounded transition-all ${period===p? 'bg-blue-100 text-blue-600': 'text-gray-400 hover:text-gray-500'}`}>{p}</button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
        <button type="button" onClick={handleConfirm} disabled={(()=>{ const s=getTimeStatus(hour, minute, period); return s.isPast||s.isBooked||!s.available;})()} className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">Confirm</button>
      </div>
    </div>
  );
}

export default function BookResource() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const resource = location.state?.resource;

  const [formData, setFormData] = useState(() => {
    // Extract price from resource metadata rates if available
    let price = '0.000';
    if (resource?.metadata?.rates && Array.isArray(resource.metadata.rates) && resource.metadata.rates.length > 0) {
      const firstRate = resource.metadata.rates[0];
      if (firstRate.price !== undefined) {
        price = parseFloat(firstRate.price).toFixed(3);
      }
    }
    
    return {
      location_id: '9cacb96e-65d7-44e2-a754-3a405c072250', // CORRECTED: CUHK InnoPort location ID
      resource_id: resource?.id || '',
      service_id: '',
      starts_at: '',
      ends_at: '',
      date: resource?.date || new Date().toISOString().split('T')[0],
      start_time: resource?.startTime || '09:00',
      end_time: resource?.endTime || '10:00',
      customer_id: '',
      customer_name: '',
      price: price
    };
  });
  
  const [availableSlots, setAvailableSlots] = useState([]);
  const [serviceDetails, setServiceDetails] = useState(null);
  const [scheduleBlocks, setScheduleBlocks] = useState([]);
  const [validDates, setValidDates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState('');
  const [activeTimePicker, setActiveTimePicker] = useState(null);
  const [toast, setToast] = useState(null); // { message, type }

  // Load resource data on mount
  useEffect(() => {
    const loadResourceData = async () => {
      if (!resource?.id) return;
      try {
        setLoadingData(true);
        
        // Get service ID
        const serviceIdRes = await fetch(`${API_BASE_URL}/getServiceIdbyResourceId`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource_id: resource.id })
        });
        
        if (!serviceIdRes.ok) {
          throw new Error(`Failed to get service ID: ${serviceIdRes.status}`);
        }
        
        const serviceId = (await serviceIdRes.text()).trim();
        
        if (serviceId) {
          // Get service details
          const serviceRes = await fetch(`${API_BASE_URL}/getService/${serviceId}`);
          const service = await serviceRes.json();
          setServiceDetails(service);
          setFormData(prev => ({ ...prev, service_id: serviceId }));
          
          // Auto-adjust end time based on service duration
          if (service.duration) {
            const durationMinutes = parseDuration(service.duration);
            const endTime = addMinutesToTime(formData.start_time, durationMinutes);
            setFormData(prev => ({ ...prev, end_time: endTime }));
          }
        }
        
        // Get resource schedule
        const scheduleRes = await fetch(`${API_BASE_URL}/getResourceScheduleInfo/${encodeURIComponent(resource.name)}`);
        const scheduleData = await scheduleRes.json();
        const blocks = scheduleData.schedule_blocks || [];
        setScheduleBlocks(blocks);
        
        // Calculate valid dates
        if (blocks.length > 0) {
          const startDate = new Date();
          const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
          const validDays = new Set(blocks.map(b => b.weekday.toLowerCase()));
          const dates = [];
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayName = d.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            if (validDays.has(dayName)) dates.push(new Date(d).toISOString().split('T')[0]);
          }
          setValidDates(dates);
        }
        
      } catch (error) {
        console.error('Error loading resource data:', error);
      } finally {
        setLoadingData(false);
      }
    };
    
    loadResourceData();
  }, [resource?.id]);

  // Load available slots when date changes
  useEffect(() => {
    const loadSlots = async () => {
      if (!resource?.id || !formData.date || !serviceDetails) {
        setAvailableSlots([]);
        return;
      }
      
      setLoadingSlots(true);
      try {
        const bookingsRes = await fetch(`${API_BASE_URL}/viewFilteredBookings?resource_id=${resource.id}`);
        const bookingsData = await bookingsRes.json();
        const all = bookingsData.data || bookingsData || [];
        const dayBookings = all.filter(b => {
          if (!b.starts_at) return false;
          const d = new Date(b.starts_at).toISOString().split('T')[0];
          return d === formData.date && !b.is_canceled;
        });
        
        const selectedDate = new Date(formData.date);
        const weekday = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const dayBlocks = scheduleBlocks.filter(block => block.weekday === weekday);
        const interval = serviceDetails?.bookable_interval ? parseDuration(serviceDetails.bookable_interval) : 15;
        
        const slots = [];
        dayBlocks.forEach(block => {
          const [sh, sm] = block.start_time.split(':').map(Number);
          const [eh, em] = block.end_time.split(':').map(Number);
          const blockStart = sh * 60 + sm;
          const blockEnd = eh * 60 + em;
          for (let t = blockStart; t < blockEnd; t += interval) {
            const h = Math.floor(t / 60);
            const m = t % 60;
            const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            const slotStart = new Date(formData.date + 'T' + timeStr + ':00+08:00');
            const slotDuration = serviceDetails?.duration ? parseDuration(serviceDetails.duration) : interval;
            const slotEnd = new Date(slotStart.getTime() + slotDuration * 60 * 1000);
            const isBooked = dayBookings.some(b => {
              const bStart = new Date(b.starts_at);
              const bEnd = new Date(b.ends_at);
              return slotStart < bEnd && slotEnd > bStart;
            });
            slots.push({ time: timeStr, available: !isBooked });
          }
        });
        setAvailableSlots(slots);
      } catch (error) {
        console.error('Error loading slots:', error);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    
    loadSlots();
  }, [resource?.id, formData.date, serviceDetails, scheduleBlocks]);

  const convertTo12Hour = (time24) => {
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Get current user info
    const storedUser = JSON.parse(sessionStorage.getItem("user"));
    if (!storedUser?.email) {
      setError('User not logged in');
      return;
    }
    
    // Validate required fields
    if (!formData.resource_id) {
      setError('Resource ID is missing');
      return;
    }
    if (!formData.service_id) {
      setError('Service ID is missing. Please wait for service details to load.');
      return;
    }
    if (!formData.location_id) {
      setError('Location ID is missing');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const timezone = 'Asia/Hong_Kong';
      const starts_at = `${formData.date}T${formData.start_time}:00${getTimezoneOffset(timezone)}`;
      const ends_at = `${formData.date}T${formData.end_time}:00${getTimezoneOffset(timezone)}`;
      
      const bookingData = {
        resource_id: formData.resource_id,
        service_id: formData.service_id,
        location_id: formData.location_id,
        starts_at,
        ends_at,
        price: formData.price,
        customer_id: storedUser.email,
        customer_name: storedUser.username || storedUser.email.split('@')[0]
      };
      
      console.log('Creating booking with data:', bookingData);
      
      const response = await fetch(`${API_BASE_URL}/createBookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      
      console.log('Response status:', response.status);
      
      // Get response text first to handle any parsing errors
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      if (!response.ok) {
        let errorMessage = 'Failed to create booking';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      // Parse successful response
      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('Booking created successfully:', responseData);
      } catch (parseError) {
        console.warn('Could not parse response as JSON, but request was successful');
      }
      
      // Success - show toast and navigate back
      setToast({ message: 'Booking created successfully!', type: 'success' });
      setTimeout(() => navigate('/bookings'), 1500);
      
    } catch (err) {
      console.error('Error creating booking:', err);
      const errorMsg = err.message || 'Failed to create booking. Please try again.';
      setError(errorMsg);
      setToast({ message: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading booking form...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="p-8">
        <p className="text-red-600">No resource selected</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      
      <div className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <button onClick={() => navigate('/bookings')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6" style={{ fontFamily: 'Inter' }}>
              <X className="w-5 h-5" />
              <span>Back to Bookings</span>
            </button>

            {/* Resource Info Card */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
              <div className="flex items-start gap-4 p-6">
                <img src={resource.image} alt={resource.name} className="w-64 h-48 object-cover rounded-lg" />
                <div className="flex-1">
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Inter' }}>Book {resource.name}</h1>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span style={{ fontFamily: 'Inter' }}>x{resource.capacity}</span>
                    </div>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full" style={{ fontFamily: 'Inter' }}>{resource.type}</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full" style={{ fontFamily: 'Inter' }}>{resource.pricing}</span>
                  </div>
                  {resource.amenities && (
                    <div className="flex items-center gap-2 text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>
                      <span>+ {resource.amenities}</span>
                    </div>
                  )}
                  {serviceDetails && (
                    <div className="flex items-center gap-2 text-sm text-gray-700 mt-1" style={{ fontFamily: 'Inter' }}>
                      <span>✓ {serviceDetails.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Booking Form Card */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6" style={{ fontFamily: 'Inter' }}>Select Date & Time</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-red-600">{error}</div>
                    </div>
                  )}

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      style={{ fontFamily: 'Inter' }}
                      required
                    />
                  </div>

                  {/* Start Time */}
                  <div className="relative">
                    <label className="text-sm font-medium text-gray-700 mb-2 block" style={{ fontFamily: 'Inter' }}>
                      Start time {loadingSlots && <span className="text-xs text-gray-500">(Loading...)</span>}
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTimePicker(activeTimePicker === 'start' ? null : 'start')}
                      disabled={loadingSlots || !formData.date}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-500 hover:bg-gray-50 text-left font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between disabled:opacity-50"
                    >
                      <span>{convertTo12Hour(formData.start_time)}</span>
                      <Clock className="w-5 h-5 text-gray-400" />
                    </button>
                    {activeTimePicker === 'start' && (
                      <TimePickerInline
                        value={formData.start_time}
                        onChange={(time) => {
                          setFormData(prev => ({ ...prev, start_time: time }));
                          if (serviceDetails?.duration) {
                            const durationMinutes = parseDuration(serviceDetails.duration);
                            const endTime = addMinutesToTime(time, durationMinutes);
                            setFormData(prev => ({ ...prev, end_time: endTime }));
                          }
                          setActiveTimePicker(null);
                        }}
                        onClose={() => setActiveTimePicker(null)}
                        availableSlots={availableSlots}
                        scheduleBlocks={scheduleBlocks}
                        selectedDate={formData.date}
                        interval={serviceDetails?.bookable_interval ? parseDuration(serviceDetails.bookable_interval) : 15}
                      />
                    )}
                  </div>

                  {/* End Time */}
                  <div className="relative">
                    <label className="text-sm font-medium text-gray-700 mb-2 block" style={{ fontFamily: 'Inter' }}>End time</label>
                    <button
                      type="button"
                      onClick={() => setActiveTimePicker(activeTimePicker === 'end' ? null : 'end')}
                      disabled={loadingSlots || !formData.date}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-500 hover:bg-gray-50 text-left font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between disabled:opacity-50"
                    >
                      <span>{convertTo12Hour(formData.end_time)}</span>
                      <Clock className="w-5 h-5 text-gray-400" />
                    </button>
                    {activeTimePicker === 'end' && (
                      <TimePickerInline
                        value={formData.end_time}
                        onChange={(time) => {
                          setFormData(prev => ({ ...prev, end_time: time }));
                          setActiveTimePicker(null);
                        }}
                        onClose={() => setActiveTimePicker(null)}
                        availableSlots={availableSlots}
                        scheduleBlocks={scheduleBlocks}
                        selectedDate={formData.date}
                        startTime={formData.start_time}
                        interval={serviceDetails?.bookable_interval ? parseDuration(serviceDetails.bookable_interval) : 15}
                      />
                    )}
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-200 mt-6">
                    <div></div> {/* Empty div for spacing */}
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => navigate('/bookings')} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading || loadingSlots}
                        className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                        style={{ backgroundColor: '#184AC0' }}
                      >
                        {loading ? 'Creating booking...' : 'Create Booking'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Booking Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Inter' }}>Booking Summary</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>Resource</p>
                  <p className="font-medium text-gray-900" style={{ fontFamily: 'Inter' }}>{resource.name}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>Date</p>
                  <p className="font-medium text-gray-900" style={{ fontFamily: 'Inter' }}>
                    {formData.date ? new Date(formData.date).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long', 
                      day: 'numeric'
                    }) : 'Select date'}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>Time</p>
                  <p className="font-medium text-gray-900" style={{ fontFamily: 'Inter' }}>
                    {convertTo12Hour(formData.start_time)} - {convertTo12Hour(formData.end_time)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>Duration</p>
                  <p className="font-medium text-gray-900" style={{ fontFamily: 'Inter' }}>
                    {(() => {
                      const [startH, startM] = formData.start_time.split(':').map(Number);
                      const [endH, endM] = formData.end_time.split(':').map(Number);
                      const durationMins = (endH * 60 + endM) - (startH * 60 + startM);
                      const hours = Math.floor(durationMins / 60);
                      const mins = durationMins % 60;
                      if (hours > 0) {
                        return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
                      }
                      return `${mins}m`;
                    })()} 
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>Price</p>
                  <p className="font-medium text-gray-900" style={{ fontFamily: 'Inter' }}>{resource.pricing}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}