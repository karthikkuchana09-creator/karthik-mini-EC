import { FiCheckCircle, FiAlertTriangle, FiClock } from 'react-icons/fi';

export default function SLAMetrics({ metrics = { met: 0, breached: 0, atRisk: 0 } }) {
  const items = [
    { label: 'Met', value: metrics.met, icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'At Risk', value: metrics.atRisk, icon: FiClock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Breached', value: metrics.breached, icon: FiAlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.label} className={`${item.bg} rounded-xl p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <item.icon className={`w-4 h-4 ${item.color}`} />
            <span className="text-xs font-medium text-gray-600">{item.label}</span>
          </div>
          <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}
