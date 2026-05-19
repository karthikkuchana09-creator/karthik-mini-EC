import { useState, useEffect } from 'react';
import { INPUT_CLASSES } from '../../config/ui';
import { useDebounce } from '../../hooks/useDebounce';

function SearchInput({ value: externalValue, onChange, placeholder = 'Search...', debounceMs = 300, className = '' }) {
  const [internalValue, setInternalValue] = useState(externalValue || '');
  const debouncedValue = useDebounce(internalValue, debounceMs);

  useEffect(() => {
    if (externalValue !== undefined && externalValue !== internalValue) {
      setInternalValue(externalValue);
    }
  }, [externalValue]);

  useEffect(() => {
    if (onChange && debouncedValue !== externalValue) {
      onChange(debouncedValue);
    }
  }, [debouncedValue]);

  const isControlled = externalValue !== undefined;

  return (
    <div className={`relative ${className}`}>
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={isControlled ? externalValue : internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder}
        className={`${INPUT_CLASSES} pl-10`}
      />
      {internalValue && (
        <button
          onClick={() => {
            setInternalValue('');
            if (onChange) onChange('');
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default SearchInput;
