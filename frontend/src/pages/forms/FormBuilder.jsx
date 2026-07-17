import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getForm, createForm, updateForm } from '../../api/customForms';
import { FiArrowLeft, FiSave, FiPlus, FiTrash2, FiMove, FiChevronUp, FiChevronDown } from 'react-icons/fi';

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio Group' },
  { value: 'date', label: 'Date Picker' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'file', label: 'File Upload' },
];

function FieldEditor({ field, index, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FiMove className="w-4 h-4 text-gray-400 cursor-move" />
          <span className="text-sm font-semibold text-gray-700">Field {index + 1}</span>
          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-medium">{field.type}</span>
        </div>
        <div className="flex items-center gap-1">
          {!isFirst && <button type="button" onClick={onMoveUp} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200"><FiChevronUp className="w-4 h-4" /></button>}
          {!isLast && <button type="button" onClick={onMoveDown} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200"><FiChevronDown className="w-4 h-4" /></button>}
          <button type="button" onClick={onRemove} className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><FiTrash2 className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
          <input type="text" value={field.label} onChange={e => onChange(index, { ...field, label: e.target.value })} className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Field Type</label>
          <select value={field.type} onChange={e => onChange(index, { ...field, type: e.target.value, options: e.target.value === 'select' || e.target.value === 'radio' ? field.options || [''] : undefined })} className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white">
            {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Placeholder</label>
          <input type="text" value={field.placeholder || ''} onChange={e => onChange(index, { ...field, placeholder: e.target.value })} className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
        </div>
        <div className="flex items-center gap-4 pt-5">
          <label className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={field.required || false} onChange={e => onChange(index, { ...field, required: e.target.checked })} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" /> Required</label>
        </div>
      </div>
      {(field.type === 'select' || field.type === 'radio') && (
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">Options (one per line)</label>
          <textarea value={(field.options || []).join('\n')} onChange={e => onChange(index, { ...field, options: e.target.value.split('\n').filter(Boolean) })} rows={3} className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono" placeholder="Option 1&#10;Option 2&#10;Option 3" />
        </div>
      )}
    </div>
  );
}

export default function FormBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState({ title: '', description: '', status: 'draft', fields_config: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) getForm(id).then(f => setForm({ title: f.title, description: f.description || '', status: f.status, fields_config: f.fields_config || [] }));
  }, [id]);

  const addField = () => {
    setForm({ ...form, fields_config: [...form.fields_config, { type: 'text', label: '', required: false, placeholder: '', order: form.fields_config.length }] });
  };

  const updateField = (index, field) => {
    const fields = [...form.fields_config];
    fields[index] = field;
    setForm({ ...form, fields_config: fields });
  };

  const removeField = (index) => {
    setForm({ ...form, fields_config: form.fields_config.filter((_, i) => i !== index) });
  };

  const moveField = (index, direction) => {
    const fields = [...form.fields_config];
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    [fields[index], fields[target]] = [fields[target], fields[index]];
    setForm({ ...form, fields_config: fields });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) { await updateForm(id, form); } else { await createForm(form); }
      navigate('/custom-forms');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate('/custom-forms')} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 mb-6 transition-colors"><FiArrowLeft className="w-4 h-4" />Back</button>
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6 sm:p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">{isEdit ? 'Edit Form' : 'Create Form'}</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" placeholder="Form title" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 bg-white">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30" placeholder="Form description" />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Form Fields</h2>
              <button type="button" onClick={addField} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all"><FiPlus className="w-3.5 h-3.5" /> Add Field</button>
            </div>
            <div className="space-y-3">
              {form.fields_config.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">No fields yet. Click "Add Field" to start building your form.</div>
              )}
              {form.fields_config.map((field, i) => (
                <FieldEditor
                  key={i} field={field} index={i} onChange={updateField}
                  onRemove={() => removeField(i)}
                  onMoveUp={() => moveField(i, -1)} onMoveDown={() => moveField(i, 1)}
                  isFirst={i === 0} isLast={i === form.fields_config.length - 1}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => navigate('/custom-forms')} className="px-5 py-2.5 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all shadow-md"><FiSave className="w-4 h-4" />{saving ? 'Saving...' : isEdit ? 'Update Form' : 'Create Form'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
