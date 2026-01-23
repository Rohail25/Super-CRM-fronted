import { useState, useCallback } from 'react';
import { handleApiError, getErrorMessage } from '../utils/errorHandler';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export function useApi<T = any>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (apiCall: () => Promise<T>, options?: UseApiOptions) => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiCall();
        setData(result);
        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        options?.onError?.(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}

