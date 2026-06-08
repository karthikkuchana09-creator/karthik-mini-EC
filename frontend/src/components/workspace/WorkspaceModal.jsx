import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';

export default function WorkspaceModal({ isOpen, onClose, onSubmit, workspace }) {
  const isEdit = !!workspace;

  const [form, setForm] = useState({
    name: '',
    description: '',
    visibility: 'Public',
    avatar: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (workspace) {
        setForm({
          name: workspace.name || '',
          description: workspace.description || '',
          visibility: workspace.visibility || 'Public',
          avatar: workspace.avatar || '',
        });
      } else {
        setForm({ name: '', description: '', visibility: 'Public', avatar: '' });
      }
      setErrors({});
      setLoading(false);
    }
  }, [isOpen, workspace]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Workspace name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.avatar.trim()) delete payload.avatar;
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
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Workspace' : 'Create Workspace'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label-required">Workspace Name</label>
          <input
            className={`input ${errors.name ? 'input-error' : ''}`}
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="e.g. Engineering Team"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[80px] resize-none"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="What is this workspace for?"
            rows={3}
          />
        </div>

        <div>
          <label className="label">Avatar URL (optional)</label>
          <input
            className="input"
            value={form.avatar}
            onChange={(e) => setField('avatar', e.target.value)}
            placeholder="https://example.com/avatar.png"
          />
        </div>

        <div>
          <label className="label-required">Visibility</label>
          <div className="flex gap-3 mt-1">
            {['Public', 'Private'].map((opt) => (
              <label
                key={opt}
                className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  form.visibility === opt
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={opt}
                  checked={form.visibility === opt}
                  onChange={() => setField('visibility', opt)}
                  className="sr-only"
                />
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  opt === 'Public' ? 'bg-emerald-100' : 'bg-amber-100'
                }`}>
                  {opt === 'Public' ? (
                    <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{opt}</p>
                  <p className="text-[10px] text-gray-400">
                    {opt === 'Public' ? 'Anyone can find and join' : 'Only invited members can access'}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 mt-4 border-t border-gray-100">
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
              isEdit ? 'Save Changes' : 'Create Workspace'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
