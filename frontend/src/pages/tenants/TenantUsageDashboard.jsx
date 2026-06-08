import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as tenantApi from '../../api/tenants';
import { getErrorMessage } from '../../utils/errorHandler';
import { formatTimestamp } from '../../utils/format';
import UsageCard from '../../components/tenants/UsageCard';
import UsageChart from '../../components/tenants/UsageChart';
import RecalculateButton from '../../components/tenants/RecalculateButton';

export default function TenantUsageDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tenantId = Number(id);

  const [tenant, setTenant] = useState(null);
  const [usage, setUsage] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tenantData, usageData, settingsData] = await Promise.all([
        tenantApi.getTenant(tenantId),
        tenantApi.getCollaborationUsage(tenantId),
        tenantApi.getCollaborationSettings(tenantId).catch(() => null),
      ]);
      setTenant(tenantData);
      setUsage(usageData);
      setSettings(settingsData);
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error('Tenant not found');
        navigate('/admin/tenants');
      } else {
        toast.error(getErrorMessage(err, 'Failed to load usage data'));
      }
    } finally {
      setLoading(false);
    }
  }, [tenantId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRecalculate = async () => {
    try {
      const result = await tenantApi.recalculateCollaborationUsage(tenantId);
      setUsage(result);
      toast.success('Usage recalculated successfully');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to recalculate usage'));
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="space-y-6">
          <div className="h-8 w-64 bg-gray-200/70 rounded-lg animate-pulse" />
          <div className="h-4 w-96 bg-gray-200/70 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="h-72 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  const cards = [
    {
      type: 'workspaces',
      label: 'Workspace Count',
      used: usage?.workspace_count ?? 0,
      limit: settings?.max_workspaces,
      suffix: '',
    },
    {
      type: 'channels',
      label: 'Channel Count',
      used: usage?.channel_count ?? 0,
      limit: settings?.max_channels_per_workspace,
      suffix: '',
    },
    {
      type: 'members',
      label: 'Member Count',
      used: usage?.member_count ?? 0,
      limit: settings?.max_workspace_members,
      suffix: '',
    },
    {
      type: 'storage',
      label: 'Storage Used',
      used: usage?.storage_used_mb ?? 0,
      limit: settings?.max_storage_mb,
      suffix: 'MB',
      format: (v) => (v % 1 === 0 ? v : v.toFixed(1)),
    },
  ];

  const chartItems = cards.map((c) => ({
    label: c.label.replace(' Count', '').replace(' Used', ''),
    used: c.type === 'storage' ? Math.round(c.used) : c.used,
    limit: c.limit || 0,
  }));

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/admin/tenants/${tenantId}/settings`)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div>
              <h1 className="page-title">Collaboration Usage</h1>
              <p className="page-subtitle">
                {tenant?.name} &middot; {tenant?.slug}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {usage?.last_calculated_at && (
            <span className="text-xs text-gray-400 hidden sm:block">
              Last updated: {formatTimestamp(usage.last_calculated_at)}
            </span>
          )}
          <RecalculateButton onRecalculate={handleRecalculate} lastCalculated={usage?.last_calculated_at} />
          <button
            onClick={() => navigate(`/admin/tenants/${tenantId}/settings`)}
            className="btn-secondary"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
        </div>
      </div>

      {usage?.last_calculated_at && (
        <div className="sm:hidden mb-4 text-xs text-gray-400 text-center">
          Last updated: {formatTimestamp(usage.last_calculated_at)}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => (
          <UsageCard
            key={card.type}
            type={card.type}
            label={card.label}
            used={card.used}
            limit={card.limit}
            suffix={card.suffix}
            format={card.format}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-900">Usage vs Limit</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Current resource consumption compared to allocated limits
            </p>
          </div>
          <div className="card-body">
            {settings ? (
              <UsageChart data={chartItems} compact={false} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-3 rounded-full bg-gray-100 mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m-2-8h.01M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">No limit configuration</p>
                <p className="text-xs text-gray-400 mt-1">Set collaboration limits in Settings to see this chart</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-900">Resource Breakdown</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Per-resource utilization percentage
            </p>
          </div>
          <div className="card-body">
            {settings ? (
              <UsageChart data={chartItems} compact />
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-3 rounded-full bg-gray-100 mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m-2-8h.01M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">No limit configuration</p>
                <p className="text-xs text-gray-400 mt-1">Set collaboration limits in Settings to see breakdown</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-900">Usage Details</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Raw usage data for this tenant
          </p>
        </div>
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Metric</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Current</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Limit</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cards.map((card) => {
                  const val = card.type === 'storage' ? (card.used % 1 === 0 ? card.used : card.used.toFixed(1)) : card.used;
                  const limit = card.limit !== undefined ? card.limit : '-';
                  const pct = card.limit > 0 ? Math.round((card.used / card.limit) * 100) : 0;
                  return (
                    <tr key={card.type} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{card.label}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right tabular-nums">
                        {val}{card.suffix}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right tabular-nums">
                        {limit}{card.suffix}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {card.limit > 0 ? (
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                            pct >= 90 ? 'bg-red-50 text-red-700' : pct >= 70 ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-indigo-500'
                            }`} />
                            {pct}%
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {usage?.last_calculated_at && (
            <p className="text-[10px] text-gray-400 text-center mt-4">
              Last calculated: {formatTimestamp(usage.last_calculated_at)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
