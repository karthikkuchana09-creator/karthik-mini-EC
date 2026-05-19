import { useState, useMemo } from 'react';

function Tabs({ tabs, activeTab, onChange, className = '' }) {
  const [internalTab, setInternalTab] = useState(0);
  const currentTab = activeTab !== undefined ? activeTab : internalTab;

  const handleChange = (index) => {
    if (onChange) onChange(index);
    else setInternalTab(index);
  };

  return (
    <div className={className}>
      <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
        {tabs.map((tab, idx) => {
          const isActive = currentTab === idx;
          const isDisabled = tab.disabled;
          return (
            <button
              key={tab.key || idx}
              onClick={() => !isDisabled && handleChange(idx)}
              disabled={isDisabled}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
              {tab.label}
              {tab.badge !== undefined && (
                <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full font-medium ${
                  isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        {tabs[currentTab]?.children || tabs[currentTab]?.content}
      </div>
    </div>
  );
}

export default Tabs;
