import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getForm, submitForm } from '../../api/customForms';
import { FiArrowLeft, FiSend, FiCheckCircle } from 'react-icons/fi';

function FormField({ field, value, onChange, error }) {
  const id = `field-${field.order || 0}`;
  const cls = "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-white";

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700">
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </label>
      {field.type === 'textarea' ? (
        <textarea id={id} value={value || ''} onChange={e => onChange(field.order || 0, e.target.value)} rows={4} className={cls} placeholder={field.placeholder} />
      ) : field.type === 'select' ? (
        <select id={id} value={value || ''} onChange={e => onChange(field.order || 0, e.target.value)} className={cls}>
          <option value="">{field.placeholder || 'Select...'}</option>
          {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : field.type === 'checkbox' ? (
        <div className="flex items-center gap-2">
          <input id={id} type="checkbox" checked={value || false} onChange={e => onChange(field.order || 0, e.target.checked)} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          <label htmlFor={id} className="text-sm text-gray-600">{field.placeholder || field.label}</label>
        </div>
      ) : field.type === 'radio' ? (
        <div className="space-y-1.5">{(field.options || []).map(o => <label key={o} className="flex items-center gap-2 text-sm text-gray-600"><input type="radio" name={id} value={o} checked={value === o} onChange={e => onChange(field.order || 0, e.target.value)} className="border-gray-300 text-indigo-600 focus:ring-indigo-500" />{o}</label>)}</div>
      ) : field.type === 'number' ? (
        <input id={id} type="number" value={value || ''} onChange={e => onChange(field.order || 0, e.target.value)} className={cls} placeholder={field.placeholder} />
      ) : field.type === 'email' ? (
        <input id={id} type="email" value={value || ''} onChange={e => onChange(field.order || 0, e.target.value)} className={cls} placeholder={field.placeholder} />
      ) : field.type === 'date' ? (
        <input id={id} type="date" value={value || ''} onChange={e => onChange(field.order || 0, e.target.value)} className={cls} />
      ) : field.type === 'file' ? (
        <input id={id} type="file" onChange={e => onChange(field.order || 0, e.target.value)} className={cls} />
      ) : (
        <input id={id} type="text" value={value || ''} onChange={e => onChange(field.order || 0, e.target.value)} className={cls} placeholder={field.placeholder} />
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function FormView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getForm(id).then(f => {
      setForm(f);
      const initial = {};
      (f.fields_config || []).forEach(field => {
        if (field.type === 'checkbox') initial[field.order || 0] = false;
        else initial[field.order || 0] = '';
      });
      setValues(initial);
    }).catch(() => navigate('/custom-forms'));
  }, [id]);

  const handleChange = (order, value) => setValues({ ...values, [order]: value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    (form.fields_config || []).forEach(field => {
      if (field.required && !values[field.order || 0]) newErrors[field.order || 0] = 'This field is required';
    });
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setSaving(true);
    try {
      await submitForm(id, { data: values });
      setSubmitted(true);
    } finally { setSaving(false); }
  };

  if (!form) return null;

  if (submitted) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center"><FiCheckCircle className="w-10 h-10 text-green-600" /></div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Submission Received</h2>
      <p className="text-gray-500 mb-6">Your response has been recorded.</p>
      <button onClick={() => navigate('/custom-forms')} className="px-5 py-2.5 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all">Back to Forms</button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate('/custom-forms')} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 mb-6 transition-colors"><FiArrowLeft className="w-4 h-4" />Back</button>
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6 sm:p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-2">{form.title}</h1>
        {form.description && <p className="text-sm text-gray-500 mb-6">{form.description}</p>}
        {form.status !== 'active' && <div className="mb-6 p-3 rounded-xl bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">This form is currently {form.status} and may not accept submissions.</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          {(form.fields_config || [])
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((field, i) => (
              <FormField key={i} field={field} value={values[field.order || 0]} onChange={handleChange} error={errors[field.order || 0]} />
            ))}
          <div className="pt-4">
            <button type="submit" disabled={saving || form.status !== 'active'} className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all shadow-md"><FiSend className="w-4 h-4" />{saving ? 'Submitting...' : 'Submit'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
