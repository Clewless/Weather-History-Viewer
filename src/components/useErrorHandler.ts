import { h } from 'preact';

import { useState, useCallback } from 'preact/hooks';

import { startOfDay } from 'date-fns';

import { getCurrentDateString, parseDateString, getCurrentTimestamp, createDateFromTimestamp } from '../utils/dateUtils';

interface ErrorState {
  message: string;
  type: 'error' | 'warning' | 'info';
  timestamp: Date;
}

export const useErrorHandler = () => {
  const [error, setError] = useState<ErrorState | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useCallback((message: string, type: 'error' | 'warning' | 'info' = 'error') => {
    setError({
      message,
      type,
      timestamp: startOfDay(parseDateString(getCurrentDateString()) || createDateFromTimestamp(getCurrentTimestamp())) // Create Date object from timestamp
    });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setLoadingState = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return {
    error,
    isLoading,
    handleError,
    clearError,
    setLoadingState
  };
};