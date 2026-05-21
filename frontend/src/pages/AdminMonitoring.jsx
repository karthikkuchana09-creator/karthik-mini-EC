import { useState, useEffect, useCallback } from 'react';
import * as monitoringApi from '../api/monitoring';
import { SkeletonCard, SkeletonChart } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import { getErrorMessage } from '../utils/errorHandler';
import { formatTimestamp } from '../utils/format';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-900 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</p>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="h-8 w-72 bg-gray-200/70 rounded-lg animate-pulse" />
      <div className="h-4 w-96 bg-gray-200/70 rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><SkeletonChart /><SkeletonChart /></div>
      <SkeletonChart />
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        {color && <span className={`w-2 h-2 rounded-full ${color}`} />}
      </div>
      <p className={`text-2xl font-bold ${value === 'Exhausted' ? 'text-red-600' : value === 'Degraded' ? 'text-yellow-600' : 'text-gray-900'}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, description, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-indigo-500 rounded-full" />
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function AdminMonitoring() {
  const [health, setHealth] = useState(null);
  const [queue, setQueue] = useState(null);
  const [retries, setRetries] = useState(null);
  const [tenantPerf, setTenantPerf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [triggering, setTriggering] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [healthRes, queueRes, retriesRes, perfRes] = await Promise.all([
        monitoringApi.getDetailedHealth(),
        monitoringApi.getBackgroundQueue(),
        monitoringApi.getWebhookRetries(),
        monitoringApi.getTenantPerformance(24),
      ]);
      setHealth(healthRes.data);
      setQueue(queueRes.data);
      setRetries(retriesRes.data);
      setTenantPerf(perfRes.data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleTrigger = async (action, label) => {
    setTriggering(label);
    try {
      await action();
      toast.success(`${label} triggered successfully`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setTriggering(null);
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const isHealthy = health?.status === 'healthy';
  const isRedisUp = health?.checks?.redis?.available;
  const isQueueRunning = health?.checks?.background_queue?.running;
  const wsCount = health?.checks?.websocket?.connections ?? 0;
  const wsUsers = health?.checks?.websocket?.connected_users ?? 0;
  const pendingCount = queue?.pending_count ?? 0;

  const retryStats = retries?.stats || {};
  const pendingRetries = retryStats?.pending ?? 0;
  const failedRetries = retryStats?.failed ?? 0;
  const resolvedRetries = retryStats?.resolved ?? 0;
  const totalRetries = retryStats?.total ?? 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-sm text-gray-500 mt-1">Health, queue, webhook retries & tenant performance</p>
        </div>
        <button onClick={fetchData} className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">Refresh</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="System Status" value={isHealthy ? 'Healthy' : 'Degraded'} color={isHealthy ? 'bg-green-500' : 'bg-yellow-500'} sub={isHealthy ? 'All checks passing' : 'Some checks failing'} />
        <StatCard label="Queue Depth" value={pendingCount} sub={`${queue?.worker_count ?? '?'} workers`} color={pendingCount > 50 ? 'bg-red-500' : 'bg-green-500'} />
        <StatCard label="Pending Retries" value={pendingRetries} sub={`${resolvedRetries} resolved`} color={pendingRetries > 10 ? 'bg-yellow-500' : 'bg-green-500'} />
        <StatCard label="WebSocket" value={wsCount} sub={`${wsUsers} unique users`} color={wsCount > 0 ? 'bg-green-500' : 'bg-gray-400'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Health Checks">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="text-sm text-gray-700">API Status</span>
              </div>
              <span className="text-sm font-medium">{isHealthy ? 'Operational' : 'Degraded'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isRedisUp ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-700">Redis</span>
              </div>
              <span className="text-sm font-medium">{isRedisUp ? 'Connected' : 'Unavailable'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isQueueRunning ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-700">Background Queue</span>
              </div>
              <span className="text-sm font-medium">{isQueueRunning ? 'Running' : 'Stopped'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${wsCount > 0 ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm text-gray-700">WebSocket</span>
              </div>
              <span className="text-sm font-medium">{wsCount > 0 ? `${wsCount} active` : 'Idle'}</span>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Webhook Retry Statistics">
          {totalRetries === 0 ? (
            <EmptyState message="No webhook retry data yet" />
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: 'Pending', value: pendingRetries, fill: '#f59e0b' },
                  { name: 'Failed', value: failedRetries, fill: '#ef4444' },
                  { name: 'Resolved', value: resolvedRetries, fill: '#10b981' },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      <SectionHeader title="Scheduler Actions" description="Manually trigger maintenance tasks" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => handleTrigger(monitoringApi.triggerUsageAggregation, 'Usage aggregation')}
          disabled={triggering === 'Usage aggregation'}
          className="px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200/70 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors text-left"
        >
          <div className="font-semibold text-gray-900">Aggregate Usage</div>
          <div className="text-xs text-gray-500 mt-0.5">Roll up monthly usage metrics</div>
          {triggering === 'Usage aggregation' && <span className="text-indigo-600 text-xs mt-1 block">Processing...</span>}
        </button>
        <button
          onClick={() => handleTrigger(monitoringApi.triggerSubscriptionChecks, 'Subscription checks')}
          disabled={triggering === 'Subscription checks'}
          className="px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200/70 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors text-left"
        >
          <div className="font-semibold text-gray-900">Check Subscriptions</div>
          <div className="text-xs text-gray-500 mt-0.5">Expiry & past-due notifications</div>
          {triggering === 'Subscription checks' && <span className="text-indigo-600 text-xs mt-1 block">Processing...</span>}
        </button>
        <button
          onClick={() => handleTrigger(monitoringApi.triggerWebhookRetries, 'Webhook retries')}
          disabled={triggering === 'Webhook retries'}
          className="px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-200/70 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors text-left"
        >
          <div className="font-semibold text-gray-900">Retry Webhooks</div>
          <div className="text-xs text-gray-500 mt-0.5">Process failed webhook deliveries</div>
          {triggering === 'Webhook retries' && <span className="text-indigo-600 text-xs mt-1 block">Processing...</span>}
        </button>
      </div>

      <SectionHeader title="Tenant Performance" description="Top orgs by average query time (24h)" />
      {!tenantPerf || tenantPerf.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-8"><EmptyState message="No tenant performance data yet" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Org ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Avg Query Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Max Query Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Query Count</th>
                </tr>
              </thead>
              <tbody>
                {tenantPerf.map((org, i) => (
                  <tr key={org.org_id} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="py-3 px-4 font-medium text-gray-900">#{org.org_id}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${org.avg_query_time_ms > 500 ? 'bg-red-100 text-red-700' : org.avg_query_time_ms > 200 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {org.avg_query_time_ms}ms
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{org.max_query_time_ms}ms</td>
                    <td className="py-3 px-4 text-gray-600">{org.query_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminMonitoring;
