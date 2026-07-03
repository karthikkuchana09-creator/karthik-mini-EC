import { FiUsers, FiEdit2, FiArchive, FiRotateCcw, FiEye, FiCalendar } from 'react-icons/fi';
import { CARD_CLASSES } from '../../config/ui';

export default function TeamCard({ team, onView, onEdit, onArchive, onRestore }) {
  const isArchived = team.is_archived;

  return (
    <div className={`${CARD_CLASSES} p-5 group`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <FiUsers className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{team.name}</h3>
          {team.lead && <p className="text-[11px] text-gray-500 truncate mt-0.5">Lead: {team.lead}</p>}
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                isArchived
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isArchived ? 'bg-gray-400' : 'bg-emerald-500'}`} />
              {isArchived ? 'Archived' : 'Active'}
            </span>
            {team.member_count !== undefined && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                <FiUsers className="w-3 h-3" />
                {team.member_count}
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 line-clamp-2 mb-3 min-h-[2rem]">
        {team.description || 'No description'}
      </p>

      {team.created_at && (
        <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-3">
          <FiCalendar className="w-3 h-3" />
          Created {new Date(team.created_at).toLocaleDateString()}
        </div>
      )}

      <div className="flex items-center gap-1 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onView(team)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
          title="View team"
        >
          <FiEye className="w-3.5 h-3.5" />
          View
        </button>
        {!isArchived && (
          <button
            onClick={() => onEdit(team)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="Edit team"
          >
            <FiEdit2 className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
        {isArchived ? (
          <button
            onClick={() => onRestore?.(team)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
            title="Restore team"
          >
            <FiRotateCcw className="w-3.5 h-3.5" />
            Restore
          </button>
        ) : (
          <button
            onClick={() => onArchive(team)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
            title="Archive team"
          >
            <FiArchive className="w-3.5 h-3.5" />
            Archive
          </button>
        )}
      </div>
    </div>
  );
}
