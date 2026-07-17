import { useState, useEffect, useCallback } from 'react';
import { FiFileText, FiPlus, FiRefreshCw } from 'react-icons/fi';
import PlatformPageLayout from '../../components/platform/PlatformPageLayout';
import platformApi from '../../services/platform/platformService';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import FormsTable from '../../components/platform/custom-forms/FormsTable';
import FormBuilder from '../../components/platform/custom-forms/FormBuilder';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function PlatformCustomForms() {
  const { isAdminOrManager } = useRolePermissions();
  const [forms, setForms] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [editingForm, setEditingForm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchForms = useCallback(async (q) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: 1, size: 50 };
      if (q) params.search = q;
      const res = await platformApi.customForms.list(params);
      const d = res.data;
      setForms(d?.items || d?.data || []);
      setTotal(d?.total || 0);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to load forms');
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== undefined) fetchForms(search || undefined);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNew = () => setEditingForm({});

  const handleEdit = async (form) => {
    try {
      const res = await platformApi.customForms.get(form.id);
      setEditingForm(res.data);
    } catch {
      setEditingForm(form);
    }
  };

  const handleCancel = () => {
    setEditingForm(null);
    fetchForms();
  };

  const handleSave = async (data) => {
    if (editingForm?.id) {
      await platformApi.customForms.update(editingForm.id, data);
    } else {
      await platformApi.customForms.create(data);
    }
    setEditingForm(null);
    fetchForms();
  };

  const handleToggleStatus = async (form) => {
    const newStatus = form.status === 'active' ? 'inactive' : 'active';
    try {
      await platformApi.customForms.update(form.id, { status: newStatus });
      fetchForms();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to update form status');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await platformApi.customForms.delete(deleteTarget.id);
    setDeleteTarget(null);
    fetchForms();
  };

  const handleView = (form) => {
    window.open(`/forms/${form.id}`, '_blank');
  };

  return (
    <PlatformPageLayout
      title="Custom Forms"
      subtitle="Design and manage dynamic forms with drag-and-drop field builder"
      icon={FiFileText}
      error={error}
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchForms()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <FiRefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          {isAdminOrManager && !editingForm && (
            <button
              onClick={handleNew}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold rounded-xl shadow-md hover:from-indigo-600 hover:to-violet-600 transition-all duration-200"
            >
              <FiPlus className="w-4 h-4" />
              New Form
            </button>
          )}
        </div>
      }
    >
      {editingForm ? (
        <FormBuilder
          form={editingForm.id ? editingForm : null}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        <FormsTable
          forms={forms}
          loading={loading}
          total={total}
          search={search}
          onSearchChange={setSearch}
          onView={handleView}
          onEdit={handleEdit}
          onToggleStatus={handleToggleStatus}
          onDelete={setDeleteTarget}
          isAdminOrManager={isAdminOrManager}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Form"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This will permanently remove the form, all its fields, and all submissions.`}
        confirmText="Delete"
        variant="danger"
      />
    </PlatformPageLayout>
  );
}
