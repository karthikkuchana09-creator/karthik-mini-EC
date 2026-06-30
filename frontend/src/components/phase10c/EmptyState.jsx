import {
  FiFolder, FiUsers, FiCalendar, FiFileText, FiVideo, FiTarget, FiMessageSquare, FiInbox, FiSearch,
} from 'react-icons/fi';

const PRESETS = {
  noTeams: {
    icon: FiUsers,
    title: 'No teams',
    message: 'No teams have been created yet in this workspace.',
  },
  noProjects: {
    icon: FiFolder,
    title: 'No projects',
    message: 'No projects have been created yet.',
  },
  noProjectTeams: {
    icon: FiUsers,
    title: 'No team assignments',
    message: 'No teams are assigned to this project.',
  },
  noProjectChannels: {
    icon: FiMessageSquare,
    title: 'No channels',
    message: 'No channels have been created for this project.',
  },
  noProjectTasks: {
    icon: FiTarget,
    title: 'No tasks',
    message: 'No tasks have been created for this project.',
  },
  noProjectDocuments: {
    icon: FiFileText,
    title: 'No documents',
    message: 'No documents have been uploaded to this project.',
  },
  noMeetings: {
    icon: FiVideo,
    title: 'No meetings',
    message: 'No meetings have been scheduled.',
  },
  noCalendarEvents: {
    icon: FiCalendar,
    title: 'No events',
    message: 'No calendar events have been scheduled.',
  },
  noSearchResults: {
    icon: FiSearch,
    title: 'No results',
    message: 'No results match your search criteria.',
  },
};

export default function Phase10CEmptyState({
  icon,
  title = 'No data',
  message = 'There is nothing to display yet.',
  action,
  className = '',
  size = 'md',
  preset,
}) {
  if (preset && PRESETS[preset]) {
    const p = PRESETS[preset];
    icon = icon || p.icon;
    title = title || p.title;
    message = message || p.message;
  }

  const Icon = icon || FiInbox;

  const sizeMap = {
    sm: { icon: 'w-6 h-6', wrapper: 'p-3', title: 'text-base', message: 'text-xs', py: 'py-10' },
    md: { icon: 'w-8 h-8', wrapper: 'p-4', title: 'text-lg', message: 'text-sm', py: 'py-16' },
    lg: { icon: 'w-12 h-12', wrapper: 'p-5', title: 'text-xl', message: 'text-sm', py: 'py-20' },
  };

  const s = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex flex-col items-center justify-center ${s.py} px-4 ${className}`} role="status">
      <div className={`${s.wrapper} rounded-full bg-gray-100 mb-4`}>
        <Icon className={`${s.icon} text-gray-400`} aria-hidden="true" />
      </div>
      <h3 className={`${s.title} font-semibold text-gray-900 mb-1`}>{title}</h3>
      <p className={`${s.message} text-gray-500 text-center max-w-sm mb-4`}>{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
