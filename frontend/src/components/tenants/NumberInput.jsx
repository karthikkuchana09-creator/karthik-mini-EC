export default function NumberInput({
  label,
  value,
  onChange,
  min = 1,
  max,
  suffix,
  error,
  disabled = false,
  className = '',
}) {
  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      onChange('');
      return;
    }
    const num = Number(raw);
    if (!isNaN(num) && num >= 0) {
      onChange(num);
    }
  };

  const handleBlur = () => {
    if (value === '' || value === undefined || value === null) {
      onChange(min);
    } else if (Number(value) < min) {
      onChange(min);
    } else if (max !== undefined && Number(value) > max) {
      onChange(max);
    }
  };

  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value === undefined || value === null ? '' : value}
          onChange={handleChange}
          onBlur={handleBlur}
          min={min}
          max={max}
          disabled={disabled}
          className={`w-full px-3 py-2 text-sm border rounded-lg transition-all outline-none ${
            error
              ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500/20 focus:border-red-500'
              : 'border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
          } ${disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white'}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
