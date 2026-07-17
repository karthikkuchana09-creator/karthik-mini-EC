import { useState } from 'react';
import { FiSearch, FiStar } from 'react-icons/fi';
import Modal from '../../ui/Modal';

const MODULE_LABELS = {
  tasks: 'Tasks',
  projects: 'Projects',
  teams: 'Teams',
  documents: 'Documents',
  users: 'Users',
  meetings: 'Meetings',
  approvals: 'Approvals',
  knowledge_articles: 'Knowledge',
  messages: 'Messages',
};

export default function SaveSearchModal({ isOpen, onClose, query, selectedModules, onSave }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!name.trim()) { setError('Please enter a name for this search'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), query: { q: query.trim(), entity_types: selectedModules } });
      setName('');
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to save search');
    } finally {
      setSaving(false);
    }
  };

  const allModules = Object.keys(MODULE_LABELS);
  const activeModules = selectedModules && selectedModules.length < allModules.length
    ? selectedModules.map((k) => MODULE_LABELS[k]).join(', ')
    : 'All modules';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save Search" size="sm">
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
          <div className="flex items-start gap-3">
            <FiSearch className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-indigo-900 mb-0.5">Search Query</p>
              <p className="text-sm text-indigo-700 font-medium truncate">{query}</p>
              <p className="text-[10px] text-indigo-500 mt-1">{activeModules}</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Search Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., High priority tasks"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            ) : (
              <FiStar className="w-4 h-4" />
            )}
            Save Search
          </button>
        </div>
      </div>
    </Modal>
  );
}
