import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';

const CHANNEL_TYPES = [
  { value: 'Public', icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z', color: 'bg-blue-100 text-blue-700', desc: 'Open to all workspace members' },
  { value: 'Private', icon: 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z', color: 'bg-amber-100 text-amber-700', desc: 'Invitation only' },
  { value: 'Announcement', icon: 'M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38a.804.804 0 01-.84-.066 4.49 4.49 0 01-1.692-3.284m5.742-.324a30.07 30.07 0 01-2.674-.09m5.258-5.67a30.06 30.06 0 012.674.09M10.34 6.16a30.07 30.07 0 012.674.09m0 0a30.07 30.07 0 015.858 1.426 30.09 30.09 0 01-5.858 5.858m-5.674-7.284a4.49 4.49 0 011.692 3.284 4.463 4.463 0 01-.985 2.783m0 0a30.07 30.07 0 01.985 2.783', color: 'bg-purple-100 text-purple-700', desc: 'Read-only announcements for members' },
  { value: 'Project', icon: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z', color: 'bg-orange-100 text-orange-700', desc: 'Project-specific collaboration' },
];

export default function ChannelModal({ isOpen, onClose, onSubmit, workspaces = [], channel }) {
  const isEdit = !!channel;

  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'Public',
    workspace_id: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (channel) {
        setForm({
          name: channel.name || '',
          description: channel.description || '',
          type: channel.type || 'Public',
          workspace_id: channel.workspace_id?.toString() || '',
        });
      } else {
        setForm({ name: '', description: '', type: 'Public', workspace_id: workspaces.length === 1 ? workspaces[0].id.toString() : '' });
      }
      setErrors({});
      setLoading(false);
    }
  }, [isOpen, channel, workspaces]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Channel name is required';
    if (!form.workspace_id && !isEdit) errs.workspace_id = 'Please select a workspace';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        type: form.type,
      };
      if (!isEdit) payload.workspace_id = Number(form.workspace_id);
      await onSubmit(payload);
      onClose();
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Channel' : 'Create Channel'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isEdit && workspaces.length > 0 && (
          <div>
            <label className="label-required">Workspace</label>
            <select
              className={`select ${errors.workspace_id ? 'input-error' : ''}`}
              value={form.workspace_id}
              onChange={(e) => setField('workspace_id', e.target.value)}
            >
              <option value="">Select workspace...</option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
            {errors.workspace_id && <p className="text-xs text-red-500 mt-1">{errors.workspace_id}</p>}
          </div>
        )}

        <div>
          <label className="label-required">Channel Name</label>
          <input
            className={`input ${errors.name ? 'input-error' : ''}`}
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="e.g. design-team"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[80px] resize-none"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="What is this channel for?"
            rows={3}
          />
        </div>

        <div>
          <label className="label-required">Channel Type</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {CHANNEL_TYPES.map((t) => (
              <label
                key={t.value}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  form.type === t.value
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={t.value}
                  checked={form.type === t.value}
                  onChange={() => setField('type', t.value)}
                  className="sr-only"
                />
                <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.color}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{t.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {isEdit ? 'Saving...' : 'Creating...'}
              </span>
            ) : (
              isEdit ? 'Save Changes' : 'Create Channel'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
