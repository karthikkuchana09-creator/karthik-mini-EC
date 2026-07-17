import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getReport, getReportData } from '../../api/reports';
import { FiArrowLeft, FiBarChart2, FiDownload, FiRefreshCw } from 'react-icons/fi';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'];

function ChartRenderer({ chartData, chartType }) {
  if (!chartData || !chartType || chartType === 'none') return null;

  if (chartType === 'bar') return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData.labels?.map((l, i) => ({ name: l, value: chartData.values?.[i] || 0 }))}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  if (chartType === 'pie') return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={chartData.labels?.map((l, i) => ({ name: l, value: chartData.values?.[i] || 0 }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
          {chartData.labels?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  if (chartType === 'line') return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData.labels?.map((l, i) => ({ name: l, value: chartData.values?.[i] || 0 }))}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );

  return null;
}

export default function ReportViewer() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getReport(id);
      setReport(r);
      const d = await getReportData(id);
      setData(d);
    } catch { setReport(null); setData(null); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-8"><div className="animate-pulse bg-gray-200 rounded-2xl h-96" /></div>;
  if (!report) return <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-500">Report not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/reports" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 mb-6 transition-colors"><FiArrowLeft className="w-4 h-4" />Back to Reports</Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{report.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{report.description} {report.description && '·'} {report.entity_type} report</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Refresh"><FiRefreshCw className="w-4 h-4" /></button>
          <Link to={`/reports/${id}/export?format=csv`} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"><FiDownload className="w-3.5 h-3.5" /> CSV</Link>
          <Link to={`/reports/${id}/export?format=json`} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"><FiDownload className="w-3.5 h-3.5" /> JSON</Link>
        </div>
      </div>

      {data && data.chart_data && report.config?.chart_type && report.config.chart_type !== 'none' && (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><FiBarChart2 className="w-4 h-4 text-indigo-500" />Chart</h3>
          <ChartRenderer chartData={data.chart_data} chartType={report.config.chart_type} />
        </div>
      )}

      {data?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {Object.entries(data.summary).map(([key, val]) => (
            <div key={key} className="bg-white rounded-xl border border-gray-200/70 shadow-sm p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{key.replace(/_/g, ' ')}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{String(val)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200/60">
                {data?.columns?.map(col => <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{col.replace(/_/g, ' ')}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.rows?.length === 0 ? (
                <tr><td colSpan={data?.columns?.length || 1} className="px-4 py-12 text-center text-gray-400">No data</td></tr>
              ) : (
                data?.rows?.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/70 transition-colors">
                    {data.columns.map(col => <td key={col} className="px-4 py-3 text-sm text-gray-700">{String(row[col] ?? '-')}</td>)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
