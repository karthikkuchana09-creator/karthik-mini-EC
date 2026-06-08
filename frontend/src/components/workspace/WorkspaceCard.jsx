import { useNavigate } from 'react-router-dom';

const VISIBILITY_COLORS = {
  Public: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Private: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
};

const STATUS_STYLES = {
  active: 'border-l-4 border-l-emerald-500',
  archived: 'border-l-4 border-l-gray-300 opacity-75',
};

const BANNER_COLORS = [
  'from-indigo-500 to-indigo-600',
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-violet-500 to-violet-600',
  'from-rose-500 to-rose-600',
  'from-amber-500 to-amber-600',
  'from-cyan-500 to-cyan-600',
  'from-orange-500 to-orange-600',
];

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getInitials(name) {
  return name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'WS';
}

export default function WorkspaceCard({ workspace, onArchive, onRestore }) {
  const navigate = useNavigate();
  const { id, name, description, visibility, avatar, status } = workspace;
  const isArchived = status === 'archived';

  const visConfig = VISIBILITY_COLORS[visibility] || VISIBILITY_COLORS.Public;
  const borderClass = isArchived ? STATUS_STYLES.archived : STATUS_STYLES.active;
  const bannerColor = BANNER_COLORS[hashCode(name || id) % BANNER_COLORS.length];

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-lg transition-all cursor-pointer group ${borderClass}`}
      onClick={() => navigate(`/workspaces/${id}`)}
    >
      <div className={`h-20 rounded-t-2xl bg-gradient-to-br ${bannerColor} flex items-center justify-center relative overflow-hidden`}>
        {avatar ? (
          <img src={avatar} alt={name} className="w-14 h-14 rounded-full ring-4 ring-white/40 object-cover" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-white/20 ring-4 ring-white/40 flex items-center justify-center">
            <span className="text-xl font-bold text-white">{getInitials(name)}</span>
          </div>
        )}
        {isArchived && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/90 text-[10px] font-semibold text-gray-500">
            Archived
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
          {name}
        </h3>
        {description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${visConfig.bg} ${visConfig.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${visConfig.dot}`} />
            {visibility}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/workspaces/${id}`); }}
            className="flex-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg py-1.5 transition-colors"
          >
            View
          </button>
          {isArchived ? (
            <button
              onClick={(e) => { e.stopPropagation(); onRestore?.(workspace); }}
              className="flex-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg py-1.5 transition-colors"
            >
              Restore
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onArchive?.(workspace); }}
              className="flex-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg py-1.5 transition-colors"
            >
              Archive
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
