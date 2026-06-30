import { FiUsers, FiFolder, FiVideo, FiFileText, FiCalendar, FiTarget, FiMessageSquare } from 'react-icons/fi';

export const PHASE10C_HIERARCHY = [
  { key: 'workspace', label: 'Workspace' },
  { key: 'teams', label: 'Teams' },
  { key: 'projects', label: 'Projects' },
  { key: 'projectTeams', label: 'Project Teams' },
  { key: 'projectChannels', label: 'Project Channels' },
  { key: 'projectTasks', label: 'Project Tasks' },
  { key: 'projectDocuments', label: 'Project Documents' },
  { key: 'projectMeetings', label: 'Project Meetings' },
  { key: 'projectCalendar', label: 'Project Calendar' },
];

export const PROJECT_TAB_CONFIG = [
  { key: 'overview', label: 'Overview', icon: FiFolder },
  { key: 'teams', label: 'Teams', icon: FiUsers },
  { key: 'channels', label: 'Channels', icon: FiMessageSquare },
  { key: 'tasks', label: 'Tasks', icon: FiTarget },
  { key: 'documents', label: 'Documents', icon: FiFileText },
  { key: 'meetings', label: 'Meetings', icon: FiVideo },
  { key: 'calendar', label: 'Calendar', icon: FiCalendar },
];

export const MEETING_STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', badge: 'badge-info' },
  in_progress: { label: 'In Progress', badge: 'badge-warning' },
  completed: { label: 'Completed', badge: 'badge-success' },
  cancelled: { label: 'Cancelled', badge: 'badge-danger' },
};

export const PROJECT_STATUS_CONFIG = {
  active: { label: 'Active', badge: 'badge-success' },
  on_hold: { label: 'On Hold', badge: 'badge-warning' },
  completed: { label: 'Completed', badge: 'badge-info' },
  archived: { label: 'Archived', badge: 'badge-neutral' },
};

export const DOCUMENT_TYPE_CONFIG = {
  pdf: { label: 'PDF', badge: 'badge-danger' },
  doc: { label: 'Word', badge: 'badge-info' },
  sheet: { label: 'Sheet', badge: 'badge-success' },
  image: { label: 'Image', badge: 'badge-purple' },
  other: { label: 'Other', badge: 'badge-neutral' },
};

export const CALENDAR_VIEW_CONFIG = {
  month: { label: 'Month' },
  week: { label: 'Week' },
  day: { label: 'Day' },
  agenda: { label: 'Agenda' },
};
