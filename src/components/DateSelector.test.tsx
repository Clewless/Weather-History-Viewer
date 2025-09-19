import { h } from 'preact';
import { render, fireEvent } from '@testing-library/preact';
import '@testing-library/jest-dom';
import { DateSelector } from './DateSelector';

describe('DateSelector', () => {
  const mockOnDateChange = jest.fn();
  const testDate = '2023-06-15';

  beforeEach(() => {
    mockOnDateChange.mockClear();
  });

  it('renders without crashing', () => {
    const { container } = render(
      <DateSelector
        selectedDate={testDate}
        onDateChange={mockOnDateChange}
        loading={false}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('displays the correct date', () => {
    const { getByLabelText } = render(
      <DateSelector
        selectedDate={testDate}
        onDateChange={mockOnDateChange}
        loading={false}
      />
    );
    const input = getByLabelText('Selected date') as HTMLInputElement;
    expect(input.value).toBe(testDate);
  });

  it('calls onDateChange when date is changed', () => {
    const { getByLabelText } = render(
      <DateSelector
        selectedDate={testDate}
        onDateChange={mockOnDateChange}
        loading={false}
      />
    );
    const input = getByLabelText('Selected date') as HTMLInputElement;
    
    const newDate = '2023-06-16';
    fireEvent.change(input, { target: { value: newDate } });
    
    expect(mockOnDateChange).toHaveBeenCalledWith(newDate);
  });

  it('is disabled when loading', () => {
    const { getByLabelText } = render(
      <DateSelector
        selectedDate={testDate}
        onDateChange={mockOnDateChange}
        loading={true}
      />
    );
    const input = getByLabelText('Selected date') as HTMLInputElement;
    expect(input).toBeDisabled();
  });
});