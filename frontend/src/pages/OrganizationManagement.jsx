import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as orgApi from '../api/organization';
import Tabs from '../components/ui/Tabs';
import Modal from '../components/ui/Modal';
import { SkeletonCard, SkeletonChart } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import EmptyState from '../components/ui/EmptyState';
import { getErrorMessage } from '../utils/errorHandler';
import { formatTimestamp, formatDate } from '../utils/format';
import toast from 'react-hot-toast';

// ─── Plan display helpers ───
const PLAN_GRADIENTS = {
  free: 'from-gray-400 to-gray-500',
  starter: 'from-blue-500 to-blue-600',
  business: 'from-indigo-500 to-indigo-600',
  enterprise: 'from-violet-500 to-violet-800',
};

const PLAN_COLORS = {
  basic: 'bg-gray-100 text-gray-800 border-gray-300',
  silver: 'bg-blue-100 text-blue-800 border-blue-300',
  gold: 'bg-amber-100 text-amber-800 border-amber-300',
};

const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  trialing: 'bg-blue-100 text-blue-800 border-blue-300',
  past_due: 'bg-red-100 text-red-800 border-red-300',
  canceled: 'bg-gray-100 text-gray-600 border-gray-300',
  expired: 'bg-gray-100 text-gray-600 border-gray-300',
};

const INVOICE_STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600 border-gray-300',
  issued: 'bg-blue-100 text-blue-800 border-blue-300',
  paid: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
  refunded: 'bg-amber-100 text-amber-800 border-amber-300',
};

// ─── Loading Skeleton ───
function PageSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="h-8 w-64 bg-gray-200/70 rounded-lg animate-pulse" />
      <div className="h-4 w-96 bg-gray-200/70 rounded-lg animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <SkeletonChart />
    </div>
  );
}

// ─── Stat Card ───
function StatCard({ title, value, gradient, icon, desc }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-md transition-shadow p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">{title}</p>
          <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">{value}</p>
          {desc && <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md shrink-0 ml-3`}>
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Badge ───
function Badge({ label, colorClass }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {label}
    </span>
  );
}

// ════════════════════════════════════════════════
// TAB 1: Overview
// ════════════════════════════════════════════════
function OverviewTab({ org, orgSettings, subscription, usage, loading }) {
  if (loading) return <SkeletonChart />;
  if (!org) return <EmptyState title="No organization data" />;

  const plan = org.subscription_plan || 'free';
  const sub = subscription?.subscription || {};
  const planDetail = subscription?.plan || {};
  const limits = subscription?.limits || {};
  const usageData = subscription?.usage || {};
  const creditSummary = usage?.credit_usage?.account || {};
  const aiUsage = usage?.ai_usage || {};
  const apiUsage = usage?.api_usage || {};

  const userPct = limits.max_users ? Math.round(((usageData.total_users || 0) / limits.max_users) * 100) : 0;
  const storagePct = limits.max_storage_mb ? Math.round(((usageData.storage_mb || 0) / limits.max_storage_mb) * 100) : 0;
  const taskPct = limits.max_tasks ? Math.round(((usageData.total_tasks || 0) / limits.max_tasks) * 100) : 0;
  const creditPct = creditSummary.total_credits ? Math.round(((creditSummary.used_credits || 0) / creditSummary.total_credits) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Org Info */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${PLAN_GRADIENTS[plan] || PLAN_GRADIENTS.free} flex items-center justify-center shadow-lg shrink-0`}>
              <span className="text-white font-bold text-lg">{org.name?.[0]?.toUpperCase() || 'O'}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{org.name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">slug: {org.slug} &middot; ID: {org.id}</p>
            </div>
          </div>
          <Badge label={plan} colorClass={PLAN_COLORS[plan] || PLAN_COLORS.basic} />
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
          <div><p className="text-[10px] text-gray-400 font-medium">Created</p><p className="text-xs font-semibold text-gray-700 mt-0.5">{formatTimestamp(org.created_at)}</p></div>
          <div><p className="text-[10px] text-gray-400 font-medium">Status</p><p className="text-xs font-semibold text-gray-700 mt-0.5">{org.is_active ? 'Active' : 'Inactive'}</p></div>
          {orgSettings && (
            <>
              <div><p className="text-[10px] text-gray-400 font-medium">Timezone</p><p className="text-xs font-semibold text-gray-700 mt-0.5">{orgSettings.timezone || 'UTC'}</p></div>
              <div><p className="text-[10px] text-gray-400 font-medium">Max Users</p><p className="text-xs font-semibold text-gray-700 mt-0.5">{orgSettings.max_users || '-'}</p></div>
            </>
          )}
        </div>
      </div>

      {/* Usage Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Used Credits" value={`${creditSummary.used_credits || 0} / ${creditSummary.total_credits || 0}`} gradient="from-indigo-500 to-indigo-600" icon="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" desc={`${creditPct}% consumed`} />
        <StatCard title="Users" value={`${usageData.total_users || 0} / ${limits.max_users || '∞'}`} gradient="from-blue-500 to-blue-600" icon="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" desc={`${userPct}% of limit`} />
        <StatCard title="Tasks" value={`${usageData.total_tasks || 0} / ${limits.max_tasks || '∞'}`} gradient="from-amber-500 to-amber-600" icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" desc={`${taskPct}% of limit`} />
        <StatCard title="Storage" value={`${(usageData.storage_mb || 0).toFixed(1)} MB / ${limits.max_storage_mb || '∞'} MB`} gradient="from-cyan-500 to-cyan-600" icon="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" desc={`${storagePct}% of limit`} />
      </div>

      {/* Plan + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Current Plan</h3>
          {sub.status ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-bold text-gray-900">{planDetail.name || plan}</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{sub.billing_interval || 'monthly'} billing</p>
                </div>
                <Badge label={sub.status} colorClass={STATUS_COLORS[sub.status] || STATUS_COLORS.active} />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">Period Start</p>
                  <p className="text-xs font-semibold text-gray-700 mt-0.5">{formatTimestamp(sub.current_period_start)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">Period End</p>
                  <p className="text-xs font-semibold text-gray-700 mt-0.5">{formatTimestamp(sub.current_period_end)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">Days Remaining</p>
                  <p className="text-xs font-semibold text-gray-700 mt-0.5">{sub.days_remaining ?? 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">Auto Renew</p>
                  <p className="text-xs font-semibold text-gray-700 mt-0.5">{sub.auto_renew ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title="No active subscription" message="Upgrade to unlock premium features" />
          )}
        </div>
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-500">AI Analyses</span><span className="font-semibold text-gray-900">{(aiUsage.total_queries || 0).toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">API Calls (30d)</span><span className="font-semibold text-gray-900">{(apiUsage.total_calls_30d || 0).toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Storage Files</span><span className="font-semibold text-gray-900">{(usageData.total_documents || 0).toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Active Users</span><span className="font-semibold text-gray-900">{(usageData.active_users || 0).toLocaleString()}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// TAB 2: Settings
// ════════════════════════════════════════════════
function SettingsTab({ org, orgSettings, onRefresh }) {
  const [form, setForm] = useState({ name: '', logo: '' });
  const [settingsForm, setSettingsForm] = useState({
    primary_color: '', secondary_color: '', logo_url: '', favicon_url: '',
    company_address: '', timezone: '', date_format: '', max_users: '', max_storage_gb: '',
  });
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (org) setForm({ name: org.name || '', logo: org.logo || '' });
  }, [org]);

  useEffect(() => {
    if (orgSettings) {
      setSettingsForm({
        primary_color: orgSettings.primary_color || '',
        secondary_color: orgSettings.secondary_color || '',
        logo_url: orgSettings.logo_url || '',
        favicon_url: orgSettings.favicon_url || '',
        company_address: orgSettings.company_address || '',
        timezone: orgSettings.timezone || '',
        date_format: orgSettings.date_format || '',
        max_users: orgSettings.max_users ?? '',
        max_storage_gb: orgSettings.max_storage_gb ?? '',
      });
    }
  }, [orgSettings]);

  const handleSaveOrg = async () => {
    if (!form.name.trim()) { toast.error('Organization name is required'); return; }
    setSaving(true);
    try {
      await orgApi.updateOrganization(org.id, { name: form.name.trim(), logo: form.logo.trim() || null });
      toast.success('Organization updated');
      onRefresh();
    } catch (err) { toast.error(getErrorMessage(err, 'Failed to update organization')); }
    finally { setSaving(false); }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await orgApi.updateOrgSettings(org.id, {
        ...settingsForm,
        max_users: settingsForm.max_users ? Number(settingsForm.max_users) : null,
        max_storage_gb: settingsForm.max_storage_gb ? Number(settingsForm.max_storage_gb) : null,
      });
      toast.success('Settings saved');
      onRefresh();
    } catch (err) { toast.error(getErrorMessage(err, 'Failed to save settings')); }
    finally { setSavingSettings(false); }
  };

  const handleChange = (setter) => (e) => {
    const { name, value } = e.target;
    setter((prev) => ({ ...prev, [name]: value }));
  };

  if (!org) return <EmptyState title="Loading..." />;

  return (
    <div className="space-y-6">
      {/* Org Info */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Organization Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
            <input name="name" value={form.name} onChange={handleChange(setForm)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="Org name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Slug (read-only)</label>
            <input value={org.slug || ''} disabled className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Logo URL</label>
            <input name="logo" value={form.logo} onChange={handleChange(setForm)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" placeholder="https://example.com/logo.png" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={handleSaveOrg} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Branding & Settings */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Branding & Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Primary Color</label>
            <div className="flex gap-2">
              <input name="primary_color" value={settingsForm.primary_color} onChange={handleChange(setSettingsForm)} className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono" placeholder="#4f46e5" />
              {settingsForm.primary_color && <div className="w-9 h-9 rounded-lg border border-gray-200 shrink-0" style={{ backgroundColor: settingsForm.primary_color }} />}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Secondary Color</label>
            <div className="flex gap-2">
              <input name="secondary_color" value={settingsForm.secondary_color} onChange={handleChange(setSettingsForm)} className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono" placeholder="#7c3aed" />
              {settingsForm.secondary_color && <div className="w-9 h-9 rounded-lg border border-gray-200 shrink-0" style={{ backgroundColor: settingsForm.secondary_color }} />}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Logo URL (branding)</label>
            <input name="logo_url" value={settingsForm.logo_url} onChange={handleChange(setSettingsForm)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-indigo-500 outline-none transition-all" placeholder="https://example.com/brand-logo.png" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Favicon URL</label>
            <input name="favicon_url" value={settingsForm.favicon_url} onChange={handleChange(setSettingsForm)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-indigo-500 outline-none transition-all" placeholder="https://example.com/favicon.ico" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Company Address</label>
            <textarea name="company_address" value={settingsForm.company_address} onChange={handleChange(setSettingsForm)} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-indigo-500 outline-none transition-all resize-none" placeholder="123 Business St, City, Country" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Timezone</label>
            <input name="timezone" value={settingsForm.timezone} onChange={handleChange(setSettingsForm)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-indigo-500 outline-none transition-all" placeholder="UTC" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date Format</label>
            <input name="date_format" value={settingsForm.date_format} onChange={handleChange(setSettingsForm)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-indigo-500 outline-none transition-all" placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Max Users</label>
            <input name="max_users" value={settingsForm.max_users} onChange={handleChange(setSettingsForm)} type="number" min="0" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-indigo-500 outline-none transition-all" placeholder="Unlimited" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Max Storage (GB)</label>
            <input name="max_storage_gb" value={settingsForm.max_storage_gb} onChange={handleChange(setSettingsForm)} type="number" min="0" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-indigo-500 outline-none transition-all" placeholder="Unlimited" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={handleSaveSettings} disabled={savingSettings} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm">
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
// TAB 3: Members
// ════════════════════════════════════════════════
function MembersTab({ orgId, onRefresh }) {
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviting, setInviting] = useState(false);
  const [page, setPage] = useState(1);
  const size = 10;

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await orgApi.getMembers({ page, size, sort_by: 'created_at', sort_order: 'desc' });
      setMembers(data.items || []);
      setTotal(data.total || 0);
    } catch (err) { toast.error(getErrorMessage(err, 'Failed to load members')); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { toast.error('Email is required'); return; }
    setInviting(true);
    try {
      await orgApi.createInvitation(orgId, { email: inviteEmail.trim(), role: inviteRole });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setShowInvite(false);
      setInviteEmail('');
    } catch (err) { toast.error(getErrorMessage(err, 'Failed to send invitation')); }
    finally { setInviting(false); }
  };

  const handleToggleActive = async (userId, currentActive) => {
    try {
      await orgApi.toggleMemberActive(userId);
      toast.success(`User ${currentActive ? 'deactivated' : 'activated'}`);
      fetchMembers();
    } catch (err) { toast.error(getErrorMessage(err, 'Failed to toggle user status')); }
  };

  const totalPages = Math.ceil(total / size);

  if (loading && members.length === 0) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{total} member{total !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowInvite(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Invite Member
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Role</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.name || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{m.email}</td>
                <td className="px-4 py-3">
                  <Badge label={m.role} colorClass={m.role === 'admin' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : m.role === 'manager' ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-gray-100 text-gray-700 border-gray-300'} />
                </td>
                <td className="px-4 py-3">
                  <Badge label={m.is_active ? 'Active' : 'Inactive'} colorClass={m.is_active ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300'} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleToggleActive(m.id, m.is_active)} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                    {m.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12"><EmptyState title="No members found" /></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-all">Previous</button>
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-all">Next</button>
        </div>
      )}

      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite Member" size="md">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email Address</label>
              <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} type="email" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none" placeholder="colleague@company.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowInvite(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
            <button onClick={handleInvite} disabled={inviting} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all">
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════
// TAB 4: Subscription
// ════════════════════════════════════════════════
function SubscriptionTab({ onRefresh }) {
  const [plans, setPlans] = useState([]);
  const [current, setCurrent] = useState(null);
  const [features, setFeatures] = useState(null);
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectedTier, setSelectedTier] = useState('');
  const [selectedInterval, setSelectedInterval] = useState('monthly');
  const [upgrading, setUpgrading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansData, subData, featuresData, billingData] = await Promise.all([
        orgApi.getPlans(),
        orgApi.getCurrentSubscription(),
        orgApi.getSubscriptionFeatures(),
        orgApi.getBillingHistory({ page: 1, size: 5 }),
      ]);
      setPlans(Array.isArray(plansData) ? plansData : []);
      setCurrent(subData);
      setFeatures(featuresData);
      setBillingHistory(Array.isArray(billingData) ? billingData : []);
    } catch (err) { toast.error(getErrorMessage(err, 'Failed to load subscription data')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentPlan = current?.plan || {};
  const currentTier = currentPlan.tier || features?.plan_tier || '';
  const sub = current?.subscription || {};

  const handleUpgrade = async () => {
    if (!selectedTier) { toast.error('Select a plan'); return; }
    setUpgrading(true);
    try {
      await orgApi.upgradeSubscription({ plan_tier: selectedTier, billing_interval: selectedInterval });
      toast.success(`Upgraded to ${selectedTier}`);
      setShowUpgrade(false);
      fetchData();
      if (onRefresh) onRefresh();
    } catch (err) { toast.error(getErrorMessage(err, 'Upgrade failed')); }
    finally { setUpgrading(false); }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) return;
    try {
      await orgApi.cancelSubscription({ reason: 'User requested cancellation', immediate: false });
      toast.success('Subscription cancelled');
      fetchData();
    } catch (err) { toast.error(getErrorMessage(err, 'Cancel failed')); }
  };

  if (loading) return <SkeletonChart />;

  const limits = features?.limits || {};
  const featFlags = features?.features || {};
  const usage = features?.usage || {};

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-900">{currentPlan.name || currentTier || 'Free'}</h3>
              <Badge label={sub.status || 'active'} colorClass={STATUS_COLORS[sub.status] || STATUS_COLORS.active} />
            </div>
            <p className="text-xs text-gray-400 mt-1 capitalize">{sub.billing_interval || 'monthly'} billing &middot; ₹{currentPlan[`price_${sub.billing_interval || 'monthly'}`] || 0}/mo</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowUpgrade(true)} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-sm">Change Plan</button>
            {sub.status === 'active' && (
              <button onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 transition-all">Cancel</button>
            )}
          </div>
        </div>
        {sub.current_period_end && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-6 text-sm">
            <div><span className="text-gray-400">Period: </span><span className="font-medium text-gray-700">{formatTimestamp(sub.current_period_start)} - {formatTimestamp(sub.current_period_end)}</span></div>
            <div><span className="text-gray-400">Days left: </span><span className="font-medium text-gray-700">{sub.days_remaining ?? 'N/A'}</span></div>
            <div><span className="text-gray-400">Auto-renew: </span><span className="font-medium text-gray-700">{sub.auto_renew ? 'Yes' : 'No'}</span></div>
          </div>
        )}
      </div>

      {/* Feature Access */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Feature Access & Limits</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(featFlags).map(([key, val]) => (
            <div key={key} className={`p-3 rounded-xl border ${val ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className="text-xs font-medium text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
              <p className={`text-sm font-bold mt-0.5 ${val ? 'text-emerald-700' : 'text-gray-400'}`}>{val ? 'Enabled' : 'Disabled'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Usage vs Limits */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Usage vs Limits</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[{ key: 'users', label: 'Users', used: usage.total_users, max: limits.max_users },
            { key: 'tasks', label: 'Tasks', used: usage.total_tasks, max: limits.max_tasks },
            { key: 'ai_queries', label: 'AI Queries', used: usage.ai_queries, max: limits.max_ai_queries },
            { key: 'storage_mb', label: 'Storage (MB)', used: usage.storage_mb, max: limits.max_storage_mb },
          ].map((item) => {
            const pct = item.max ? Math.min(100, Math.round(((item.used || 0) / item.max) * 100)) : 0;
            return (
              <div key={item.key}>
                <div className="flex justify-between text-xs mb-1"><span className="text-gray-500">{item.label}</span><span className="font-semibold text-gray-700">{item.used || 0} / {item.max || '∞'}</span></div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Available Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.filter((p) => p.is_active !== false).map((plan) => {
          const isCurrent = plan.tier === currentTier;
          const price = plan[`price_${selectedInterval}`] || 0;
          return (
            <div key={plan.id} className={`bg-white rounded-2xl border-2 shadow-sm p-5 transition-all ${isCurrent ? 'border-indigo-500 shadow-indigo-100' : 'border-gray-200 hover:border-indigo-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-gray-900">{plan.name}</h4>
                {isCurrent && <Badge label="Current" colorClass="bg-indigo-100 text-indigo-800 border-indigo-300" />}
              </div>
              <p className="text-2xl font-bold text-gray-900">₹{price}<span className="text-xs font-medium text-gray-400">/{selectedInterval === 'monthly' ? 'mo' : 'yr'}</span></p>
              <p className="text-xs text-gray-400 mt-1">{plan.description || ''}</p>
              <div className="mt-4 space-y-1.5">
                <FeatureRow label={`${plan.max_users} Users`} enabled />
                <FeatureRow label={`${plan.max_tasks} Tasks`} enabled />
                <FeatureRow label={`${plan.max_ai_queries} AI Queries`} enabled />
                <FeatureRow label={`${plan.max_storage_mb} MB Storage`} enabled />
                <FeatureRow label="Analytics" enabled={plan.has_analytics} />
                <FeatureRow label="AI Intelligence" enabled={plan.has_ai_intelligence} />
                <FeatureRow label="API Access" enabled={plan.has_api_access} />
                <FeatureRow label="Audit Trail" enabled={plan.has_audit_trail} />
                <FeatureRow label="Custom Branding" enabled={plan.has_custom_branding} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Billing History */}
      {billingHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Billing Events</h3>
          <div className="space-y-2">
            {billingHistory.map((evt) => (
              <div key={evt.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 capitalize">{evt.event_type?.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-400">{evt.description || ''} &middot; {formatTimestamp(evt.created_at)}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">{evt.amount ? `₹${(evt.amount / 100).toFixed(2)}` : '-'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      <Modal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} title="Change Plan" size="lg">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Target Plan</label>
              <select value={selectedTier} onChange={(e) => setSelectedTier(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">
                <option value="">Select plan...</option>
                {plans.filter((p) => p.is_active !== false).map((p) => (
                  <option key={p.tier} value={p.tier}>{p.name} ({p.tier})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Billing Interval</label>
              <div className="flex gap-2">
                <button onClick={() => setSelectedInterval('monthly')} className={`flex-1 px-4 py-2 text-sm font-medium rounded-xl border transition-all ${selectedInterval === 'monthly' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-200'}`}>Monthly</button>
                <button onClick={() => setSelectedInterval('yearly')} className={`flex-1 px-4 py-2 text-sm font-medium rounded-xl border transition-all ${selectedInterval === 'yearly' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-200'}`}>Yearly</button>
              </div>
            </div>
          </div>
          {selectedTier && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600">
                {selectedTier} plan &middot; {selectedInterval} billing
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowUpgrade(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">Cancel</button>
            <button onClick={handleUpgrade} disabled={!selectedTier || upgrading} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all">
              {upgrading ? 'Processing...' : 'Confirm Change'}
            </button>
          </div>
      </Modal>
    </div>
  );
}

function FeatureRow({ label, enabled }) {
  return (
    <div className="flex items-center gap-2">
      <svg className={`w-3.5 h-3.5 shrink-0 ${enabled ? 'text-emerald-500' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d={enabled ? 'M4.5 12.75l6 6 9-13.5' : 'M6 18L18 6M6 6l12 12'} />
      </svg>
      <span className={`text-xs ${enabled ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
    </div>
  );
}

// ════════════════════════════════════════════════
// TAB 5: Billing
// ════════════════════════════════════════════════
function BillingTab() {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('invoices');
  const [page, setPage] = useState(1);
  const size = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invData, payData] = await Promise.all([
        orgApi.getInvoices({ page, size }),
        orgApi.getPaymentHistory({ page: 1, size: 10 }),
      ]);
      setInvoices(invData.items || []);
      setInvoiceTotal(invData.total || 0);
      setPayments(payData.items || []);
    } catch (err) { toast.error(getErrorMessage(err, 'Failed to load billing data')); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(invoiceTotal / size);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setTab('invoices')} className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${tab === 'invoices' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-200'}`}>Invoices</button>
        <button onClick={() => setTab('payments')} className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${tab === 'payments' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-200'}`}>Payment History</button>
      </div>

      {tab === 'invoices' && (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Invoice #</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Date</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{inv.invoice_type?.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3"><Badge label={inv.status} colorClass={INVOICE_STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600 border-gray-300'} /></td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">₹{(inv.total_amount / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">{inv.created_at ? formatDate(inv.created_at) : '-'}</td>
                  <td className="px-4 py-3 text-right">
                    {inv.status === 'paid' || inv.status === 'issued' ? (
                      <a href={orgApi.getInvoicePdfUrl(inv.id)} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">Download</a>
                    ) : '-'}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12"><EmptyState title="No invoices" message="Invoices will appear after your first payment" /></td></tr>
              )}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4 border-t border-gray-100">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Previous</button>
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>
      )}

      {tab === 'payments' && (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Order ID</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-gray-900 text-xs">{p.razorpay_order_id || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{p.payment_type?.replace(/_/g, ' ') || '-'}</td>
                  <td className="px-4 py-3"><Badge label={p.status} colorClass={STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600 border-gray-300'} /></td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">₹{(p.amount / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 text-right">{p.created_at ? formatDate(p.created_at) : '-'}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12"><EmptyState title="No payments yet" /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
// TAB 6: Usage
// ════════════════════════════════════════════════
function UsageTab() {
  const [credits, setCredits] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txnTotal, setTxnTotal] = useState(0);
  const [usage, setUsage] = useState(null);
  const [creditCosts, setCreditCosts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [txnPage, setTxnPage] = useState(1);
  const txnSize = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [creditsData, txnsData, usageData, costsData] = await Promise.all([
        orgApi.getCreditBalance(),
        orgApi.getCreditTransactions({ page: txnPage, size: txnSize }),
        orgApi.getUsageAnalytics(),
        orgApi.getCreditCosts(),
      ]);
      setCredits(creditsData);
      setTransactions(txnsData.items || txnsData.transactions || []);
      setTxnTotal(txnsData.total || 0);
      setUsage(usageData);
      setCreditCosts(costsData);
    } catch (err) { toast.error(getErrorMessage(err, 'Failed to load usage data')); }
    finally { setLoading(false); }
  }, [txnPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <SkeletonChart />;

  const creditAccount = credits?.account || credits || {};
  const recentTxns = (credits?.recent_transactions || transactions).slice(0, 10);
  const txnTotalPages = Math.ceil(txnTotal / txnSize);

  return (
    <div className="space-y-6">
      {/* Credit Balance */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Credit Balance</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <p className="text-xs font-medium text-indigo-600">Total</p>
            <p className="text-2xl font-bold text-indigo-700 mt-1">{(creditAccount.total_credits || 0).toLocaleString()}</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-xs font-medium text-amber-600">Used</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{(creditAccount.used_credits || 0).toLocaleString()}</p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-xs font-medium text-emerald-600">Remaining</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{(creditAccount.remaining_credits || 0).toLocaleString()}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs font-medium text-gray-500">Usage</p>
            <p className="text-2xl font-bold text-gray-700 mt-1">{creditAccount.usage_pct ?? ((creditAccount.total_credits > 0) ? Math.round(((creditAccount.used_credits || 0) / creditAccount.total_credits) * 100) : 0)}%</p>
          </div>
        </div>
        <div className="mt-4 w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-400 transition-all" style={{ width: `${creditAccount.usage_pct || 0}%` }} />
        </div>
      </div>

      {/* Credit Costs per Feature */}
      {creditCosts?.credit_costs && (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Credit Costs per Feature</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {Object.entries(creditCosts.credit_costs).map(([feature, cost]) => (
              <div key={feature} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-600 capitalize truncate mr-2">{feature.replace(/_/g, ' ')}</span>
                <span className="text-xs font-bold text-indigo-600">{cost}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Recent Transactions</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Feature</th>
              <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Type</th>
              <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Credits</th>
              <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Balance</th>
              <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {recentTxns.map((txn) => (
              <tr key={txn.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-900 capitalize">{txn.feature?.replace(/_/g, ' ') || '-'}</td>
                <td className="px-4 py-3"><Badge label={txn.transaction_type} colorClass={txn.transaction_type === 'deduction' ? 'bg-red-100 text-red-800 border-red-300' : txn.transaction_type === 'purchase' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-blue-100 text-blue-800 border-blue-300'} /></td>
                <td className="px-4 py-3 text-sm font-semibold text-right" style={{ color: txn.credits_used > 0 ? '#dc2626' : '#059669' }}>{txn.credits_used > 0 ? `-${txn.credits_used}` : `+${Math.abs(txn.credits_used || 0)}`}</td>
                <td className="px-4 py-3 text-sm text-gray-600 text-right">{txn.balance_after}</td>
                <td className="px-4 py-3 text-sm text-gray-400 text-right">{txn.created_at ? formatDate(txn.created_at) : '-'}</td>
              </tr>
            ))}
            {recentTxns.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12"><EmptyState title="No transactions yet" /></td></tr>
            )}
          </tbody>
        </table>
        {txnTotalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4 border-t border-gray-100">
            <button disabled={txnPage <= 1} onClick={() => setTxnPage((p) => p - 1)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Previous</button>
            <span className="text-xs text-gray-500">Page {txnPage} of {txnTotalPages}</span>
            <button disabled={txnPage >= txnTotalPages} onClick={() => setTxnPage((p) => p + 1)} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {/* Usage Analytics Summary */}
      {usage && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
            <h4 className="text-xs font-semibold text-gray-900 mb-3">Storage</h4>
            {usage.storage_usage ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs"><span className="text-gray-500">Files</span><span className="font-semibold">{(usage.storage_usage.total_files || 0).toLocaleString()}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-500">Storage</span><span className="font-semibold">{((usage.storage_usage.total_size_bytes || 0) / (1024 * 1024)).toFixed(1)} MB</span></div>
              </div>
            ) : <p className="text-xs text-gray-400">No data</p>}
          </div>
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
            <h4 className="text-xs font-semibold text-gray-900 mb-3">API</h4>
            {usage.api_usage ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs"><span className="text-gray-500">30-day calls</span><span className="font-semibold">{(usage.api_usage.total_calls_30d || 0).toLocaleString()}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-500">Endpoints</span><span className="font-semibold">{(usage.api_usage.top_endpoints?.length || 0)}</span></div>
              </div>
            ) : <p className="text-xs text-gray-400">No data</p>}
          </div>
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
            <h4 className="text-xs font-semibold text-gray-900 mb-3">AI</h4>
            {usage.ai_usage ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs"><span className="text-gray-500">Total queries</span><span className="font-semibold">{(usage.ai_usage.total_queries || 0).toLocaleString()}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-500">30-day queries</span><span className="font-semibold">{(usage.ai_usage.recent_30d || 0).toLocaleString()}</span></div>
              </div>
            ) : <p className="text-xs text-gray-400">No data</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════
function OrganizationManagement() {
  const { user } = useAuth();
  const [org, setOrg] = useState(null);
  const [orgSettings, setOrgSettings] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  const fetchData = useCallback(async () => {
    if (!user?.tenant_id) return;
    setLoading(true);
    try {
      const [orgData, settingsData, subData, usageData] = await Promise.all([
        orgApi.getOrganization(user.tenant_id),
        orgApi.getOrgSettings(user.tenant_id),
        orgApi.getCurrentSubscription().catch(() => null),
        orgApi.getUsageAnalytics().catch(() => null),
      ]);
      setOrg(orgData);
      setOrgSettings(settingsData);
      setSubscription(subData);
      setUsage(usageData);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load organization data'));
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error && !org) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  const tabs = [
    {
      key: 'overview',
      label: 'Overview',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
      content: <OverviewTab org={org} orgSettings={orgSettings} subscription={subscription} usage={usage} loading={loading} />,
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      content: <SettingsTab org={org} orgSettings={orgSettings} onRefresh={fetchData} />,
    },
    {
      key: 'members',
      label: 'Members',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
      content: <MembersTab orgId={org?.id} onRefresh={fetchData} />,
    },
    {
      key: 'subscription',
      label: 'Subscription',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>,
      content: <SubscriptionTab onRefresh={fetchData} />,
    },
    {
      key: 'billing',
      label: 'Billing',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
      content: <BillingTab />,
    },
    {
      key: 'usage',
      label: 'Usage',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
      content: <UsageTab />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Organization Management</h1>
            <p className="text-xs text-gray-400 mt-1">Manage your organization, members, subscription, and billing</p>
          </div>
          <button onClick={fetchData} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>
            Refresh
          </button>
        </div>

        {loading && !org ? (
          <PageSkeleton />
        ) : (
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-1" />
        )}
      </div>
    </div>
  );
}

export default OrganizationManagement;
