import { useState, useRef, useEffect } from 'react';

function Dropdown({ trigger, children, align = 'right', className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClick(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const alignClasses = {
    left: 'left-0',
    right: 'right-0',
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className={`absolute z-20 mt-2 ${alignClasses[align] || alignClasses.right} min-w-[200px] bg-white rounded-xl border border-gray-200 shadow-xl py-1 animate-fadeIn`}>
            {typeof children === 'function' ? children({ close: () => setIsOpen(false) }) : children}
          </div>
        </>
      )}
    </div>
  );
}

function DropdownItem({ children, onClick, danger = false, disabled = false, className = '' }) {
  return (
    <button
      onClick={() => !disabled && onClick?.()}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

function DropdownDivider() {
  return <div className="my-1 border-t border-gray-100" />;
}

Dropdown.Item = DropdownItem;
Dropdown.Divider = DropdownDivider;

export default Dropdown;
