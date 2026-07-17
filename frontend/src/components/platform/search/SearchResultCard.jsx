import { FiFile, FiUsers, FiCheckSquare, FiFolder, FiUser, FiCalendar, FiCheckCircle, FiBookOpen, FiMessageSquare } from 'react-icons/fi';

const MODULE_CONFIG = {
  tasks: { icon: FiCheckSquare, color: 'from-emerald-500 to-teal-500', label: 'Task' },
  projects: { icon: FiFolder, color: 'from-blue-500 to-indigo-500', label: 'Project' },
  teams: { icon: FiUsers, color: 'from-purple-500 to-pink-500', label: 'Team' },
  documents: { icon: FiFile, color: 'from-amber-500 to-orange-500', label: 'Document' },
  users: { icon: FiUser, color: 'from-cyan-500 to-sky-500', label: 'User' },
  meetings: { icon: FiCalendar, color: 'from-rose-500 to-red-500', label: 'Meeting' },
  approvals: { icon: FiCheckCircle, color: 'from-orange-500 to-red-500', label: 'Approval' },
  knowledge_articles: { icon: FiBookOpen, color: 'from-indigo-500 to-violet-500', label: 'Article' },
  messages: { icon: FiMessageSquare, color: 'from-pink-500 to-rose-500', label: 'Message' },
};

export default function SearchResultCard({ item, href }) {
  const cfg = MODULE_CONFIG[item.entity_type] || { icon: FiFile, color: 'from-gray-500 to-gray-600', label: item.entity_type };
  const Icon = cfg.icon;

  const Wrapper = href ? 'a' : 'div';
  const wrapperProps = href ? { href, target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className="block bg-white rounded-xl border border-gray-200/70 shadow-sm p-4 hover:shadow-md hover:border-gray-300 transition-all duration-200 group"
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center shadow-sm shrink-0 mt-0.5 group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
              {cfg.label}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
            {item.title}
          </h4>
          {item.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-gray-400 font-mono">#{item.id}</span>
            {item.user_name && (
              <span className="text-[10px] text-gray-400">{item.user_name}</span>
            )}
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
