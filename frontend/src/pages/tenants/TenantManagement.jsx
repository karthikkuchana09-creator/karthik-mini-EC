import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as tenantApi from '../../api/tenants';
import ConfirmModal from '../../components/common/ConfirmModal';
import TenantTable from '../../components/tenants/TenantTable';
import CreateTenantModal from '../../components/tenants/CreateTenantModal';
import EditTenantModal from '../../components/tenants/EditTenantModal';
import TenantDetailsDrawer from '../../components/tenants/TenantDetailsDrawer';
import { getErrorMessage } from '../../utils/errorHandler';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Suspended', value: 'SUSPENDED' },
  { label: 'Trial', value: 'TRIAL' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export default function TenantManagement() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [viewingTenant, setViewingTenant] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const size = 15;

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const data = await tenantApi.getTenants(params);
      const items = data.items || data.results || data.data || data || [];
      setTenants(Array.isArray(items) ? items : []);
      setTotal(data.total || data.count || 0);
      setTotalPages(data.total_pages || data.pages || Math.ceil((data.total || 0) / size) || 1);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load tenants'));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const handleCreate = async (data) => {
    await tenantApi.createTenant(data);
    toast.success('Tenant created successfully');
    fetchTenants();
  };

  const handleUpdate = async (id, data) => {
    await tenantApi.updateTenant(id, data);
    toast.success('Tenant updated successfully');
    setEditingTenant(null);
    fetchTenants();
  };

  const handleToggleStatus = (tenant) => {
    const isActive = tenant.status === 'ACTIVE';
    setConfirmAction({
      title: isActive ? 'Suspend Tenant' : 'Activate Tenant',
      message: `Are you sure you want to ${isActive ? 'suspend' : 'activate'} "${tenant.name}"?`,
      variant: isActive ? 'danger' : 'warning',
      confirmText: isActive ? 'Suspend' : 'Activate',
      action: async () => {
        if (isActive) {
          await tenantApi.suspendTenant(tenant.id);
          toast.success(`${tenant.name} has been suspended`);
        } else {
          await tenantApi.activateTenant(tenant.id);
          toast.success(`${tenant.name} has been activated`);
        }
        setConfirmAction(null);
        fetchTenants();
      },
    });
  };

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Tenant Management</h1>
          <p className="page-subtitle">
            Manage all tenants across the platform
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Tenant
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or slug..."
            className="input pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                statusFilter === f.value
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <TenantTable
        tenants={tenants}
        loading={loading}
        searchTerm={search}
        onView={setViewingTenant}
        onEdit={setEditingTenant}
        onToggleStatus={handleToggleStatus}
        onSettings={(t) => navigate(`/admin/tenants/${t.id}/settings`)}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-secondary btn-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Previous
          </button>
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages} &middot; {total} total
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-secondary btn-sm"
          >
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      )}

      <CreateTenantModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
      />

      {editingTenant && (
        <EditTenantModal
          isOpen={!!editingTenant}
          onClose={() => setEditingTenant(null)}
          onSubmit={handleUpdate}
          tenant={editingTenant}
        />
      )}

      <TenantDetailsDrawer
        isOpen={!!viewingTenant}
        onClose={() => setViewingTenant(null)}
        tenant={viewingTenant}
      />

      {confirmAction && (
        <ConfirmModal
          isOpen={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={async () => {
            try {
              await confirmAction.action();
            } catch (err) {
              toast.error(getErrorMessage(err, `Failed to ${confirmAction.confirmText.toLowerCase()} tenant`));
              setConfirmAction(null);
            }
          }}
          title={confirmAction.title}
          message={confirmAction.message}
          variant={confirmAction.variant}
          confirmText={confirmAction.confirmText}
          cancelText="Cancel"
        />
      )}
    </div>
  );
}
