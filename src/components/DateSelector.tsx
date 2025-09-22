import { h } from 'preact';

import { useState, useEffect } from 'preact/hooks';

import {
  safeParseDate,
  getCurrentDate,
  getMinDate,
  getMaxDate,
  generateCalendarDays,
  getPreviousMonth,
  getNextMonth,
  isToday,
  isCurrentMonth,
  formatDateForDisplay,
  formatDateForInput,
  getMonthName
} from '../utils/dateUtils';

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
  const minDate = getMinDate();
  const maxDate = getMaxDate();
  const todayString = formatDateForInput(getMaxDate());

  // Generate calendar days
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState(getCurrentDate());
  
  useEffect(() => {
    setCalendarDays(generateCalendarDays(currentMonth));
  }, [currentMonth]);
  
  const handlePrevMonth = () => {
    setCurrentMonth(getPreviousMonth(currentMonth));
  };

  const handleNextMonth = () => {
    setCurrentMonth(getNextMonth(currentMonth));
  };
  
  const handleDateSelect = (date: Date) => {
    if (date < minDate || date > maxDate) return;
    
    const dateString = date.toISOString().split('T')[0];
    onDateChange(dateString);
    setShowCalendar(false);
  };
  
  const isSelectedDate = (date: Date): boolean => {
    return formatDateForInput(date) === selectedDate;
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
          onChange={(e: Event) => onDateChange((e.target as HTMLInputElement).value)}
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
                class={`calendar-day ${!isCurrentMonth(date, currentMonth) ? 'other-month' : ''} ${isSelectedDate(date) ? 'selected' : ''} ${isToday(date) ? 'today' : ''}`}
                onClick={() => handleDateSelect(date)}
                disabled={date < minDate || date > maxDate || loading}
                aria-label={formatDateForDisplay(date)}
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
      
      {loading && (
        <div class="loading" role="status" aria-live="polite">
          <span class="loading-spinner"></span>
          Updating...
        </div>
      )}
      <p class="date-hint">
        Showing weather data for {selectedDate ? safeParseDate(selectedDate)?.toLocaleDateString() || 'Invalid Date' : 'unknown date'}
      </p>
    </div>
  );
};