import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

export function useQueryParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const getParam = useCallback((key, defaultValue = null) => {
    return searchParams.get(key) || defaultValue;
  }, [searchParams]);

  const setParam = useCallback((key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === null || value === undefined || value === '') {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
      return next;
    });
  }, [setSearchParams]);

  const setParams = useCallback((params) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined || value === '') {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      }
      return next;
    });
  }, [setSearchParams]);

  const getParams = useCallback(() => {
    const params = {};
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
    return params;
  }, [searchParams]);

  const clearParams = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  return useMemo(() => ({
    getParam,
    setParam,
    setParams,
    getParams,
    clearParams,
    searchParams,
  }), [getParam, setParam, setParams, getParams, clearParams, searchParams]);
}
