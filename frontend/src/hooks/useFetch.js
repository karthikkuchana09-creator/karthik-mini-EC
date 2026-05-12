import { useState, useEffect, useCallback, useRef } from 'react';
import { getErrorMessage } from '../utils/errorHandler';

export function useFetch(fetchFn, deps = [], options = {}) {
  const { immediate = true, onError } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate ? true : false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
      }
      return result;
    } catch (err) {
      const message = getErrorMessage(err);
      if (mountedRef.current) {
        setError(message);
        setLoading(false);
      }
      if (onError) onError(err);
      throw err;
    }
  }, deps);

  useEffect(() => {
    if (immediate) execute();
  }, [execute, immediate]);

  return { data, loading, error, refetch: execute };
}
