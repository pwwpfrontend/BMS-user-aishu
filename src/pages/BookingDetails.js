import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronUp, Users, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { Toast } from '../components/Toast';

// API base
const API_BASE_URL = 'https://njs-01.optimuslab.space/booking_system';

// Small utils aligned with AddBookingForm.js
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
  const total = hours * 60 + mins + minutes;
  const newHours = Math.floor(total / 60) % 24;
  const newMins = total % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}
function getTimezoneOffset(tz) {
  const offsets = {
    'Asia/Hong_Kong': '+08:00',
    'UTC': '+00:00',
    'America/New_York': '-05:00',
    'Europe/London': '+00:00'
  };
  return offsets[tz] || '+00:00';
}

// API helpers
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    // Some endpoints return text; try json then text
    let message;
    try { const j = await response.json(); message = j.message || JSON.stringify(j); } catch { message = await response.text(); }
    throw new Error(message || `API ${response.status}`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return await response.json();
  return await response.text();
}
async function viewBooking(bookingId) {
  const resp = await apiRequest(`/viewBooking/${bookingId}`);
  return resp.data;
}
async function updateBookingApi(bookingId, updates) {
  return await apiRequest(`/updateBooking/${bookingId}`, { method: 'PATCH', body: JSON.stringify(updates) });
}
async function deleteBookingApi(bookingId) {
  return await apiRequest(`/deleteBooking/${bookingId}`, { method: 'DELETE' });
}

// TimePickerInline (ported from AddBookingForm with booked/past indicators)
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
  const minutesByHour = availableHours24.reduce((acc, h24) => {
    acc[h24] = Array.from(new Set(timeSlots.filter(s => parseInt(s.time.split(':')[0])===h24).map(s => parseInt(s.time.split(':')[1])))).sort((a,b)=>a-b);
    return acc;
  }, {});
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
  useEffect(() => {
    const h24 = convertTo24Hour(hour, period);
    const mins = minutesByHour[h24] || [];
    if (mins.length && !mins.includes(minute)) setMinute(mins[0]);
  }, [hour, period]);

  const hoursAM = availableHours24.filter(h=>h<12).map(h=>h===0?12:h).sort((a,b)=> (a===12? -1: a)-(b===12? -1: b));
  const hoursPM = availableHours24.filter(h=>h>=12).map(h=>h%12===0?12:h%12).sort((a,b)=> (a===12? -1: a)-(b===12? -1: b));
  const availablePeriods = [hoursAM.length?'AM':null, hoursPM.length?'PM':null].filter(Boolean);
  const hoursForPeriod = period==='AM'?hoursAM:hoursPM;
  const minutesForHour = (minutesByHour[convertTo24Hour(hour, period)]||[]);

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
          <p className="text-xs text-gray-500 mt-1">{weekday ? `This resource is not available on ${weekday}s` : 'Please select a different date'}</p>
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
            const hasAvailable = (minutesByHour[h24]||[]).some(m=>{
              const s = getTimeStatus(h, m, period);
              return s.available && !s.isPast && !s.isBooked;
            });
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
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-100 rounded"></div><span>Selected</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-gray-300 rounded"></div><span>Available</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div><span>Past</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div><span className="line-through">Booked</span></div>
      </div>
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <button type="button" onClick={onClose} className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
        <button type="button" onClick={handleConfirm} disabled={(()=>{ const s=getTimeStatus(hour, minute, period); return s.isPast||s.isBooked||!s.available;})()} className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">Confirm</button>
      </div>
    </div>
  );
}

export default function BookingDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  // booking and ui state
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [featuresText, setFeaturesText] = useState('');

  // edit form state
  const [dateYMD, setDateYMD] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  // availability state
  const [serviceDetails, setServiceDetails] = useState(null);
  const [scheduleBlocks, setScheduleBlocks] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [validDates, setValidDates] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [activeTimePicker, setActiveTimePicker] = useState(null);

  // toast state
  const [toast, setToast] = useState(null); // { message, type }

  // delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch booking
  useEffect(() => {
    let isMounted = true;
    const fetchBookingData = async () => {
      if (!id) { setError('No booking ID provided'); setLoading(false); return; }
      try {
        const passed = location.state?.booking;
        const data = passed || await viewBooking(id);
        if (!isMounted) return;
        const bk = passed ? passed : data;
        setBooking(bk);
        const tz = bk.location?.time_zone || 'Asia/Hong_Kong';
        // Init date/time from booking
        const dtStart = DateTime.fromISO(bk.starts_at).setZone(tz);
        const dtEnd = DateTime.fromISO(bk.ends_at).setZone(tz);
        setDateYMD(dtStart.toFormat('yyyy-MM-dd'));
        setStartTime(dtStart.toFormat('HH:mm'));
        setEndTime(dtEnd.toFormat('HH:mm'));
      } catch (e) {
        setError(e.message || 'Failed to load booking');
      } finally { setLoading(false); }
    };
    fetchBookingData();
    return () => { isMounted = false; };
  }, [id]);

  // Load resource features
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!booking?.resource) return;
      let mongoId = booking?.resource?.mongoId || booking?.resource?.mongo_id || booking?.resource?.metadata?.mongo_id || booking?.resource?._id;
      try {
        // Fallback: look up by name if mongoId missing
        if (!mongoId && booking?.resource?.name) {
          const name = encodeURIComponent(booking.resource.name);
          const res = await fetch(`${API_BASE_URL}/viewResource/${name}`);
          if (res.ok) {
            const json = await res.json();
            const item = json?.data?.[0] || null;
            mongoId = item?.mongo_id || item?.metadata?.mongo_id || mongoId;
          }
        }
        if (!mongoId) return;
        const resp = await fetch(`${API_BASE_URL}/resource/${mongoId}`);
        if (!resp.ok) return;
        const data = await resp.json();
        const groups = ['features','amenities','security'];
        const enabled = [];
        groups.forEach(g => {
          const obj = data[g] || {};
          Object.entries(obj).forEach(([k, v]) => {
            // Support {enabled:true}, true, or 'true'
            const isEnabled = (v && typeof v === 'object' && (v.enabled === true || v.enabled === 'true')) || v === true || v === 'true';
            if (isEnabled) {
              const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              enabled.push(label);
            }
          });
        });
        if (mounted && enabled.length>0) setFeaturesText(enabled.join(' • '));
      } catch (e) {
        // ignore
      }
    };
    load();
    return ()=>{ mounted=false; };
  }, [booking?.resource?.name]);

  // Load service and schedule for resource
  useEffect(() => {
    const loadResourceData = async () => {
      if (!booking?.resource) return;
      try {
        const resourceId = booking.resource.id;
        const resourceName = booking.resource.name;
        // Service ID
        const serviceId = await apiRequest('/getServiceIdbyResourceId', { method:'POST', body: JSON.stringify({ resource_id: resourceId }) });
        if (typeof serviceId === 'string') {
          const service = await apiRequest(`/getService/${serviceId}`);
          setServiceDetails(service);
        }
        // Schedule blocks
        const scheduleResp = await apiRequest(`/getResourceScheduleInfo/${encodeURIComponent(resourceName)}`);
        const blocks = scheduleResp.schedule_blocks || [];
        setScheduleBlocks(blocks);
        // Valid dates based on recurring schedule
        const recurring = scheduleResp.recurring_schedule;
        calculateValidDates(blocks, recurring);
      } catch (e) {
        console.error('Error loading resource data:', e);
      }
    };
    loadResourceData();
  }, [booking?.resource]);

  const calculateValidDates = (blocks, recurringSchedule) => {
    if (!blocks || blocks.length === 0) { setValidDates([]); return; }
    const startDate = recurringSchedule?.start_date ? new Date(recurringSchedule.start_date) : new Date();
    const endDate = recurringSchedule?.end_date ? new Date(recurringSchedule.end_date) : new Date(Date.now()+365*24*60*60*1000);
    const validDays = new Set(blocks.map(b=>b.weekday.toLowerCase()));
    const dates = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate()+1)) {
      const dayName = d.toLocaleDateString('en-US', { weekday:'long' }).toLowerCase();
      if (validDays.has(dayName)) dates.push(new Date(d).toISOString().split('T')[0]);
    }
    setValidDates(dates);
  };

  // Load available start-time slots for selected date (ignore current booking to allow editing)
  useEffect(() => {
    const loadSlots = async () => {
      if (!booking?.resource?.id || !dateYMD || !serviceDetails) { setAvailableSlots([]); return; }
      setLoadingSlots(true);
      try {
        const bookingsRes = await apiRequest(`/viewFilteredBookings?resource_id=${booking.resource.id}`);
        const all = (bookingsRes.data || bookingsRes || []);
        const dayBookings = all.filter(b => {
          if (!b.starts_at) return false;
          const d = new Date(b.starts_at).toISOString().split('T')[0];
          return d === dateYMD && !b.is_canceled && b.id !== booking.id; // exclude current booking
        });
        const selectedDate = new Date(dateYMD);
        const weekday = selectedDate.toLocaleDateString('en-US', { weekday:'long' }).toLowerCase();
        const dayBlocks = (scheduleBlocks||[]).filter(block => block.weekday === weekday);
        const interval = serviceDetails?.bookable_interval ? parseDuration(serviceDetails.bookable_interval) : (serviceDetails?.duration_step ? parseDuration(serviceDetails.duration_step) : 15);
        const slots = [];
        dayBlocks.forEach(block => {
          const [sh, sm] = block.start_time.split(':').map(Number);
          const [eh, em] = block.end_time.split(':').map(Number);
          const blockStart = sh*60+sm; const blockEnd = eh*60+em;
          for (let t=blockStart; t<blockEnd; t+=interval) {
            const h = Math.floor(t/60); const m = t%60;
            const timeStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
            const slotStart = new Date(dateYMD+'T'+timeStr+':00+08:00');
            const slotDuration = serviceDetails?.duration ? parseDuration(serviceDetails.duration) : interval;
            const slotEnd = new Date(slotStart.getTime() + slotDuration*60*1000);
            const isBooked = dayBookings.some(b => {
              const bStart = new Date(b.starts_at); const bEnd = new Date(b.ends_at);
              return slotStart < bEnd && slotEnd > bStart;
            });
            slots.push({ time: timeStr, available: !isBooked });
          }
        });
        setAvailableSlots(slots);
      } catch (e) {
        console.error('Error loading slots:', e); setAvailableSlots([]);
      } finally { setLoadingSlots(false); }
    };
    loadSlots();
  }, [booking?.resource?.id, booking?.id, dateYMD, serviceDetails, scheduleBlocks]);

  // Keep end time valid when start changes
  useEffect(() => {
    if (!dateYMD || availableSlots.length===0) return;
    if (endTime <= startTime) {
      const next = availableSlots.find(s => s.time > startTime && s.available && !isTimePast(dateYMD, s.time));
      if (next) setEndTime(next.time);
      else if (serviceDetails?.duration) setEndTime(addMinutesToTime(startTime, parseDuration(serviceDetails.duration)));
    }
  }, [startTime, availableSlots, dateYMD, serviceDetails]);

  // validation
  const validate = () => {
    if (!dateYMD) return 'Please select a date';
    if (!startTime) return 'Please select start time';
    if (!endTime) return 'Please select end time';
    if (startTime >= endTime) return 'End time must be after start time';
    if (validDates.length>0 && !validDates.includes(dateYMD)) return 'Selected date is not available for this resource';
    const startSlot = availableSlots.find(s => s.time === startTime);
    if (startSlot && !startSlot.available) return 'Selected start time is not available';
    if (isTimePast(dateYMD, startTime)) return 'Cannot select a past time';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); setToast({ message: err, type: 'error' }); return; }
    try {
      setError(null);
      const tz = booking.location?.time_zone || 'Asia/Hong_Kong';
      const offset = getTimezoneOffset(tz);
      const starts_at = `${dateYMD}T${startTime}:00${offset}`;
      const ends_at = `${dateYMD}T${endTime}:00${offset}`;
      await updateBookingApi(booking.id, { starts_at, ends_at });
      // Update local booking state
      const newStartISO = DateTime.fromISO(starts_at).toISO();
      const newEndISO = DateTime.fromISO(ends_at).toISO();
      setBooking(prev => ({ ...prev, starts_at: newStartISO, ends_at: newEndISO }));
      setToast({ message: 'Booking updated successfully', type: 'success' });
    } catch (e) {
      const msg = e.message || 'Failed to update booking';
      setError(msg);
      setToast({ message: msg, type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!booking?.id) return;
    try {
      setDeleting(true);
      await deleteBookingApi(booking.id);
      setToast({ message: 'Booking deleted', type: 'success' });
      setShowDeleteModal(false);
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (e) {
      const msg = e.message || 'Failed to delete booking';
      setError(msg);
      setToast({ message: msg, type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900 mb-4">← Back to Dashboard</button>
        <p className="text-gray-500">Loading booking details...</p>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="p-8">
        <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900 mb-4">← Back to Dashboard</button>
        <p className="text-red-600 mt-4">{error}</p>
      </div>
    );
  }

  const timezone = booking?.location?.time_zone || 'Asia/Hong_Kong';
  const resourceImage = booking?.resource?.metadata?.photo_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop';
  const resourceName = booking?.resource?.name || 'Unknown Resource';
  const capacity = booking?.resource?.metadata?.capacity || booking?.resource?.max_simultaneous_bookings || 1;
  const category = booking?.resource?.metadata?.category || 'Resource';
  const bookingStartHK = new Date(booking?.starts_at || Date.now());
  const isPastBooking = bookingStartHK < new Date();

  const convertTo12Hour = (time24) => {
    if (!time24 || typeof time24 !== 'string' || !time24.includes(':')) return '--:--';
    const [hStr, mStr] = time24.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return '--:--';
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Inter' }}>Delete booking?</h3>
            <p className="text-sm text-gray-600 mb-4" style={{ fontFamily: 'Inter' }}>
              This action cannot be undone. Are you sure you want to permanently delete this booking?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={()=>setShowDeleteModal(false)} disabled={deleting} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50" style={{ backgroundColor: '#dc2626' }}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6" style={{ fontFamily: 'Inter' }}>
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
              <div className="flex items-start gap-4 p-6">
                <img src={resourceImage} alt={resourceName} className="w-64 h-48 object-cover rounded-lg" />
                <div className="flex-1">
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Inter' }}>{resourceName}</h1>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1 text-sm text-gray-600"><Users className="w-4 h-4" /><span style={{ fontFamily: 'Inter' }}>x{capacity}</span></div>
                    {booking?.service?.name && (<span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full" style={{ fontFamily: 'Inter' }}>{booking.service.name}</span>)}
                    {category && (<span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full" style={{ fontFamily: 'Inter' }}>{category}</span>)}
                  </div>
                  {booking?.resource?.metadata?.resource_details?.description && (
                    <div className="flex items-center gap-2 text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>
                      <span>ℹ️ {booking.resource.metadata.resource_details.description}</span>
                    </div>
                  )}
                  {featuresText && (<div className="flex items-center gap-2 text-sm text-gray-700 mt-1" style={{ fontFamily: 'Inter' }}><span>✓ {featuresText}</span></div>)}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200">
              <button className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors" onClick={() => setActiveTimePicker(null)}>
                <div className="flex-1 text-left">
                  <h2 className="text-xl font-semibold text-gray-900 mb-1" style={{ fontFamily: 'Inter' }}>Booking time</h2>
                  <p className="text-sm text-gray-600" style={{ fontFamily: 'Inter' }}>{DateTime.fromFormat(dateYMD||'', 'yyyy-MM-dd').toFormat('dd/MM/yyyy')} • {startTime} - {endTime}</p>
                </div>
                <div className="text-gray-600 hover:text-gray-900 transition-colors"><ChevronUp className="w-5 h-5" /></div>
              </button>

              <div className="px-6 pb-6 border-t border-gray-100">
                {/* Date */}
                <div className="mb-4 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Inter' }}>Date</label>
                  <input type="date" value={dateYMD} onChange={(e)=>setDateYMD(e.target.value)} min={new Date().toISOString().split('T')[0]} disabled={isPastBooking} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
                  {validDates.length>0 && dateYMD && !validDates.includes(dateYMD) && (
                    <p className="text-xs text-red-600 mt-1">This date is not available for the selected resource</p>
                  )}
                </div>

                {/* Start time picker */}
                <div className="relative mb-4" data-time-picker>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Start time {loadingSlots && <span className="text-xs text-gray-500">(Loading...)</span>}</label>
                  <button type="button" onClick={()=> setActiveTimePicker(activeTimePicker==='start'? null : 'start')} disabled={isPastBooking || loadingSlots || !dateYMD} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-500 hover:bg-gray-50 text-left font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between disabled:opacity-50">
                    <span>{convertTo12Hour(startTime)}</span>
                    <Clock className="w-5 h-5 text-gray-400" />
                  </button>
                  {activeTimePicker==='start' && (
                    <TimePickerInline value={startTime} onChange={(t)=>{ setStartTime(t); if (serviceDetails?.duration) setEndTime(addMinutesToTime(t, parseDuration(serviceDetails.duration))); }} onClose={()=>setActiveTimePicker(null)} availableSlots={availableSlots} scheduleBlocks={scheduleBlocks} selectedDate={dateYMD} interval={serviceDetails?.bookable_interval ? parseDuration(serviceDetails.bookable_interval) : (serviceDetails?.duration_step ? parseDuration(serviceDetails.duration_step) : 15)} />
                  )}
                </div>

                {/* End time picker */}
                <div className="relative" data-time-picker>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">End time</label>
                  <button type="button" onClick={()=> setActiveTimePicker(activeTimePicker==='end'? null : 'end')} disabled={isPastBooking || loadingSlots || !dateYMD} className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-500 hover:bg-gray-50 text-left font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between disabled:opacity-50">
                    <span>{convertTo12Hour(endTime)}</span>
                    <Clock className="w-5 h-5 text-gray-400" />
                  </button>
                  {activeTimePicker==='end' && (
                    <TimePickerInline value={endTime} onChange={(t)=>{ setEndTime(t); }} onClose={()=>setActiveTimePicker(null)} availableSlots={availableSlots} scheduleBlocks={scheduleBlocks} selectedDate={dateYMD} startTime={startTime} interval={serviceDetails?.bookable_interval ? parseDuration(serviceDetails.bookable_interval) : (serviceDetails?.duration_step ? parseDuration(serviceDetails.duration_step) : 15)} />
                  )}
                </div>

                {/* Save/Delete buttons */}
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-200 mt-6">
                  <button type="button" onClick={()=>setShowDeleteModal(true)} disabled={loadingSlots || deleting} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50">
                    <Trash2 className="w-4 h-4" /> Delete booking
                  </button>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={()=>navigate('/dashboard')} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                    <button type="button" onClick={handleSave} disabled={isPastBooking || loadingSlots} className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50" style={{ backgroundColor:'#184AC0' }}>Save changes</button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-600">{error}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-20">
              <h2 className="text-xl font-semibold text-gray-900 mb-4" style={{ fontFamily: 'Inter' }}>Summary</h2>
              <div className="mb-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900" style={{ fontFamily: 'Inter' }}>{resourceName}</p>
                    <p className="text-xs text-gray-500" style={{ fontFamily: 'Inter' }}>{DateTime.fromFormat(dateYMD||'', 'yyyy-MM-dd').toFormat('EEEE, dd/MM/yyyy')} at {startTime} → {endTime}</p>
                  </div>
                </div>
                {booking?.metadata?.customer_name && (
                  <p className="text-xs text-gray-500 mb-2" style={{ fontFamily: 'Inter' }}>Booked by: {booking.metadata.customer_name}</p>
                )}
                {booking?.is_canceled && (
                  <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs rounded" style={{ fontFamily: 'Inter' }}>Canceled</span>
                )}
                {featuresText && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-gray-700" style={{ fontFamily: 'Inter' }}>
                    <span className="text-gray-400 flex-shrink-0">✓</span>
                    <span>{featuresText}</span>
                  </div>
                )}
              </div>

              {isPastBooking && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-600" style={{ fontFamily: 'Inter' }}>You can't edit a booking in the past.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
