import { FiType, FiHash, FiCalendar, FiList, FiPaperclip, FiTrash2 } from 'react-icons/fi';

const FIELD_TYPE_CONFIG = {
  TEXT: { icon: FiType, label: 'Text', color: 'from-blue-500 to-indigo-500' },
  NUMBER: { icon: FiHash, label: 'Number', color: 'from-emerald-500 to-teal-500' },
  DATE: { icon: FiCalendar, label: 'Date', color: 'from-amber-500 to-orange-500' },
  SELECT: { icon: FiList, label: 'Select', color: 'from-purple-500 to-pink-500' },
  FILE: { icon: FiPaperclip, label: 'File', color: 'from-rose-500 to-red-500' },
};

export default function FormFieldEditor({ field, index, onChange, onDelete, errors = {} }) {
  const config = FIELD_TYPE_CONFIG[field.field_type] || FIELD_TYPE_CONFIG.TEXT;
  const Icon = config.icon;

  const update = (key, value) => {
    onChange(index, { ...field, [key]: value });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200/70 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/80 border-b border-gray-100">
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center shadow-sm shrink-0`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{config.label}</span>
        <span className="text-xs text-gray-400 font-mono">Field {index + 1}</span>
        <div className="ml-auto">
          <button onClick={() => onDelete(index)} className="btn-icon hover:!text-red-500" title="Remove field">
            <FiTrash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Label <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={field.label || ''}
            onChange={(e) => update('label', e.target.value)}
            placeholder="Field label"
            className={`w-full px-2.5 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 ${errors.label ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}
          />
          {errors.label && <p className="text-[10px] text-red-500 mt-0.5">{errors.label}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Placeholder
            </label>
            <input
              type="text"
              value={field.placeholder || ''}
              onChange={(e) => update('placeholder', e.target.value)}
              placeholder="Placeholder text"
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 bg-white"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={field.required || false}
                onChange={(e) => update('required', e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-medium text-gray-600">Required</span>
            </label>
          </div>
        </div>

        {field.field_type === 'SELECT' && (
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Options <span className="text-red-400">*</span>
            </label>
            <div className="space-y-1.5">
              {(field.options || ['']).map((opt, oi) => (
                <div key={oi} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const opts = [...(field.options || [])];
                      opts[oi] = e.target.value;
                      update('options', opts);
                    }}
                    placeholder={`Option ${oi + 1}`}
                    className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 bg-white"
                  />
                  {field.options?.length > 1 && (
                    <button
                      onClick={() => update('options', field.options.filter((_, i) => i !== oi))}
                      className="btn-icon hover:!text-red-500"
                    >
                      <FiTrash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => update('options', [...(field.options || []), ''])}
                className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                + Add option
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Validation Rules
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(field.field_type === 'TEXT' || field.field_type === 'NUMBER') && (
              <>
                <input
                  type="number"
                  value={field.min_length ?? field.min ?? ''}
                  onChange={(e) => update(field.field_type === 'TEXT' ? 'min_length' : 'min', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Min"
                  className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 bg-white"
                />
                <input
                  type="number"
                  value={field.max_length ?? field.max ?? ''}
                  onChange={(e) => update(field.field_type === 'TEXT' ? 'max_length' : 'max', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Max"
                  className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 bg-white"
                />
              </>
            )}
            {field.field_type === 'TEXT' && (
              <div className="col-span-2">
                <input
                  type="text"
                  value={field.pattern || ''}
                  onChange={(e) => update('pattern', e.target.value)}
                  placeholder="Regex pattern (e.g. ^[A-Z].*$)"
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 bg-white font-mono"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
