export default function WorkloadCard({ icon: Icon, label, value, sub, color, className = '' }) {
  const c = {
    bg: color?.bg || 'bg-gray-50',
    icon: color?.icon || 'text-gray-500',
    text: color?.text || 'text-gray-900',
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
          {Icon && <Icon className={`w-5 h-5 ${c.icon}`} />}
        </div>
        <div>
          <p className="text-[11px] text-gray-500 font-medium">{label}</p>
          <p className={`text-xl font-bold ${c.text}`}>{value ?? '-'}</p>
          {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
