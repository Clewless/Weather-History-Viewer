import { h } from 'preact';

import { render, fireEvent } from '@testing-library/preact';

import '@testing-library/jest-dom';
import { useErrorHandler } from './useErrorHandler';

// Test component that uses the hook
const TestComponent = () => {
  const { error, isLoading, handleError, clearError, setLoadingState } = useErrorHandler();
  
  return (
    <div>
      <div data-testid="error">{error?.message || 'No error'}</div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not loading'}</div>
      <button onClick={() => handleError('Test error')}>Trigger Error</button>
      <button onClick={() => handleError('Warning message', 'warning')}>Trigger Warning</button>
      <button onClick={() => clearError()}>Clear Error</button>
      <button onClick={() => setLoadingState(true)}>Set Loading</button>
      <button onClick={() => setLoadingState(false)}>Clear Loading</button>
    </div>
  );
};

describe('useErrorHandler', () => {
  it('initializes with no error and not loading', () => {
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('error')).toHaveTextContent('No error');
    expect(getByTestId('loading')).toHaveTextContent('Not loading');
  });

  it('sets error when handleError is called', () => {
    const { getByTestId, getByText } = render(<TestComponent />);
    fireEvent.click(getByText('Trigger Error'));
    expect(getByTestId('error')).toHaveTextContent('Test error');
  });

  it('sets warning when handleError is called with warning type', () => {
    const { getByTestId, getByText } = render(<TestComponent />);
    fireEvent.click(getByText('Trigger Warning'));
    expect(getByTestId('error')).toHaveTextContent('Warning message');
  });

  it('clears error when clearError is called', () => {
    const { getByTestId, getByText } = render(<TestComponent />);
    fireEvent.click(getByText('Trigger Error'));
    expect(getByTestId('error')).toHaveTextContent('Test error');
    
    fireEvent.click(getByText('Clear Error'));
    expect(getByTestId('error')).toHaveTextContent('No error');
  });

  it('sets loading state when setLoadingState is called', () => {
    const { getByTestId, getByText } = render(<TestComponent />);
    fireEvent.click(getByText('Set Loading'));
    expect(getByTestId('loading')).toHaveTextContent('Loading');
    
    fireEvent.click(getByText('Clear Loading'));
    expect(getByTestId('loading')).toHaveTextContent('Not loading');
  });
});