import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../ui/Modal';

export default function CreateTeamModal({ isOpen, onClose, onSubmit }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (isOpen) reset({ name: '', description: '' });
  }, [isOpen, reset]);

  const submitHandler = async (data) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Team" size="md">
      <form onSubmit={handleSubmit(submitHandler)} className="space-y-4">
        <div>
          <label className="label-required">Team Name</label>
          <input
            className={`input ${errors.name ? 'input-error' : ''}`}
            placeholder="e.g. Frontend Team"
            {...register('name', { required: 'Team name is required' })}
          />
          {errors.name && (
            <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[80px] resize-none"
            placeholder="What does this team do?"
            rows={3}
            {...register('description')}
          />
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
                Creating...
              </span>
            ) : (
              'Create Team'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
