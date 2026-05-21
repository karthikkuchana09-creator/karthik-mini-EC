import { useState, useEffect, useCallback } from 'react';
import * as superAdminApi from '../api/superAdmin';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from 'recharts';
import { SkeletonCard, SkeletonChart } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import { getErrorMessage } from '../utils/errorHandler';
import { formatTimestamp } from '../utils/format';

const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

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

const STAT_CARDS = [
  { key: 'orgs', label: 'Organizations', gradient: 'from-indigo-600 to-indigo-700', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', desc: 'Active organizations' },
  { key: 'totalRevenue', label: 'Total Revenue', gradient: 'from-emerald-500 to-emerald-600', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', desc: 'All-time platform revenue' },
  { key: 'mrr', label: 'MRR', gradient: 'from-violet-500 to-violet-600', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', desc: 'Current month recurring' },
  { key: 'users', label: 'Total Users', gradient: 'from-blue-500 to-blue-600', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', desc: 'Across all organizations' },
  { key: 'subscriptions', label: 'Active Subscriptions', gradient: 'from-amber-500 to-amber-600', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', desc: 'Paid & trialing' },
  { key: 'aiAnalyses', label: 'AI Analyses', gradient: 'from-cyan-500 to-cyan-600', icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z', desc: 'Total platform analyses' },
];

function SuperAdminDashboard() {
  const [data, setData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [dashboard, signups] = await Promise.all([
        superAdminApi.getDashboard(),
        superAdminApi.getSignupsTrend(30),
      ]);
      setData(dashboard);
      setTrendData(signups);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load platform data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const orgs = data?.organizations || {};
  const revenue = data?.revenue || {};
  const subscriptions = data?.subscriptions || {};
  const users = data?.users || {};
  const apiUsage = data?.api_usage || {};
  const aiUsage = data?.ai_usage || {};
  const planDist = data?.plan_distribution || [];
  const revByMonth = data?.revenue_by_month || [];

  const statValues = {
    orgs: `${orgs.active || 0} / ${orgs.total || 0}`,
    totalRevenue: `₹${(revenue.total_revenue_inr || 0).toLocaleString()}`,
    mrr: `₹${(revenue.current_mrr_inr || 0).toLocaleString()}/mo`,
    users: (users.total_users || 0).toLocaleString(),
    subscriptions: (subscriptions.active || 0).toLocaleString(),
    aiAnalyses: (aiUsage.total_analyses || 0).toLocaleString(),
  };

  const planPieData = planDist.map((d) => ({ name: d.plan, value: d.count }));
  const revenueChartData = revByMonth.map((d) => ({ month: d.period, revenue: d.amount / 100, count: d.count }));
  const signupsChartData = (trendData?.org_signups || []).map((d) => ({ date: d.date, signups: d.count }));
  const userSignupsData = (trendData?.user_signups || []).map((d) => ({ date: d.date, users: d.count }));
  const aiTrendData = (trendData?.ai_trend || []).map((d) => ({ date: d.date, analyses: d.count, tokens: Math.round(d.tokens / 1000) }));

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Platform Overview</h1>
              <p className="text-xs text-gray-400 mt-1">Cross-tenant analytics {'\u2014'} last updated {formatTimestamp(new Date().toISOString())}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {STAT_CARDS.map((card) => (
            <StatCard key={card.key} {...card} value={statValues[card.key]} loading={loading} />
          ))}
        </div>

        {/* Revenue + Plan Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartCard title="Revenue Trend (12 months)" accentColor="from-emerald-500 to-emerald-600" subtitle="Monthly revenue in INR">
              {loading ? <SkeletonChart /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={revenueChartData}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
          <div>
            <ChartCard title="Plan Distribution" accentColor="from-indigo-500 to-indigo-600" subtitle="Organizations by plan">
              {loading ? <SkeletonChart /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={planPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={3}>
                      {planPieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>

        {/* Signups + AI Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Organization Signups (30 days)" accentColor="from-blue-500 to-blue-600">
            {loading ? <SkeletonChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={signupsChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="signups" name="Signups" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="User Signups (30 days)" accentColor="from-violet-500 to-violet-600">
            {loading ? <SkeletonChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={userSignupsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="users" name="Users" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* AI Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="AI Analysis Trend (30 days)" accentColor="from-cyan-500 to-cyan-600">
            {loading ? <SkeletonChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={aiTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="analyses" name="Analyses" stroke="#06b6d4" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="AI Token Usage (30 days, in K)" accentColor="from-pink-500 to-pink-600">
            {loading ? <SkeletonChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={aiTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="tokens" name="Tokens (K)" stroke="#ec4899" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Subscription Status + User Roles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Subscription Status" accentColor="from-amber-500 to-amber-600">
            {loading ? <SkeletonChart /> : (
              <div className="space-y-3">
                {(subscriptions.by_status || []).map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-emerald-400' : s.status === 'trialing' ? 'bg-blue-400' : s.status === 'past_due' ? 'bg-red-400' : 'bg-gray-400'}`} />
                      <span className="text-sm text-gray-700 capitalize">{s.status}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
          <ChartCard title="User Role Distribution" accentColor="from-blue-500 to-blue-600">
            {loading ? <SkeletonChart /> : (
              <div className="space-y-3">
                {(users.by_role || []).map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${PIE_COLORS[i % PIE_COLORS.length]}`} style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-sm text-gray-700 capitalize">{r.role}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{r.count}</span>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </div>

        {/* API + AI Usage Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500">Credit Transactions</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{(apiUsage.total_transactions || 0).toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{(apiUsage.total_credits_used || 0).toLocaleString()} credits consumed</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500">Today{"'"}s Activity</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{(apiUsage.today_transactions || 0).toLocaleString()} txns</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{(aiUsage.today_analyses || 0).toLocaleString()} AI analyses</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500">Week Activity</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{(apiUsage.week_transactions || 0).toLocaleString()} txns</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{(aiUsage.total_tokens_used || 0).toLocaleString()} total tokens</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-[10px] text-gray-400">Platform analytics refresh on reload {'\u00B7'} Super admin access only</p>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
