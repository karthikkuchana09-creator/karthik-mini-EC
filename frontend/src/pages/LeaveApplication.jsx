import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { createLeave } from '../api/leaves';
import toast from 'react-hot-toast';

const LEAVE_TYPES = ['Sick Leave', 'Casual Leave', 'Earned Leave'];

function LeaveApplication() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.leave_type) newErrors.leave_type = 'Select a leave type';
    if (!form.start_date) newErrors.start_date = 'Select start date';
    if (!form.end_date) newErrors.end_date = 'Select end date';
    if (!form.reason.trim()) newErrors.reason = 'Enter a reason';
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      newErrors.end_date = 'End date cannot be earlier than start date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await createLeave(form);
      toast.success('Leave application submitted');
      navigate('/leave-status');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to submit leave';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Leave Application</h1>
        <p className="text-sm text-gray-500 mt-1">Submit a new leave request</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Leave Type</label>
            <select
              name="leave_type"
              value={form.leave_type}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                errors.leave_type ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <option value="">Select leave type</option>
              {LEAVE_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {errors.leave_type && <p className="mt-1 text-xs text-red-600">{errors.leave_type}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.start_date ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              />
              {errors.start_date && <p className="mt-1 text-xs text-red-600">{errors.start_date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
              <input
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.end_date ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              />
              {errors.end_date && <p className="mt-1 text-xs text-red-600">{errors.end_date}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
            <textarea
              name="reason"
              value={form.reason}
              onChange={handleChange}
              rows="4"
              placeholder="Describe the reason for your leave..."
              className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none ${
                errors.reason ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            />
            {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason}</p>}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" loading={loading} disabled={loading}>
              Submit Leave
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/leave-status')}
            >
              View My Leaves
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default LeaveApplication;
