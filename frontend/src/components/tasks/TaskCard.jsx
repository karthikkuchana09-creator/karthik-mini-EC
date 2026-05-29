import { FiUser, FiCalendar, FiMessageSquare, FiPaperclip } from 'react-icons/fi';
import StatusBadge from '../common/StatusBadge';
import SLABadge from '../common/SLABadge';

export default function TaskCard({ task, onClick }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 p-4 cursor-pointer" onClick={() => onClick?.(task)}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-gray-900 truncate flex-1">{task.title}</h3>
        <StatusBadge status={task.status} />
      </div>
      {task.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{task.description}</p>}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {task.assignee && (
            <span className="flex items-center gap-1">
              <FiUser className="w-3.5 h-3.5" />
              {task.assignee.name || task.assignee}
            </span>
          )}
          {task.due_date && (
            <span className="flex items-center gap-1">
              <FiCalendar className="w-3.5 h-3.5" />
              {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {task.comment_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-400"><FiMessageSquare className="w-3 h-3" />{task.comment_count}</span>
          )}
          {task.document_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-gray-400"><FiPaperclip className="w-3 h-3" />{task.document_count}</span>
          )}
          {task.sla_deadline && <SLABadge deadline={task.sla_deadline} completedAt={task.completed_at} status={task.status} />}
        </div>
      </div>
    </div>
  );
}
