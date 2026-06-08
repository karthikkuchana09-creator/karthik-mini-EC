import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const COLORS = {
  used: '#6366f1',
  limit: '#e5e7eb',
};

const CUSTOM_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b'];

export default function UsageChart({ data: items, compact = false }) {
  if (!items || items.length === 0) return null;

  const chartData = items.map((item) => ({
    name: item.label,
    Used: item.used,
    Limit: item.limit,
    pct: item.limit > 0 ? Math.round((item.used / item.limit) * 100) : 0,
  }));

  if (compact) {
    return (
      <div className="space-y-4">
        {chartData.map((item, idx) => (
          <div key={item.name}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CUSTOM_COLORS[idx % CUSTOM_COLORS.length] }} />
                <span className="text-xs font-medium text-gray-600">{item.name}</span>
              </div>
              <span className="text-xs font-semibold text-gray-900 tabular-nums">
                {item.Used} / {item.Limit}
                <span className="text-gray-400 ml-1">({item.pct}%)</span>
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, item.pct)}%`,
                  backgroundColor: item.pct >= 90 ? '#ef4444' : item.pct >= 70 ? '#f59e0b' : CUSTOM_COLORS[idx % CUSTOM_COLORS.length],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    const item = chartData.find((d) => d.name === label);
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3">
        <p className="text-xs font-semibold text-gray-900 mb-1.5">{label}</p>
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-500">{entry.name}:</span>
            <span className="font-semibold text-gray-900">{entry.value}</span>
          </div>
        ))}
        {item && item.pct > 0 && (
          <p className="text-[10px] text-gray-400 mt-1">{item.pct}% of limit used</p>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={4} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#f1f5f9' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="Limit" fill={COLORS.limit} radius={[4, 4, 0, 0]} name="Limit" />
          <Bar dataKey="Used" radius={[4, 4, 0, 0]} name="Used">
            {chartData.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.pct >= 90 ? '#ef4444' : entry.pct >= 70 ? '#f59e0b' : CUSTOM_COLORS[idx % CUSTOM_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
