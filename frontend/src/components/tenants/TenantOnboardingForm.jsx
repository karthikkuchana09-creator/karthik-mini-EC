import { useState } from 'react';
import { getErrorMessage } from '../../utils/errorHandler';

export default function TenantOnboardingForm({ onSubmit, onCancel }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    tenant_name: '',
    contact_email: '',
    industry: '',
    phone: '',
    address: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    confirm_password: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (apiError) setApiError('');
  };

  const validateStep = (stepIdx) => {
    const newErrors = {};
    if (stepIdx === 0) {
      if (!form.tenant_name.trim()) newErrors.tenant_name = 'Organization name is required';
      if (!form.contact_email.trim()) {
        newErrors.contact_email = 'Contact email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email)) {
        newErrors.contact_email = 'Invalid email format';
      }
    } else if (stepIdx === 1) {
      if (!form.admin_name.trim()) newErrors.admin_name = 'Admin name is required';
      if (!form.admin_email.trim()) {
        newErrors.admin_email = 'Admin email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.admin_email)) {
        newErrors.admin_email = 'Invalid email format';
      }
      if (!form.admin_password) {
        newErrors.admin_password = 'Password is required';
      } else if (form.admin_password.length < 8) {
        newErrors.admin_password = 'Password must be at least 8 characters';
      }
      if (form.admin_password !== form.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep((s) => s + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(1)) return;
    setSubmitting(true);
    setApiError('');
    try {
      const res = await onSubmit({
        tenant_name: form.tenant_name.trim(),
        contact_email: form.contact_email.trim(),
        industry: form.industry || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        admin_name: form.admin_name.trim(),
        admin_email: form.admin_email.trim(),
        admin_password: form.admin_password,
      });
      setResult(res);
    } catch (err) {
      setApiError(getErrorMessage(err, 'Onboarding failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-5">
        <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-emerald-800">Onboarding Completed</h4>
              <p className="text-xs text-emerald-600 mt-0.5">{result.message}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase">Tenant ID</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5 font-mono">#{result.tenant_id}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase">Admin ID</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5 font-mono">#{result.admin_user_id}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase">Onboarding ID</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5 font-mono">#{result.onboarding_id}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-gray-400 uppercase">Status</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{result.onboarding_status}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-secondary">
              Close
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setStep(0);
              setForm({
                tenant_name: '', contact_email: '', industry: '', phone: '', address: '',
                admin_name: '', admin_email: '', admin_password: '', confirm_password: '',
              });
            }}
            className="btn-primary"
          >
            Onboard Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {apiError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${step === 0 ? 'bg-indigo-100 text-indigo-700' : step > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          {step > 0 ? (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <span>1</span>
          )}
          <span>Tenant Details</span>
        </div>
        <div className="w-6 h-px bg-gray-200" />
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${step === 1 ? 'bg-indigo-100 text-indigo-700' : step > 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          <span>2</span>
          <span>Admin Account</span>
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label label-required">Organization Name</label>
              <input
                name="tenant_name"
                value={form.tenant_name}
                onChange={handleChange}
                className={errors.tenant_name ? 'input-error' : 'input'}
                placeholder="Acme Corp"
              />
              {errors.tenant_name && <p className="mt-1 text-xs text-red-600">{errors.tenant_name}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label label-required">Contact Email</label>
              <input
                name="contact_email"
                type="email"
                value={form.contact_email}
                onChange={handleChange}
                className={errors.contact_email ? 'input-error' : 'input'}
                placeholder="admin@acme.com"
              />
              {errors.contact_email && <p className="mt-1 text-xs text-red-600">{errors.contact_email}</p>}
            </div>
            <div>
              <label className="label">Industry</label>
              <select name="industry" value={form.industry} onChange={handleChange} className="select">
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
            <div>
              <label className="label">Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} className="input" placeholder="+1 555-123-4567" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <textarea name="address" value={form.address} onChange={handleChange} className="input resize-none" rows={2} placeholder="123 Business Ave, Suite 100" />
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 animate-fadeIn">
          <div>
            <label className="label label-required">Admin Full Name</label>
            <input
              name="admin_name"
              value={form.admin_name}
              onChange={handleChange}
              className={errors.admin_name ? 'input-error' : 'input'}
              placeholder="Jane Smith"
            />
            {errors.admin_name && <p className="mt-1 text-xs text-red-600">{errors.admin_name}</p>}
          </div>
          <div>
            <label className="label label-required">Admin Email</label>
            <input
              name="admin_email"
              type="email"
              value={form.admin_email}
              onChange={handleChange}
              className={errors.admin_email ? 'input-error' : 'input'}
              placeholder="jane@acme.com"
            />
            {errors.admin_email && <p className="mt-1 text-xs text-red-600">{errors.admin_email}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label label-required">Password</label>
              <div className="relative">
                <input
                  name="admin_password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.admin_password}
                  onChange={handleChange}
                  className={errors.admin_password ? 'input-error pr-10' : 'input pr-10'}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.admin_password && <p className="mt-1 text-xs text-red-600">{errors.admin_password}</p>}
            </div>
            <div>
              <label className="label label-required">Confirm Password</label>
              <div className="relative">
                <input
                  name="confirm_password"
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirm_password}
                  onChange={handleChange}
                  className={errors.confirm_password ? 'input-error pr-10' : 'input pr-10'}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="mt-1 text-xs text-red-600">{errors.confirm_password}</p>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 mt-2">
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-xs text-amber-800">
                This will create both the tenant organization and the initial admin account in a single step. The admin will receive owner-level privileges.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between gap-3 pt-2">
        <div>
          {step > 0 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-secondary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Back
            </button>
          ) : (
            onCancel && (
              <button type="button" onClick={onCancel} className="btn-secondary">
                Cancel
              </button>
            )
          )}
        </div>
        {step === 0 ? (
          <button type="button" onClick={handleNext} className="btn-primary">
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        ) : (
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </span>
            ) : (
              'Complete Onboarding'
            )}
          </button>
        )}
      </div>
    </form>
  );
}
