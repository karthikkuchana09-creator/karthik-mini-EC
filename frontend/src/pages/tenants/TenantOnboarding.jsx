import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import * as tenantApi from '../../api/tenants';
import { getErrorMessage } from '../../utils/errorHandler';
import TenantOnboardingForm from '../../components/tenants/TenantOnboardingForm';
import AdminCreationForm from '../../components/tenants/AdminCreationForm';
import OnboardingStatusCard from '../../components/tenants/OnboardingStatusCard';

const TABS = [
  { key: 'onboard', label: 'Create Tenant & Admin', icon: 'M12 4.5v15m7.5-7.5h-15' },
  { key: 'admin', label: 'Add Admin to Tenant', icon: 'M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 01.75 21 12.318 12.318 0 013 19.235z' },
  { key: 'status', label: 'Check Status', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
];

export default function TenantOnboarding() {
  const [activeTab, setActiveTab] = useState('onboard');
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(false);
  const [statusTenantId, setStatusTenantId] = useState('');
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusTenant, setStatusTenant] = useState(null);

  const fetchTenants = useCallback(async () => {
    setTenantsLoading(true);
    try {
      const data = await tenantApi.getTenants({ size: 100 });
      const items = data.items || data.results || data.data || [];
      setTenants(Array.isArray(items) ? items : []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load tenants'));
    } finally {
      setTenantsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'admin' || activeTab === 'status') {
      fetchTenants();
    }
  }, [activeTab, fetchTenants]);

  const handleOnboard = async (data) => {
    const result = await tenantApi.onboardTenant(data);
    toast.success('Tenant onboarded successfully');
    return result;
  };

  const handleCreateAdmin = async (tenantId, data) => {
    await tenantApi.createTenantAdmin(tenantId, data);
    toast.success('Admin user created successfully');
    fetchTenants();
  };

  const handleCheckStatus = async () => {
    if (!statusTenantId) {
      toast.error('Please select a tenant');
      return;
    }
    setStatusLoading(true);
    setOnboardingStatus(null);
    setStatusTenant(null);
    try {
      const id = Number(statusTenantId);
      const [status, tenant] = await Promise.all([
        tenantApi.getOnboardingStatus(id),
        tenantApi.getTenant(id),
      ]);
      setOnboardingStatus(status);
      setStatusTenant(tenant);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to fetch onboarding status'));
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="page-title">Tenant Onboarding</h1>
        <p className="page-subtitle">
          Create new tenants with admin accounts or manage existing onboarding
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-all ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'onboard' && (
        <div className="max-w-2xl">
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900">Full Tenant Onboarding</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Create a new tenant organization and its first admin account in one step
              </p>
            </div>
            <div className="card-body">
              <TenantOnboardingForm
                onSubmit={handleOnboard}
                onCancel={() => setActiveTab('admin')}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'admin' && (
        <div className="max-w-2xl">
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900">Add Admin to Existing Tenant</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Create a first admin account for a tenant that hasn't completed onboarding
              </p>
            </div>
            <div className="card-body">
              {tenantsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <AdminCreationForm
                  tenants={tenants}
                  onSubmit={handleCreateAdmin}
                  onCancel={() => setActiveTab('onboard')}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'status' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h3 className="text-sm font-semibold text-gray-900">Check Onboarding Status</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  View the onboarding progress of any tenant
                </p>
              </div>
              <div className="card-body space-y-4">
                <div>
                  <label className="label">Select Tenant</label>
                  <select
                    value={statusTenantId}
                    onChange={(e) => setStatusTenantId(e.target.value)}
                    className="select"
                  >
                    <option value="">Choose a tenant...</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.slug})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleCheckStatus}
                  disabled={!statusTenantId || statusLoading}
                  className="btn-primary w-full"
                >
                  {statusLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Checking...
                    </span>
                  ) : (
                    'Check Status'
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {statusLoading && (
              <div className="card p-8">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3" />
                  <div className="h-2 bg-gray-100 rounded animate-pulse w-full" />
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse" />
                        <div className="flex-1 space-y-1">
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
                          <div className="h-2 bg-gray-100 rounded animate-pulse w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {!statusLoading && onboardingStatus && (
              <OnboardingStatusCard
                status={onboardingStatus}
                tenant={statusTenant}
                onRefresh={handleCheckStatus}
              />
            )}
            {!statusLoading && !onboardingStatus && !statusTenantId && (
              <div className="card">
                <div className="card-body">
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="p-4 rounded-full bg-gray-100 mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-base font-semibold text-gray-900 mb-1">Select a tenant</p>
                    <p className="text-sm text-gray-500 text-center max-w-xs">
                      Choose a tenant from the dropdown to view their onboarding progress
                    </p>
                  </div>
                </div>
              </div>
            )}
            {!statusLoading && !onboardingStatus && statusTenantId && (
              <div className="card">
                <div className="card-body">
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="p-4 rounded-full bg-amber-50 border border-amber-200 mb-4">
                      <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    </div>
                    <p className="text-base font-semibold text-gray-900 mb-1">No onboarding data</p>
                    <p className="text-sm text-gray-500 text-center max-w-xs">
                      This tenant hasn't started the onboarding process yet. Click "Check Status" to refresh.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
