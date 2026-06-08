import { useState, useRef, useEffect } from 'react';

const ROLE_CONFIG = {
  'Workspace Admin': { color: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500' },
  Moderator: { color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  Member: { color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  Viewer: { color: 'bg-gray-50 text-gray-600', dot: 'bg-gray-400' },
};

export default function RoleSelector({ value, onChange, disabled = false, size = 'sm' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const config = ROLE_CONFIG[value] || ROLE_CONFIG.Member;
  const sizeClass = size === 'sm' ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-all ${config.color} ${sizeClass} ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        {value}
        {!disabled && (
          <svg className="w-3 h-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute z-30 top-full mt-1 left-0 min-w-[180px] bg-white rounded-xl border border-gray-200 shadow-xl py-1 animate-fadeIn">
          {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
            <button
              key={role}
              onClick={() => { onChange(role); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                role === value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className="flex-1 text-left">{role}</span>
              {role === value && (
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { ROLE_CONFIG };
