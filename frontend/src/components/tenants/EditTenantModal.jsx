import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { getErrorMessage } from '../../utils/errorHandler';

export default function EditTenantModal({ isOpen, onClose, onSubmit, tenant }) {
  const [form, setForm] = useState({
    name: '',
    contact_email: '',
    phone: '',
    address: '',
    industry: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name || '',
        contact_email: tenant.contact_email || '',
        phone: tenant.phone || '',
        address: tenant.address || '',
        industry: tenant.industry || '',
      });
      setErrors({});
      setApiError('');
    }
  }, [tenant]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (apiError) setApiError('');
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Organization name is required';
    if (!form.contact_email.trim()) {
      newErrors.contact_email = 'Contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) {
      newErrors.contact_email = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError('');
    try {
      await onSubmit(tenant.id, {
        name: form.name.trim(),
        contact_email: form.contact_email.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        industry: form.industry.trim() || null,
      });
      onClose();
    } catch (err) {
      setApiError(getErrorMessage(err, 'Failed to update tenant'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Tenant" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {apiError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{apiError}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Tenant ID</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">#{tenant?.id}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Slug</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5 font-mono">{tenant?.slug}</p>
          </div>
        </div>

        <div>
          <label className="label label-required">Organization Name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className={errors.name ? 'input-error' : 'input'}
            placeholder="Acme Corp"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
        </div>

        <div>
          <label className="label label-required">Contact Email</label>
          <input
            name="contact_email"
            type="email"
            value={form.contact_email}
            onChange={handleChange}
            className={errors.contact_email ? 'input-error' : 'input'}
            placeholder="admin@acme.com"
          />
          {errors.contact_email && (
            <p className="mt-1 text-xs text-red-600">{errors.contact_email}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="input"
              placeholder="+1 555-123-4567"
            />
          </div>
          <div>
            <label className="label">Industry</label>
            <select
              name="industry"
              value={form.industry}
              onChange={handleChange}
              className="select"
            >
              <option value="">Select industry...</option>
              <option value="technology">Technology</option>
              <option value="healthcare">Healthcare</option>
              <option value="finance">Finance</option>
              <option value="education">Education</option>
              <option value="ecommerce">E-Commerce</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="real_estate">Real Estate</option>
              <option value="media">Media & Entertainment</option>
              <option value="consulting">Consulting</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">Address</label>
          <textarea
            name="address"
            value={form.address}
            onChange={handleChange}
            className="input resize-none"
            rows={2}
            placeholder="123 Business Ave, Suite 100"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
