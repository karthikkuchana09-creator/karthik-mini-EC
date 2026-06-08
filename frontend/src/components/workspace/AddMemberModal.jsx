import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';

const ROLES = ['Workspace Admin', 'Moderator', 'Member', 'Viewer'];
const ROLE_DESCRIPTIONS = {
  'Workspace Admin': 'Full access to manage workspace settings and members',
  Moderator: 'Can manage content and moderate discussions',
  Member: 'Can participate in workspace activities',
  Viewer: 'Read-only access to workspace content',
};

export default function AddMemberModal({ isOpen, onClose, onSubmit, existingMemberEmails = [] }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Member');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setRole('Member');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  const validate = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Invalid email format');
      return false;
    }
    if (existingMemberEmails.some((e) => e.toLowerCase() === email.trim().toLowerCase())) {
      setError('This user is already a member of this workspace');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await onSubmit({ email: email.trim(), role });
      onClose();
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Member" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label-required">Email Address</label>
          <input
            className={`input ${error ? 'input-error' : ''}`}
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
            placeholder="colleague@company.com"
            autoFocus
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        <div>
          <label className="label-required">Role</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {ROLES.map((r) => (
              <label
                key={r}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  role === r
                    ? 'border-indigo-500 bg-indigo-50/50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                  className="sr-only"
                />
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  role === r ? 'border-indigo-500' : 'border-gray-300'
                }`}>
                  {role === r && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{r}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{ROLE_DESCRIPTIONS[r]}</p>
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
                Adding...
              </span>
            ) : (
              'Add Member'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
