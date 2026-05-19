import { useState, useCallback, useRef } from 'react';

export function useAsyncCallback(asyncFn) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn(...args);
      if (mountedRef.current) setLoading(false);
      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
        setLoading(false);
      }
      throw err;
    }
  }, [asyncFn]);

  return { execute, loading, error };
}
