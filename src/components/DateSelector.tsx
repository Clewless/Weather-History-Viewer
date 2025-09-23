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

    const dateString = formatDateForInput(date);
    console.log('[DEBUG] DateSelector handleDateSelect:', {
      originalDate: date,
      dateString,
      minDate: formatDateForInput(minDate),
      maxDate: formatDateForInput(maxDate)
    });
    onDateChange(dateString);
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
          min={formatDateForInput(minDate)}
          max={todayString}
          disabled={loading}
          onChange={(e: Event) => {
            const {value} = (e.target as HTMLInputElement);
            console.log('[DEBUG] DateSelector input change:', {
              inputValue: value,
              isValidFormat: /^\d{4}-\d{2}-\d{2}$/.test(value)
            });
            onDateChange(value);
          }}
          aria-label="Selected date"
        />
      </div>
      
      {/* Calendar popup */}
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
      </div>
      
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