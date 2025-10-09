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
  const [showCalendar, setShowCalendar] = useState(false);
  
  useEffect(() => {
    setCalendarDays(generateCalendarDays(currentMonth));
  }, [currentMonth]);
  
  const handlePrevMonth = () => {
    setCurrentMonth(getPreviousMonth(currentMonth));
  };

  const handleNextMonth = () => {
    setCurrentMonth(getNextMonth(currentMonth));
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
        <button
          type="button"
          class="calendar-toggle"
          onClick={() => setShowCalendar(!showCalendar)}
          disabled={loading}
          aria-label="Toggle calendar"
        >
          Calendar
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
              Previous
            </button>
            <h4 id="calendar-month-label">{getMonthName(currentMonth)}</h4>
            <button
              type="button"
              class="calendar-nav"
              onClick={handleNextMonth}
              aria-label="Next month"
            >
              Next
            </button>
          </div>
          <div class="calendar-grid" role="grid" aria-labelledby="calendar-month-label">
            {/* Calendar days */}
            {calendarDays.map((date, index) => (
              <button
                key={index}
                type="button"
                class="calendar-day"
                disabled={date < minDate || date > maxDate || loading}
                aria-label={formatDateForDisplay(date)}
                aria-pressed={isSelectedDate(date)}
                onClick={() => {
                  onDateChange(formatDateForInput(date));
                  setShowCalendar(false);
                }}
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
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {loading && (
        <div class="loading" role="status" aria-live="polite">
          <div class="loading-text">.....</div>
        </div>
      )}
      <p class="date-hint">
        Showing weather data for {selectedDate ? safeParseDate(selectedDate)?.toLocaleDateString() || 'Invalid Date' : 'unknown date'}
      </p>
    </div>
  );
};