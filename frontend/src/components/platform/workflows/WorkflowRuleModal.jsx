import { useState, useEffect } from 'react';
import { FiShield, FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import Modal from '../../ui/Modal';

function ConfigPairEditor({ label, pairs, onChange, keyPlaceholder, valuePlaceholder }) {
  const addPair = () => onChange([...pairs, { key: '', value: '' }]);
  const removePair = (idx) => onChange(pairs.filter((_, i) => i !== idx));
  const updatePair = (idx, field, val) => {
    const updated = pairs.map((p, i) => i === idx ? { ...p, [field]: val } : p);
    onChange(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <button type="button" onClick={addPair} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
          <FiPlus className="w-3 h-3" /> Add
        </button>
      </div>
      <div className="space-y-1.5">
        {pairs.length === 0 && (
          <p className="text-xs text-gray-400 py-1">No configuration set</p>
        )}
        {pairs.map((pair, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <input
              type="text"
              value={pair.key}
              onChange={(e) => updatePair(idx, 'key', e.target.value)}
              placeholder={keyPlaceholder}
              className="flex-1 px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
            <input
              type="text"
              value={pair.value}
              onChange={(e) => updatePair(idx, 'value', e.target.value)}
              placeholder={valuePlaceholder}
              className="flex-[2] px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
            <button type="button" onClick={() => removePair(idx)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <FiTrash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function pairsToObj(pairs) {
  const obj = {};
  pairs.forEach(({ key, value }) => { if (key.trim()) obj[key.trim()] = isNaN(value) ? value : Number(value); });
  return obj;
}

function objToPairs(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }));
}

const OPERATORS = [
  { value: 'eq', label: 'Equals (=)' },
  { value: 'ne', label: 'Not equals (!=)' },
  { value: 'gt', label: 'Greater than (>)' },
  { value: 'gte', label: 'Greater than or equal (>=)' },
  { value: 'lt', label: 'Less than (<)' },
  { value: 'lte', label: 'Less than or equal (<=)' },
  { value: 'in', label: 'In list' },
  { value: 'contains', label: 'Contains' },
  { value: 'is_set', label: 'Is set' },
];

const ACTION_TYPES = [
  { value: 'notify', label: 'Send Notification' },
  { value: 'assign', label: 'Assign Task' },
  { value: 'update_field', label: 'Update Field' },
  { value: 'webhook', label: 'Call Webhook' },
  { value: 'escalate', label: 'Escalate' },
];

export default function WorkflowRuleModal({ isOpen, onClose, onSubmit, rule, workflowId }) {
  const isEditing = !!rule;
  const [form, setForm] = useState({
    name: '', description: '', priority: 0, is_active: true,
    condition_field: '', condition_operator: 'eq', condition_value: '',
    action_type: 'notify', actionPairs: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (rule) {
      const cond = rule.condition_config || {};
      const action = rule.action_config || {};
      setForm({
        name: rule.name || '',
        description: rule.description || '',
        priority: rule.priority ?? 0,
        is_active: rule.is_active ?? true,
        condition_field: cond.field || '',
        condition_operator: cond.operator || 'eq',
        condition_value: cond.value !== undefined ? String(cond.value) : '',
        action_type: action.type || 'notify',
        actionPairs: objToPairs(action.params),
      });
    } else {
      setForm({ name: '', description: '', priority: 0, is_active: true, condition_field: '', condition_operator: 'eq', condition_value: '', action_type: 'notify', actionPairs: [] });
    }
  }, [rule, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Rule name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        is_active: form.is_active,
        condition_config: {
          field: form.condition_field || undefined,
          operator: form.condition_operator,
          value: form.condition_value || undefined,
        },
        action_config: {
          type: form.action_type,
          params: pairsToObj(form.actionPairs),
        },
      };
      await onSubmit(workflowId, rule?.id, payload);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => { setError(null); onClose(); };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
            <FiShield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{isEditing ? 'Edit Rule' : 'Add Rule'}</h3>
            <p className="text-sm text-gray-500">{isEditing ? 'Update rule configuration' : 'Define a new workflow rule'}</p>
          </div>
          <button type="button" onClick={handleClose} className="ml-auto p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Notify manager on overdue"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: parseInt(e.target.value) || 0 }))}
                min="0"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Describe when this rule should trigger..."
              rows={2}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-none"
            />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Condition Configuration</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Field</label>
                <input
                  type="text"
                  value={form.condition_field}
                  onChange={(e) => setForm((p) => ({ ...p, condition_field: e.target.value }))}
                  placeholder="e.g., status"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Operator</label>
                <select
                  value={form.condition_operator}
                  onChange={(e) => setForm((p) => ({ ...p, condition_operator: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                >
                  {OPERATORS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
                <input
                  type="text"
                  value={form.condition_value}
                  onChange={(e) => setForm((p) => ({ ...p, condition_value: e.target.value }))}
                  placeholder="e.g., overdue"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Action Configuration</h4>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Action Type</label>
              <select
                value={form.action_type}
                onChange={(e) => setForm((p) => ({ ...p, action_type: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              >
                {ACTION_TYPES.map((at) => <option key={at.value} value={at.value}>{at.label}</option>)}
              </select>
            </div>
            <ConfigPairEditor
              label="Action Parameters"
              pairs={form.actionPairs}
              onChange={(pairs) => setForm((prev) => ({ ...prev, actionPairs: pairs }))}
              keyPlaceholder="Key"
              valuePlaceholder="Value"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
            <span className="text-sm text-gray-700 font-medium">Active</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-gray-100">
          <button type="button" onClick={handleClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : isEditing ? 'Update Rule' : 'Add Rule'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
