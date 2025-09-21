import { h } from 'preact';

import { useState, useEffect } from 'preact/hooks';

import { addDays, subDays, startOfWeek, endOfWeek, isSameDay, startOfDay } from 'date-fns';

import { getCurrentDateString, parseDateString, getCurrentTimestamp, createDateFromTimestamp, createDate } from '../utils/dateUtils';

interface DateSelectorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  loading?: boolean;
}

export const DateSelector = ({
  selectedDate,
  onDateChange,
  loading = false
}: DateSelectorProps) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const todayString = getCurrentDateString();
  const minDate = parseDateString('1940-01-01') || createDate(1940, 0, 1);
  const maxDate = startOfDay(parseDateString(todayString) || createDateFromTimestamp(getCurrentTimestamp())); // We'll need to keep this for comparison purposes
  
  // Generate calendar days
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState(startOfDay(parseDateString(todayString) || createDateFromTimestamp(getCurrentTimestamp())));
  
  useEffect(() => {
    generateCalendarDays(currentMonth);
  }, [currentMonth]);
  
  const generateCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // First day of month
    const firstDay = startOfDay(parseDateString(getCurrentDateString()) || createDate(year, month, 1));
    // Last day of month
    const lastDay = startOfDay(parseDateString(getCurrentDateString()) || createDate(year, month + 1, 0));
    
    // Start from Sunday of the week containing the first day
    const startDay = startOfWeek(firstDay);
    
    // End on Saturday of the week containing the last day
    const endDay = endOfWeek(lastDay);
    
    const days: Date[] = [];
    const current = startOfDay(parseDateString(getCurrentDateString()) || createDateFromTimestamp(startDay.getTime()));
    
    while (current <= endDay) {
      days.push(startOfDay(parseDateString(getCurrentDateString()) || createDateFromTimestamp(current.getTime())));
      current.setDate(current.getDate() + 1);
    }
    
    setCalendarDays(days);
  };
  
  const handlePrevMonth = () => {
    const newMonth = subDays(currentMonth, currentMonth.getDate());
    setCurrentMonth(createDate(newMonth.getFullYear(), newMonth.getMonth(), 1));
  };
  
  const handleNextMonth = () => {
    const newMonth = addDays(currentMonth, 31);
    setCurrentMonth(createDate(newMonth.getFullYear(), newMonth.getMonth(), 1));
  };
  
  const handleDateSelect = (date: Date) => {
    if (date < minDate || date > maxDate) return;
    
    const dateString = date.toISOString().split('T')[0];
    onDateChange(dateString);
    setShowCalendar(false);
  };
  
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const getMonthName = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  
  const isSelectedDate = (date: Date): boolean => {
    return date.toISOString().split('T')[0] === selectedDate;
  };
  
  const isToday = (date: Date): boolean => {
    const today = startOfDay(parseDateString(getCurrentDateString()) || createDateFromTimestamp(getCurrentTimestamp()));
    return isSameDay(date, today);
  };
  
  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentMonth.getMonth() &&
           date.getFullYear() === currentMonth.getFullYear();
  };

  return (
    <div class="date-selector" role="group" aria-label="Date selector">
      <h3>Select Date</h3>
      
      {/* Date input with calendar toggle */}
      <div class="date-input-container">
        <input
          type="date"
          id="selected-date"
          class="date-input"
          value={selectedDate}
          min={minDate.toISOString().split('T')[0]}
          max={todayString}
          disabled={loading}
          onChange={(e) => onDateChange(e.currentTarget.value)}
          aria-label="Selected date"
        />
        <button
          type="button"
          class="calendar-toggle"
          onClick={() => setShowCalendar(!showCalendar)}
          aria-label={showCalendar ? 'Hide calendar' : 'Show calendar'}
          disabled={loading}
        >
          📅
        </button>
      </div>
      
      {/* Calendar popup */}
      {showCalendar && (
        <div class="calendar-popup" role="dialog" aria-modal="true" aria-label="Calendar">
          <div class="calendar-header">
            <button
              type="button"
              class="calendar-nav"
              onClick={handlePrevMonth}
              aria-label="Previous month"
            >
              ‹
            </button>
            <div class="calendar-month">
              {getMonthName(currentMonth)}
            </div>
            <button
              type="button"
              class="calendar-nav"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              ›
            </button>
          </div>
          
          <div class="calendar-grid">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} class="calendar-day-header">{day}</div>
            ))}
            
            {/* Calendar days */}
            {calendarDays.map((date, index) => (
              <button
                key={index}
                type="button"
                class={`calendar-day ${!isCurrentMonth(date) ? 'other-month' : ''} ${isSelectedDate(date) ? 'selected' : ''} ${isToday(date) ? 'today' : ''}`}
                onClick={() => handleDateSelect(date)}
                disabled={date < minDate || date > maxDate || loading}
                aria-label={formatDate(date)}
                aria-pressed={isSelectedDate(date)}
              >
                {date.getDate()}
              </button>
            ))}
          </div>
          
          <div class="calendar-footer">
            <button
              type="button"
              class="close-calendar"
              onClick={() => setShowCalendar(false)}
              aria-label="Close calendar"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {loading && <div class="loading" role="status" aria-live="polite">Updating...</div>}
      <p class="date-hint">
        Showing weather data for {selectedDate ? parseDateString(selectedDate)?.toLocaleDateString() || 'Invalid Date' : 'unknown date'}
      </p>
    </div>
  );
};