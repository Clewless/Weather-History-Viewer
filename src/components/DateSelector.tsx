import { h } from 'preact';

import { useState, useEffect } from 'preact/hooks';

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
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  const minDate = new Date('1940-01-01');
  const maxDate = today;
  
  // Generate calendar days
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  useEffect(() => {
    generateCalendarDays(currentMonth);
  }, [currentMonth]);
  
  const generateCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Sunday of the week containing the first day
    const startDay = new Date(firstDay);
    startDay.setDate(firstDay.getDate() - firstDay.getDay());
    
    // End on Saturday of the week containing the last day
    const SATURDAY = 6;
    const endDay = new Date(lastDay);
    endDay.setDate(lastDay.getDate() + (SATURDAY - lastDay.getDay()));
    
    const days: Date[] = [];
    const current = new Date(startDay);
    
    while (current <= endDay) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    setCalendarDays(days);
  };
  
  const handlePrevMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };
  
  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
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
    return date.toISOString().split('T')[0] === todayString;
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
        Showing weather data for {new Date(selectedDate).toLocaleDateString()}
      </p>
    </div>
  );
};