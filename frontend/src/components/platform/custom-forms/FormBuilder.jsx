import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FiSave, FiX, FiPlus, FiMenu, FiSettings, FiEye, FiEdit3, FiTrash2, FiType, FiHash, FiCalendar, FiList, FiPaperclip, FiChevronUp, FiChevronDown } from 'react-icons/fi';


const FIELD_TYPE_OPTIONS = [
  { value: 'TEXT', label: 'Text', icon: FiType },
  { value: 'NUMBER', label: 'Number', icon: FiHash },
  { value: 'DATE', label: 'Date', icon: FiCalendar },
  { value: 'SELECT', label: 'Select', icon: FiList },
  { value: 'FILE', label: 'File', icon: FiPaperclip },
];

function emptyField(type = 'TEXT') {
  return {
    id: `new_${Date.now()}`,
    field_type: type,
    label: '',
    required: false,
    placeholder: '',
    options: type === 'SELECT' ? [{ label: 'Option 1', value: 'option_1' }] : null,
    validation_rules: null,
    sort_order: 0,
  };
}

function FieldConfigPanel({ field, onChange, onDelete }) {
  if (!field) return null;

  const handleChange = (key, value) => {
    onChange(field.id, { ...field, [key]: value });
  };

  const handleAddOption = () => {
    const opts = field.options || [];
    const idx = opts.length + 1;
    handleChange('options', [...opts, { label: `Option ${idx}`, value: `option_${idx}` }]);
  };

  const handleOptionChange = (i, key, value) => {
    const opts = [...(field.options || [])];
    opts[i] = { ...opts[i], [key]: value };
    handleChange('options', opts);
  };

  const handleRemoveOption = (i) => {
    const opts = [...(field.options || [])];
    opts.splice(i, 1);
    handleChange('options', opts.length > 0 ? opts : null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiSettings className="w-4 h-4 text-gray-400" />
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Field Properties</h4>
        </div>
        <button onClick={() => onDelete(field.id)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
          <FiTrash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Label</label>
          <input
            type="text"
            value={field.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
            placeholder="Field label"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Type</label>
          <select
            value={field.field_type}
            onChange={(e) => {
              const type = e.target.value;
              handleChange('field_type', type);
              if (type === 'SELECT' && !field.options) {
                handleChange('options', [{ label: 'Option 1', value: 'option_1' }]);
              } else if (type !== 'SELECT') {
                handleChange('options', null);
              }
            }}
            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
          >
            {FIELD_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Required</label>
          <label className="flex items-center gap-2 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={field.required || false}
              onChange={(e) => handleChange('required', e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-gray-600">{field.required ? 'Yes' : 'No'}</span>
          </label>
        </div>

        <div className="col-span-2">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Placeholder</label>
          <input
            type="text"
            value={field.placeholder || ''}
            onChange={(e) => handleChange('placeholder', e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
            placeholder="Placeholder text"
          />
        </div>
      </div>

      {field.field_type === 'SELECT' && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Options</label>
            <button onClick={handleAddOption} className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium">+ Add</button>
          </div>
          <div className="space-y-1.5">
            {(field.options || []).map((opt, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => handleOptionChange(i, 'label', e.target.value)}
                  className="flex-1 px-2 py-1 text-[10px] border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                  placeholder="Label"
                />
                <input
                  type="text"
                  value={opt.value}
                  onChange={(e) => handleOptionChange(i, 'value', e.target.value)}
                  className="flex-1 px-2 py-1 text-[10px] border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 font-mono"
                  placeholder="Value"
                />
                <button onClick={() => handleRemoveOption(i)} className="p-1 text-gray-300 hover:text-red-500">
                  <FiX className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Validation Rules</label>
        <div className="space-y-1.5">
          {(field.field_type === 'TEXT' || field.field_type === 'NUMBER') && (
            <>
              {field.field_type === 'TEXT' && (
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    value={field.validation_rules?.min_length || ''}
                    onChange={(e) => handleChange('validation_rules', { ...field.validation_rules, min_length: e.target.value ? Number(e.target.value) : null })}
                    className="px-2 py-1 text-[10px] border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                    placeholder="Min length"
                  />
                  <input
                    type="number"
                    value={field.validation_rules?.max_length || ''}
                    onChange={(e) => handleChange('validation_rules', { ...field.validation_rules, max_length: e.target.value ? Number(e.target.value) : null })}
                    className="px-2 py-1 text-[10px] border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                    placeholder="Max length"
                  />
                </div>
              )}
              {field.field_type === 'NUMBER' && (
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    value={field.validation_rules?.min || ''}
                    onChange={(e) => handleChange('validation_rules', { ...field.validation_rules, min: e.target.value ? Number(e.target.value) : null })}
                    className="px-2 py-1 text-[10px] border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                    placeholder="Min value"
                  />
                  <input
                    type="number"
                    value={field.validation_rules?.max || ''}
                    onChange={(e) => handleChange('validation_rules', { ...field.validation_rules, max: e.target.value ? Number(e.target.value) : null })}
                    className="px-2 py-1 text-[10px] border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                    placeholder="Max value"
                  />
                </div>
              )}
            </>
          )}
          {field.field_type === 'TEXT' && (
            <input
              type="text"
              value={field.validation_rules?.pattern || ''}
              onChange={(e) => handleChange('validation_rules', { ...field.validation_rules, pattern: e.target.value || null })}
              className="w-full px-2 py-1 text-[10px] border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 font-mono"
              placeholder="Regex pattern (e.g. ^[A-Z].*)"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function FormPreview({ fields }) {
  const renderField = (f, i) => {
    const Icon = FIELD_TYPE_OPTIONS.find((o) => o.value === f.field_type)?.icon || FiType;
    return (
      <div key={f.id || i} className="space-y-1">
        <label className="block text-xs font-medium text-gray-700">
          {f.label || `Untitled Field`}
          {f.required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {f.field_type === 'TEXT' && (
          <input type="text" placeholder={f.placeholder || ''} disabled className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 text-gray-400" />
        )}
        {f.field_type === 'NUMBER' && (
          <input type="number" placeholder={f.placeholder || ''} disabled className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 text-gray-400" />
        )}
        {f.field_type === 'DATE' && (
          <input type="date" disabled className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 text-gray-400" />
        )}
        {f.field_type === 'SELECT' && (
          <select disabled className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 text-gray-400">
            <option>{f.placeholder || 'Select...'}</option>
            {(f.options || []).map((opt, j) => (
              <option key={j} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
        {f.field_type === 'FILE' && (
          <div className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50 text-gray-400 flex items-center gap-2">
            <FiPaperclip className="w-3.5 h-3.5" />
            Upload file
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {fields.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-8">Add fields to see a preview of your form.</p>
      ) : (
        fields.map((f, i) => renderField(f, i))
      )}
      {fields.length > 0 && (
        <button disabled className="w-full py-2.5 text-xs font-medium bg-indigo-100 text-indigo-300 rounded-xl mt-4">
          Submit
        </button>
      )}
    </div>
  );
}

export default function FormBuilder({ form, onSave, onCancel }) {
  const isEdit = Boolean(form?.id);
  const [title, setTitle] = useState(form?.title || '');
  const [description, setDescription] = useState(form?.description || '');
  const [status, setStatus] = useState(form?.status || 'draft');
  const [fields, setFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('builder'); // builder | settings | preview

  useEffect(() => {
    if (form?.fields_config) {
      setFields(form.fields_config.map((f, i) => ({
        id: f.id || `existing_${i}`,
        field_type: f.field_type || f.type || 'TEXT',
        label: f.label || '',
        required: f.required || false,
        placeholder: f.placeholder || '',
        options: f.options || null,
        validation_rules: f.validation_rules || null,
        sort_order: f.sort_order ?? f.order ?? i,
      })));
    }
  }, [form]);

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(fields);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setFields(items);
  };

  const handleAddField = (type) => {
    const newField = { ...emptyField(type), sort_order: fields.length };
    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
    setTab('settings');
  };

  const handleFieldChange = (id, updated) => {
    setFields(fields.map((f) => (f.id === id ? updated : f)));
  };

  const handleDeleteField = (id) => {
    setFields(fields.filter((f) => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const handleMoveField = (index, direction) => {
    const items = Array.from(fields);
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    setFields(items);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Form title is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const sanitized = fields.map((f, i) => ({
        type: f.field_type,
        label: f.label || 'Untitled',
        required: f.required || false,
        placeholder: f.placeholder || null,
        options: f.options || null,
        order: i,
      }));
      await onSave({ title: title.trim(), description: description.trim() || null, status, fields_config: sanitized });
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Form Title"
              className="text-lg font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 placeholder-gray-300 flex-1 min-w-0"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onCancel} className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all shadow-md">
              {saving ? (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : <FiSave className="w-3.5 h-3.5" />}
              {isEdit ? 'Save Changes' : 'Create Form'}
            </button>
          </div>
        </div>

        {error && (
          <div className="px-5 py-3 bg-red-50 border-b border-red-200 text-sm text-red-700">{error}</div>
        )}

        <div className="p-5">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Form description (optional)"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 mb-4"
          />

          <div className="flex items-center gap-1 mb-4 border-b border-gray-100">
            {[
              { key: 'builder', label: 'Builder', icon: FiEdit3 },
              { key: 'settings', label: 'Field Settings', icon: FiSettings },
              { key: 'preview', label: 'Preview', icon: FiEye },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className={`lg:col-span-2 ${tab === 'settings' ? 'hidden lg:block' : ''}`}>
              {tab === 'builder' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Form Fields</h4>
                    <div className="flex items-center gap-1">
                      {FIELD_TYPE_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleAddField(opt.value)}
                            className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                            title={`Add ${opt.label} field`}
                          >
                            <Icon className="w-3 h-3" />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {fields.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
                      <FiPlus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 mb-1">No fields yet</p>
                      <p className="text-xs text-gray-400">Click a field type above to add your first field.</p>
                    </div>
                  ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="fields">
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                            {fields.map((f, index) => {
                              const Icon = FIELD_TYPE_OPTIONS.find((o) => o.value === f.field_type)?.icon || FiType;
                              const isSelected = selectedFieldId === f.id;
                              return (
                                <Draggable key={f.id} draggableId={String(f.id)} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`bg-white rounded-xl border shadow-sm transition-all ${
                                        snapshot.isDragging ? 'shadow-lg border-indigo-300' : isSelected ? 'border-indigo-400 ring-1 ring-indigo-100' : 'border-gray-200/70 hover:border-gray-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 px-3 py-2.5">
                                        <div {...provided.dragHandleProps} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
                                          <FiMenu className="w-4 h-4" />
                                        </div>
                                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                          <Icon className="w-3.5 h-3.5 text-indigo-500" />
                                        </div>
                                        <div className="flex-1 min-w-0" onClick={() => { setSelectedFieldId(f.id); setTab('settings'); }}>
                                          <p className="text-xs font-medium text-gray-900 truncate">{f.label || 'Untitled Field'}</p>
                                          <p className="text-[10px] text-gray-400">{f.field_type}{f.required ? ' · Required' : ''}</p>
                                        </div>
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                                          <button type="button" onClick={() => handleMoveField(index, -1)} disabled={index === 0} className="p-1 rounded text-gray-300 hover:text-gray-600 disabled:opacity-30">
                                            <FiChevronUp className="w-3.5 h-3.5" />
                                          </button>
                                          <button type="button" onClick={() => handleMoveField(index, 1)} disabled={index === fields.length - 1} className="p-1 rounded text-gray-300 hover:text-gray-600 disabled:opacity-30">
                                            <FiChevronDown className="w-3.5 h-3.5" />
                                          </button>
                                          <button type="button" onClick={() => { setSelectedFieldId(f.id); setTab('settings'); }} className="p-1 rounded text-gray-300 hover:text-indigo-500">
                                            <FiSettings className="w-3.5 h-3.5" />
                                          </button>
                                          <button type="button" onClick={() => handleDeleteField(f.id)} className="p-1 rounded text-gray-300 hover:text-red-500">
                                            <FiTrash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  )}
                </div>
              )}

              {tab === 'preview' && <FormPreview fields={fields} />}
            </div>

            <div className={`lg:col-span-1 ${tab !== 'settings' ? 'hidden lg:block' : ''}`}>
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 lg:sticky lg:top-4">
                {selectedField ? (
                  <FieldConfigPanel
                    field={selectedField}
                    onChange={handleFieldChange}
                    onDelete={handleDeleteField}
                  />
                ) : (
                  <div className="text-center py-8">
                    <FiSettings className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Select a field from the builder to configure its properties.</p>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
