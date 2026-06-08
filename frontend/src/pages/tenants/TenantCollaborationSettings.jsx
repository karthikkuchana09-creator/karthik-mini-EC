import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as tenantApi from '../../api/tenants';
import { getErrorMessage } from '../../utils/errorHandler';
import { formatTimestamp } from '../../utils/format';
import ToggleSwitch from '../../components/common/ToggleSwitch';
import NumberInput from '../../components/tenants/NumberInput';
import SettingsCard from '../../components/tenants/SettingsCard';

const SETTINGS_FIELDS = [
  {
    key: 'max_workspaces',
    label: 'Max Workspaces',
    description: 'Maximum number of workspaces this tenant can create',
    icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
    suffix: 'workspaces',
  },
  {
    key: 'max_channels_per_workspace',
    label: 'Max Channels Per Workspace',
    description: 'Maximum channels allowed within each workspace',
    icon: 'M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75',
    suffix: 'channels',
  },
  {
    key: 'max_workspace_members',
    label: 'Max Workspace Members',
    description: 'Maximum members that can be added to a workspace',
    icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
    suffix: 'members',
  },
  {
    key: 'max_storage_mb',
    label: 'Max Storage (MB)',
    description: 'Total storage capacity allocated to this tenant',
    icon: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
    suffix: 'MB',
  },
];

const TOGGLE_FIELDS = [
  {
    key: 'workspace_enabled',
    label: 'Workspaces Enabled',
    description: 'Allow this tenant to create and manage workspaces',
  },
  {
    key: 'channel_enabled',
    label: 'Channels Enabled',
    description: 'Allow this tenant to create channels within workspaces',
  },
];

export default function TenantCollaborationSettings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tenantId = Number(id);

  const [tenant, setTenant] = useState(null);
  const [settings, setSettings] = useState(null);
  const [usage, setUsage] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tenantData, settingsData, usageData] = await Promise.all([
        tenantApi.getTenant(tenantId),
        tenantApi.getCollaborationSettings(tenantId),
        tenantApi.getCollaborationUsage(tenantId).catch(() => null),
      ]);
      setTenant(tenantData);
      setSettings(settingsData);
      setUsage(usageData);
      setForm({
        max_workspaces: settingsData.max_workspaces,
        max_channels_per_workspace: settingsData.max_channels_per_workspace,
        max_workspace_members: settingsData.max_workspace_members,
        max_storage_mb: settingsData.max_storage_mb,
        workspace_enabled: settingsData.workspace_enabled,
        channel_enabled: settingsData.channel_enabled,
      });
      setDirty(false);
      setErrors({});
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error('Tenant not found');
        navigate('/admin/tenants');
      } else {
        toast.error(getErrorMessage(err, 'Failed to load settings'));
      }
    } finally {
      setLoading(false);
    }
  }, [tenantId, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleNumberChange = (key) => (val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setDirty(true);
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleToggleChange = (key) => (val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const validate = () => {
    const newErrors = {};
    SETTINGS_FIELDS.forEach((field) => {
      const val = form[field.key];
      if (val === undefined || val === null || val === '') {
        newErrors[field.key] = 'Value is required';
      } else if (Number(val) < 1) {
        newErrors[field.key] = 'Must be greater than 0';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Please fix the validation errors');
      return;
    }
    setSaving(true);
    try {
      const payload = {};
      SETTINGS_FIELDS.forEach((f) => {
        payload[f.key] = Number(form[f.key]);
      });
      TOGGLE_FIELDS.forEach((f) => {
        payload[f.key] = Boolean(form[f.key]);
      });
      const updated = await tenantApi.updateCollaborationSettings(tenantId, payload);
      setSettings(updated);
      setDirty(false);
      toast.success('Collaboration settings updated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = async () => {
    try {
      const result = await tenantApi.recalculateCollaborationUsage(tenantId);
      setUsage(result);
      toast.success('Usage recalculated');
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/tenants')}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div>
              <h1 className="page-title">Collaboration Settings</h1>
              <p className="page-subtitle">
                {tenant?.name} &middot; {tenant?.slug}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRecalculate} className="btn-secondary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
            </svg>
            Recalculate Usage
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="btn-primary"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shrink-0">
                <span className="text-white font-bold text-lg">
                  {tenant?.name?.charAt(0)?.toUpperCase() || 'T'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-bold text-gray-900">{tenant?.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  ID: #{tenant?.id} &middot; Slug: {tenant?.slug} &middot; Status: {tenant?.status} &middot; Created: {tenant?.created_at ? formatTimestamp(tenant.created_at) : '-'}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                tenant?.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : tenant?.status === 'SUSPENDED'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  tenant?.status === 'ACTIVE' ? 'bg-emerald-500' : tenant?.status === 'SUSPENDED' ? 'bg-red-500' : 'bg-gray-400'
                }`} />
                {tenant?.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {SETTINGS_FIELDS.map((field) => {
          const usageKey = field.key === 'max_storage_mb' ? 'storage_used_mb' : field.key === 'max_channels_per_workspace' ? 'channel_count' : field.key === 'max_workspace_members' ? 'member_count' : 'workspace_count';
          return (
            <SettingsCard
              key={field.key}
              icon={field.icon}
              title={field.label}
              description={field.description}
              limit={settings?.[field.key]}
              usage={usage?.[usageKey]}
              usageLabel="Current"
            >
              <NumberInput
                label="Set Limit"
                value={form[field.key]}
                onChange={handleNumberChange(field.key)}
                min={1}
                suffix={field.suffix}
                error={errors[field.key]}
              />
            </SettingsCard>
          );
        })}
      </div>

      <div className="card mb-6">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-900">Feature Toggles</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Enable or disable collaboration features for this tenant
          </p>
        </div>
        <div className="card-body space-y-5">
          {TOGGLE_FIELDS.map((field) => (
            <ToggleSwitch
              key={field.key}
              label={field.label}
              description={field.description}
              checked={!!form[field.key]}
              onChange={handleToggleChange(field.key)}
              size="md"
            />
          ))}
        </div>
        {dirty && (
          <div className="card-footer flex justify-between items-center">
            <p className="text-xs text-amber-600 font-medium">
              You have unsaved changes
            </p>
            <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm">
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-900">Usage Overview</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Current resource consumption vs limits
          </p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <UsageStat label="Workspaces" used={usage?.workspace_count ?? 0} limit={settings?.max_workspaces ?? 0} />
            <UsageStat label="Channels" used={usage?.channel_count ?? 0} limit={settings?.max_channels_per_workspace ?? 0} />
            <UsageStat label="Members" used={usage?.member_count ?? 0} limit={settings?.max_workspace_members ?? 0} />
            <UsageStat label="Storage" used={`${(usage?.storage_used_mb ?? 0).toFixed(1)} MB`} limit={`${settings?.max_storage_mb ?? 0} MB`} numeric={false} />
          </div>
          {usage?.last_calculated_at && (
            <p className="text-[10px] text-gray-400 mt-4 text-center">
              Last calculated: {formatTimestamp(usage.last_calculated_at)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function UsageStat({ label, used, limit, numeric = true }) {
  const pct = numeric && Number(limit) > 0
    ? Math.min(100, Math.round((Number(used) / Number(limit)) * 100))
    : 0;

  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-indigo-500';

  return (
    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-1 tabular-nums">
        {used}
        {numeric && <span className="text-xs font-medium text-gray-400 ml-1">/ {limit}</span>}
      </p>
      {numeric && Number(limit) > 0 && (
        <>
          <div className="w-full h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">{pct}% utilized</p>
        </>
      )}
    </div>
  );
}
