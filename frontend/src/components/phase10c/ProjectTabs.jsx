export default function ProjectTabs({ tabs, activeTab, onChange, className = '' }) {
  return (
    <nav className={`flex gap-1 overflow-x-auto scrollbar-hide ${className}`} aria-label="Tabs">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-t-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              isActive
                ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/70 border-b-white -mb-px z-10'
                : 'bg-white text-gray-500 hover:text-gray-700 hover:shadow-sm border border-transparent hover:border-gray-200/50'
            }`}
          >
            {Icon && <Icon className="w-4 h-4 shrink-0" />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
