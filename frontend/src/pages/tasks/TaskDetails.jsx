import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import StatusBadge from '../../components/common/StatusBadge';
import SLABadge from '../../components/common/SLABadge';
import { FiArrowLeft, FiEdit2, FiCalendar, FiUser, FiClock, FiAlertCircle } from 'react-icons/fi';
import { BTN_SECONDARY } from '../../config/ui';
import * as tasksApi from '../../api/tasks';

export default function TaskDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: task, isLoading, error, refetch } = useQuery({
    queryKey: ['task', id],
    queryFn: () => tasksApi.getTask(id),
    enabled: !!id,
  });

  if (isLoading) return <LoadingSpinner fullPage />;
  if (error) return <ErrorMessage message={error.message} onRetry={refetch} fullPage />;
  if (!task) return <ErrorMessage message="Task not found" fullPage />;

  const slaDueTime = task.sla_due_time || task.sla_deadline;
  const isBreached = task.is_sla_breached || (slaDueTime && !task.completed_at && new Date(slaDueTime) < new Date());

  return (
    <div className="page-container max-w-4xl">
      <PageHeader
        title={task.title}
        subtitle={`Task #${task.id}`}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className={BTN_SECONDARY}>
              <FiArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={() => navigate(`/tasks/${id}/edit`)} className="btn-primary">
              <FiEdit2 className="w-4 h-4" /> Edit
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Description</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{task.description || 'No description provided.'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400">Status</p>
                <div className="mt-0.5"><StatusBadge status={task.status} size="lg" /></div>
              </div>
              <div>
                <p className="text-xs text-gray-400">Priority</p>
                <div className="mt-0.5"><StatusBadge status={task.priority} type="priority" /></div>
              </div>
              {task.assignee && (
                <div>
                  <p className="text-xs text-gray-400">Assignee</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5 mt-0.5">
                    <FiUser className="w-4 h-4 text-gray-400" />
                    {task.assignee.name || task.assignee}
                  </p>
                </div>
              )}
              {task.due_date && (
                <div>
                  <p className="text-xs text-gray-400">Due Date</p>
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5 mt-0.5">
                    <FiCalendar className="w-4 h-4 text-gray-400" />
                    {new Date(task.due_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              {slaDueTime && (
                <div>
                  <p className="text-xs text-gray-400">SLA Due Time</p>
                  <p className={`text-sm font-medium flex items-center gap-1.5 mt-0.5 ${isBreached ? 'text-red-600' : 'text-gray-900'}`}>
                    <FiClock className={`w-4 h-4 ${isBreached ? 'text-red-400' : 'text-gray-400'}`} />
                    {new Date(slaDueTime).toLocaleString()}
                  </p>
                </div>
              )}
              {slaDueTime && (
                <div>
                  <p className="text-xs text-gray-400">SLA Status</p>
                  <div className="mt-1">
                    <SLABadge deadline={slaDueTime} completedAt={task.completed_at} status={task.status} />
                  </div>
                </div>
              )}
              {isBreached && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                  <FiAlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-red-700">SLA Breached</p>
                    <p className="text-xs text-red-500 mt-0.5">This task has exceeded its SLA deadline.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
