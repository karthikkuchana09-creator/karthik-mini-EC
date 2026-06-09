import { useState, useEffect, useCallback } from 'react';
import * as saasDashboardApi from '../api/saasDashboard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area,
} from 'recharts';
import { SkeletonCard, SkeletonChart } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import { getErrorMessage } from '../utils/errorHandler';
import { formatTimestamp } from '../utils/format';

const STATUS_COLORS = { ACTIVE: '#10b981', SUSPENDED: '#ef4444', TRIAL: '#3b82f6', CANCELLED: '#6b7280' };

function StatCard({ title, value, gradient, icon, desc, loading }) {
  if (loading) return <SkeletonCard />;
  return (
    <div className="group bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums tracking-tight">{value}</p>
          {desc && <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md shadow-current/10 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300 shrink-0 ml-3`}>
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, accentColor = 'from-indigo-500 to-indigo-600', subtitle }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${accentColor}`} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
        {subtitle && <p className="text-xs text-gray-400 mb-4">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

const SUMMARY_CARDS = [
  { key: 'total_tenants', label: 'Total Tenants', gradient: 'from-indigo-600 to-indigo-700', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', desc: 'All tenants' },
  { key: 'active_tenants', label: 'Active', gradient: 'from-emerald-500 to-emerald-600', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', desc: 'Active tenants' },
  { key: 'trial_tenants', label: 'Trial', gradient: 'from-blue-500 to-blue-600', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', desc: 'Trial tenants' },
  { key: 'suspended_tenants', label: 'Suspended', gradient: 'from-rose-500 to-rose-600', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636', desc: 'Suspended tenants' },
  { key: 'total_workspaces', label: 'Workspaces', gradient: 'from-violet-500 to-violet-600', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z', desc: 'Across all tenants' },
  { key: 'total_channels', label: 'Channels', gradient: 'from-cyan-500 to-cyan-600', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z', desc: 'Across all tenants' },
  { key: 'total_users', label: 'Users', gradient: 'from-amber-500 to-amber-600', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', desc: 'Across all tenants' },
];

function SaaSDashboard() {
  const [summary, setSummary] = useState(null);
  const [growth, setGrowth] = useState(null);
  const [usage, setUsage] = useState(null);
  const [topTenants, setTopTenants] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [summaryData, growthData, usageData, topTenantsData] = await Promise.all([
        saasDashboardApi.getSummary(),
        saasDashboardApi.getTenantGrowth(30),
        saasDashboardApi.getUsage(),
        saasDashboardApi.getTopTenants({ page: 1, size: 10 }),
      ]);
      setSummary(summaryData);
      setGrowth(growthData);
      setUsage(usageData);
      setTopTenants(topTenantsData);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load SaaS dashboard data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const growthChartData = (growth || []).map((d) => ({ date: d.date, tenants: d.count }));

  const totalStorageMb = (usage || []).reduce((s, u) => s + (u.storage_used_mb || 0), 0);
  const usageChartData = (usage || []).map((u) => ({
    name: u.tenant_name?.length > 15 ? u.tenant_name.slice(0, 15) + '\u2026' : u.tenant_name || u.slug,
    workspaces: u.workspace_count || 0,
    channels: u.channel_count || 0,
    members: u.member_count || 0,
    fullName: u.tenant_name,
  }));

  const topTenantsList = topTenants?.items || topTenants?.results || topTenants?.data || [];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">SaaS Dashboard</h1>
              <p className="text-xs text-gray-400 mt-1">Tenant growth, collaboration usage & top tenants {'\u2014'} last updated {formatTimestamp(new Date().toISOString())}</p>
            </div>
            <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {SUMMARY_CARDS.map((card) => (
            <StatCard key={card.key} {...card} value={summary?.[card.key]?.toLocaleString() ?? '\u2014'} loading={loading} />
          ))}
        </div>

        {/* Tenant Growth + Storage Used */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Tenant Growth (30 days)" accentColor="from-indigo-500 to-indigo-600" subtitle="Daily tenant signups">
            {loading ? <SkeletonChart /> : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={growthChartData}>
                  <defs>
                    <linearGradient id="tenantGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="tenants" name="New Tenants" stroke="#4f46e5" strokeWidth={2} fill="url(#tenantGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="Total Storage Used" accentColor="from-emerald-500 to-emerald-600" subtitle={`${(totalStorageMb / 1024).toFixed(1)} GB across all tenants`}>
            {loading ? <SkeletonChart /> : (
              <div className="flex flex-col items-center justify-center h-[280px]">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#10b981" strokeWidth="3"
                      strokeDasharray={`${Math.min(totalStorageMb / 50, 1) * 100} 100`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900 tabular-nums">{totalStorageMb.toFixed(0)}</span>
                    <span className="text-xs text-gray-400">MB</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">Aggregated from {usage?.length || 0} tenants</p>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Usage by Tenant (stacked bar) */}
        <ChartCard title="Collaboration Usage by Tenant" accentColor="from-violet-500 to-violet-600" subtitle="Workspaces, channels, and members per tenant">
          {loading ? <SkeletonChart /> : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={usageChartData} margin={{ bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-35} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="workspaces" name="Workspaces" stackId="a" fill="#4f46e5" radius={[0, 0, 0, 0]} />
                <Bar dataKey="channels" name="Channels" stackId="a" fill="#06b6d4" />
                <Bar dataKey="members" name="Members" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top Tenants */}
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Top Tenants</h3>
                <p className="text-xs text-gray-400 mt-0.5">Tenants sorted by workspace count, channel count, and creation date</p>
              </div>
              {topTenants?.total_pages > 1 && (
                <span className="text-xs text-gray-400">{topTenants.total} total</span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Tenant</th>
                    <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Slug</th>
                    <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Workspaces</th>
                    <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Channels</th>
                    <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Storage</th>
                    <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-3 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : topTenantsList.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-sm text-gray-400">No tenants found</td></tr>
                  ) : (
                    topTenantsList.map((t) => (
                      <tr key={t.tenant_id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-3 py-3 text-sm font-medium text-gray-900">{t.tenant_name}</td>
                        <td className="px-3 py-3 text-sm text-gray-500 font-mono">{t.slug}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            t.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' :
                            t.status === 'TRIAL' ? 'bg-blue-50 text-blue-700' :
                            t.status === 'SUSPENDED' ? 'bg-red-50 text-red-700' :
                            'bg-gray-50 text-gray-500'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[t.status] || '#6b7280' }} />
                            {t.status?.charAt(0) + t.status?.slice(1).toLowerCase() || '\u2014'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-gray-900 text-right tabular-nums">{t.workspace_count}</td>
                        <td className="px-3 py-3 text-sm font-semibold text-gray-900 text-right tabular-nums">{t.channel_count}</td>
                        <td className="px-3 py-3 text-sm text-gray-700 text-right tabular-nums">{(t.storage_used_mb || 0).toFixed(1)} MB</td>
                        <td className="px-3 py-3 text-sm text-gray-400 text-right whitespace-nowrap">{t.created_at ? formatTimestamp(t.created_at) : '\u2014'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-[10px] text-gray-400">SaaS dashboard data refreshes on reload {'\u00B7'} Super admin access only</p>
        </div>
      </div>
    </div>
  );
}

export default SaaSDashboard;
