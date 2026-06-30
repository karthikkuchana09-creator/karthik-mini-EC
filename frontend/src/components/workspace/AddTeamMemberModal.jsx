import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../ui/Modal';

export default function AddTeamMemberModal({ isOpen, onClose, onSubmit, teamName }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm({
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (isOpen) reset({ email: '' });
  }, [isOpen, reset]);

  const submitHandler = async (data) => {
    try {
      await onSubmit({ email: data.email.trim() });
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to add member';
      setError('email', { type: 'manual', message: msg });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add Member${teamName ? ` to ${teamName}` : ''}`} size="md">
      <form onSubmit={handleSubmit(submitHandler)} className="space-y-4">
        <div>
          <label className="label-required">Email Address</label>
          <input
            className={`input ${errors.email ? 'input-error' : ''}`}
            type="email"
            placeholder="colleague@company.com"
            autoFocus
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Invalid email format',
              },
            })}
            onChange={() => { if (errors.email) clearErrors('email'); }}
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
          Only valid workspace members can be added. The user must already be a member of the workspace.
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 mt-4 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? (
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
