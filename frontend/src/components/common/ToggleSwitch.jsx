export default function ToggleSwitch({
  label,
  checked,
  onChange,
  disabled = false,
  description,
  id,
  size = 'md',
  className = '',
}) {
  const uniqueId = id || `toggle-${label?.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).slice(2, 7)}`;

  const sizeMap = {
    sm: { toggle: 'w-7 h-4', dot: 'w-3 h-3', translate: 'translate-x-3', dotTop: 'top-0.5 left-0.5' },
    md: { toggle: 'w-9 h-5', dot: 'w-4 h-4', translate: 'translate-x-4', dotTop: 'top-0.5 left-0.5' },
    lg: { toggle: 'w-11 h-6', dot: 'w-5 h-5', translate: 'translate-x-5', dotTop: 'top-0.5 left-0.5' },
  };

  const s = sizeMap[size] || sizeMap.md;

  return (
    <label
      className={`inline-flex items-start gap-3 select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      htmlFor={uniqueId}
    >
      <div className="relative inline-flex items-center flex-shrink-0 mt-0.5">
        <input
          id={uniqueId}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
          aria-describedby={description ? `${uniqueId}-desc` : undefined}
        />
        <div
          className={`${s.toggle} rounded-full peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 peer-focus:ring-offset-2 transition-colors duration-200 ease-in-out ${
            checked ? 'bg-indigo-600' : 'bg-gray-300'
          } ${disabled ? 'pointer-events-none' : ''}`}
        >
          <div
            className={`absolute ${s.dotTop} ${s.dot} bg-white rounded-full shadow transition-transform duration-200 ease-in-out ${
              checked ? s.translate : 'translate-x-0'
            }`}
          />
        </div>
      </div>
      <div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {description && (
          <p id={`${uniqueId}-desc`} className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
    </label>
  );
}
