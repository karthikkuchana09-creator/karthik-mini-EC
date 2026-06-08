import { useNavigate } from 'react-router-dom';

const TYPE_CONFIG = {
  Public: { bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500', icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z' },
  Private: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', icon: 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z' },
  Announcement: { bg: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500', icon: 'M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38a.804.804 0 01-.84-.066 4.49 4.49 0 01-1.692-3.284m5.742-.324a30.07 30.07 0 01-2.674-.09m5.258-5.67a30.06 30.06 0 012.674.09M10.34 6.16a30.07 30.07 0 012.674.09m0 0a30.07 30.07 0 015.858 1.426 30.09 30.09 0 01-5.858 5.858m-5.674-7.284a4.49 4.49 0 011.692 3.284 4.463 4.463 0 01-.985 2.783m0 0a30.07 30.07 0 01.985 2.783' },
  Project: { bg: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500', icon: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z' },
};

const STATUS_STYLES = {
  active: 'border-l-4 border-l-emerald-500',
  archived: 'border-l-4 border-l-gray-300 opacity-75',
};

const TYPE_GRADIENTS = {
  Public: 'from-blue-500 to-blue-600',
  Private: 'from-amber-500 to-amber-600',
  Announcement: 'from-purple-500 to-purple-600',
  Project: 'from-orange-500 to-orange-600',
};

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
}

export default function ChannelCard({ channel, onArchive, onRestore, onJoin, onLeave, isMember }) {
  const navigate = useNavigate();
  const { id, name, description, type, status, member_count } = channel;
  const isArchived = status === 'archived';

  const typeCfg = TYPE_CONFIG[type] || TYPE_CONFIG.Public;
  const borderClass = isArchived ? STATUS_STYLES.archived : STATUS_STYLES.active;
  const gradient = TYPE_GRADIENTS[type] || TYPE_GRADIENTS.Public;
  const bannerIdx = hashCode(name || id) % 8;
  const bannerGradients = [
    'from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600',
    'from-purple-500 to-violet-600', 'from-orange-500 to-rose-600',
    'from-cyan-500 to-blue-600', 'from-pink-500 to-rose-600',
    'from-amber-500 to-orange-600', 'from-teal-500 to-cyan-600',
  ];

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-lg transition-all cursor-pointer group ${borderClass}`}
      onClick={() => navigate(`/channels/${id}`)}
    >
      <div className={`h-16 rounded-t-2xl bg-gradient-to-br ${bannerGradients[bannerIdx % bannerGradients.length]} flex items-center px-4 relative overflow-hidden`}>
        <div className="w-9 h-9 rounded-lg bg-white/20 ring-2 ring-white/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d={typeCfg.icon} />
          </svg>
        </div>
        {isArchived && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-white/90 text-[10px] font-semibold text-gray-500">
            Archived
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
              # {name}
            </h3>
          </div>
          {isMember !== undefined && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
              isMember ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {isMember ? 'Joined' : 'Not joined'}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-3">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${typeCfg.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${typeCfg.dot}`} />
            {type}
          </span>
          {member_count !== undefined && (
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              {member_count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/channels/${id}`); }}
            className="flex-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg py-1.5 transition-colors"
          >
            View
          </button>
          {isMember !== undefined && onJoin && onLeave && (
            isMember ? (
              <button
                onClick={(e) => { e.stopPropagation(); onLeave(channel); }}
                className="flex-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg py-1.5 transition-colors"
              >
                Leave
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onJoin(channel); }}
                className="flex-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg py-1.5 transition-colors"
              >
                Join
              </button>
            )
          )}
          {isArchived ? (
            <button
              onClick={(e) => { e.stopPropagation(); onRestore?.(channel); }}
              className="flex-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg py-1.5 transition-colors"
            >
              Restore
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onArchive?.(channel); }}
              className="text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg py-1.5 px-3 transition-colors"
            >
              Archive
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
