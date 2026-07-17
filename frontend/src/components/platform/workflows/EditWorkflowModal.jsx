import { useState, useEffect } from 'react';
import { FiEdit2, FiX } from 'react-icons/fi';
import Modal from '../../ui/Modal';

const ENTITY_TYPES = ['TASK', 'APPROVAL', 'PROJECT', 'MEETING'];
const TRIGGER_EVENTS = [
  { value: '', label: 'No trigger (manual only)' },
  { value: 'on_create', label: 'On Create' },
  { value: 'on_update', label: 'On Update' },
  { value: 'on_status_change', label: 'On Status Change' },
  { value: 'on_overdue', label: 'On Overdue' },
  { value: 'on_approval_pending', label: 'On Approval Pending' },
  { value: 'manual', label: 'Manual' },
];

export default function EditWorkflowModal({ isOpen, onClose, onSubmit, workflow }) {
  const [form, setForm] = useState({ name: '', description: '', entity_type: 'TASK', trigger_event: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (workflow) {
      setForm({
        name: workflow.name || '',
        description: workflow.description || '',
        entity_type: workflow.entity_type || 'TASK',
        trigger_event: workflow.trigger_event || '',
        status: workflow.status || 'active',
      });
    }
  }, [workflow]);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Workflow name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form };
      if (payload.trigger_event === '') payload.trigger_event = null;
      await onSubmit(workflow.id, payload);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to update workflow');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => { setError(null); onClose(); };

  if (!workflow) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
            <FiEdit2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Edit Workflow</h3>
            <p className="text-sm text-gray-500">Update workflow configuration</p>
          </div>
          <button type="button" onClick={handleClose} className="ml-auto p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Workflow Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
              <select
                value={form.entity_type}
                onChange={(e) => handleChange('entity_type', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              >
                {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Event</label>
            <select
              value={form.trigger_event}
              onChange={(e) => handleChange('trigger_event', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            >
              {TRIGGER_EVENTS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-gray-100">
          <button type="button" onClick={handleClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
