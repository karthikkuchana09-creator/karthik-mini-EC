import { FiEdit2, FiArchive, FiEye, FiCalendar, FiUser } from 'react-icons/fi';
import { CARD_CLASSES } from '../../config/ui';

const STATUS_STYLES = {
  PLANNED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  ON_HOLD: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  COMPLETED: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

const PRIORITY_STYLES = {
  LOW: { bg: 'bg-slate-100', text: 'text-slate-600' },
  MEDIUM: { bg: 'bg-blue-50', text: 'text-blue-700' },
  HIGH: { bg: 'bg-orange-50', text: 'text-orange-700' },
  CRITICAL: { bg: 'bg-red-50', text: 'text-red-700' },
};

export default function ProjectCard({ project, onView, onEdit, onArchive }) {
  const isArchived = project.status === 'CANCELLED';
  const statusStyle = STATUS_STYLES[project.status] || STATUS_STYLES.PLANNED;
  const priorityStyle = PRIORITY_STYLES[project.priority] || PRIORITY_STYLES.MEDIUM;

  return (
    <div className={`${CARD_CLASSES} p-5 group`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{project.name}</h3>
          <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
              {project.status}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${priorityStyle.bg} ${priorityStyle.text}`}>
              {project.priority}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 line-clamp-2 mb-3 min-h-[2rem]">
        {project.description || 'No description'}
      </p>

      <div className="space-y-1 mb-3">
        {project.owner && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <FiUser className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{project.owner}</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          {project.start_date && (
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <FiCalendar className="w-3 h-3" />
              {new Date(project.start_date).toLocaleDateString()}
            </div>
          )}
          {project.end_date && (
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <FiCalendar className="w-3 h-3" />
              {new Date(project.end_date).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onView(project)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
          title="View project">
          <FiEye className="w-3.5 h-3.5" /> View
        </button>
        {!isArchived && (
          <button onClick={() => onEdit(project)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Edit project">
            <FiEdit2 className="w-3.5 h-3.5" /> Edit
          </button>
        )}
        <button onClick={() => onArchive(project)}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
            isArchived ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
          }`}
          title={isArchived ? 'Already cancelled' : 'Cancel project'}
          disabled={isArchived}>
          <FiArchive className="w-3.5 h-3.5" />
          {isArchived ? 'Cancelled' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}
