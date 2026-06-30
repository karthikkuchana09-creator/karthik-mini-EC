import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiFolder, FiUser, FiCalendar, FiClock,
  FiTarget, FiFileText, FiVideo, FiMessageSquare,
  FiActivity, FiPlus,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { projectService } from '../../services/projectService';
import { meetingService } from '../../services/meetingService';
import { getErrorMessage } from '../../utils/errorHandler';
import { PROJECT_TAB_CONFIG } from '../../utils/phase10cConstants';
import Breadcrumb from '../../components/ui/Breadcrumb';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

const ProjectTeamsPage = lazy(() => import('./ProjectTeamsPage'));
const ProjectChannelsPage = lazy(() => import('./ProjectChannelsPage'));
const ProjectTasksPage = lazy(() => import('./ProjectTasksPage'));
const ProjectDocumentsPage = lazy(() => import('./ProjectDocumentsPage'));
const ProjectMeetingsPage = lazy(() => import('./ProjectMeetingsPage'));
const ProjectCalendarPage = lazy(() => import('./ProjectCalendarPage'));

const STATUS_STYLES = {
  PLANNED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  ON_HOLD: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  COMPLETED: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

const HEADER_STATUS_STYLES = {
  PLANNED: 'bg-blue-400/20 text-blue-100',
  ACTIVE: 'bg-emerald-400/20 text-emerald-100',
  ON_HOLD: 'bg-amber-400/20 text-amber-100',
  COMPLETED: 'bg-indigo-400/20 text-indigo-100',
  CANCELLED: 'bg-gray-400/20 text-gray-200',
};

const PRIORITY_STYLES = {
  LOW: { bg: 'bg-slate-100', text: 'text-slate-600' },
  MEDIUM: { bg: 'bg-blue-50', text: 'text-blue-700' },
  HIGH: { bg: 'bg-orange-50', text: 'text-orange-700' },
  CRITICAL: { bg: 'bg-red-50', text: 'text-red-700' },
};

const ACTIVITY_ICONS = {
  task_created: FiTarget,
  task_updated: FiTarget,
  task_completed: FiTarget,
  member_added: FiUser,
  member_removed: FiUser,
  team_assigned: FiFolder,
  team_removed: FiFolder,
  document_uploaded: FiFileText,
  document_deleted: FiFileText,
  meeting_scheduled: FiVideo,
  meeting_completed: FiVideo,
  channel_created: FiMessageSquare,
  status_changed: FiActivity,
  priority_changed: FiActivity,
};

const ACTIVITY_COLORS = {
  task_created: 'text-blue-500',
  task_updated: 'text-amber-500',
  task_completed: 'text-emerald-500',
  member_added: 'text-indigo-500',
  member_removed: 'text-red-500',
  team_assigned: 'text-purple-500',
  document_uploaded: 'text-cyan-500',
  meeting_scheduled: 'text-violet-500',
  status_changed: 'text-orange-500',
};

function OverviewTab({ project }) {
  const pid = project.id;
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loadingSections, setLoadingSections] = useState({});

  const statusStyle = STATUS_STYLES[project.status] || STATUS_STYLES.PLANNED;
  const priorityStyle = PRIORITY_STYLES[project.priority] || PRIORITY_STYLES.MEDIUM;

  useEffect(() => {
    if (!pid) return;
    let cancelled = false;

    async function fetchAll() {
      setLoadingSections({ teams: true, tasks: true, documents: true, meetings: true, activity: true });

      try {
        const data = await projectService.getProjectTeams(pid);
        if (!cancelled) setTeams(Array.isArray(data) ? data : data?.items || data?.results || []);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingSections((s) => ({ ...s, teams: false })); }

      try {
        const data = await projectService.getProjectTasks(pid, { limit: 5, sort: '-updated_at' });
        if (!cancelled) setTasks(Array.isArray(data) ? data : data?.items || data?.results || []);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingSections((s) => ({ ...s, tasks: false })); }

      try {
        const data = await projectService.getProjectDocuments(pid, { limit: 5, sort: '-updated_at' });
        if (!cancelled) setDocuments(Array.isArray(data) ? data : data?.items || data?.results || []);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingSections((s) => ({ ...s, documents: false })); }

      try {
        const data = await meetingService.getProjectMeetings(pid, { limit: 5 });
        if (!cancelled) setMeetings(Array.isArray(data) ? data : data?.items || data?.results || []);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingSections((s) => ({ ...s, meetings: false })); }

      try {
        const data = await projectService.getProjectActivity(pid, { limit: 10 });
        if (!cancelled) setActivity(Array.isArray(data) ? data : data?.items || data?.results || []);
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoadingSections((s) => ({ ...s, activity: false })); }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [pid]);

  const summaryStats = [
    { label: 'Owner', value: project.owner || 'Not assigned', icon: FiUser },
    {
      label: 'Status', value: project.status,
      render: () => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${statusStyle.bg} ${statusStyle.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
          {project.status}
        </span>
      ),
    },
    {
      label: 'Priority', value: project.priority,
      render: () => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${priorityStyle.bg} ${priorityStyle.text}`}>
          {project.priority}
        </span>
      ),
    },
    { label: 'Start Date', value: project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set', icon: FiCalendar },
    { label: 'End Date', value: project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set', icon: FiCalendar },
    { label: 'Teams', value: teams.length, icon: FiFolder },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-gray-50 rounded-lg p-5">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Project Summary</h4>
        <p className="text-sm text-gray-700 leading-relaxed">{project.description || 'No description provided.'}</p>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Details</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {summaryStats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              {stat.icon && <stat.icon className="w-4 h-4 text-gray-400 mx-auto mb-1.5" />}
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              {stat.render ? stat.render() : (
                <p className="text-sm font-semibold text-gray-900 truncate">{stat.value}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Teams</h4>
        </div>
        {loadingSections.teams ? (
          <div className="flex gap-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-9 w-28 bg-gray-100 rounded-lg animate-pulse" />)}</div>
        ) : teams.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <FiFolder className="w-6 h-6 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No teams assigned yet</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {teams.map((team) => (
              <div key={team.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium">
                <FiFolder className="w-3.5 h-3.5" />
                {team.name}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Tasks</h4>
            {tasks.length > 0 && (
              <span className="text-[10px] text-indigo-600 font-medium">Last 5</span>
            )}
          </div>
          {loadingSections.tasks ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : tasks.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <FiTarget className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No tasks yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {tasks.map((task) => (
                <div key={task.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'done' || task.status === 'completed' ? 'bg-emerald-400' : task.status === 'in_progress' ? 'bg-blue-400' : 'bg-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{task.title || task.name}</p>
                    <p className="text-[11px] text-gray-400">{task.assigned_to || task.assignee || 'Unassigned'}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Meetings</h4>
            {meetings.length > 0 && (
              <span className="text-[10px] text-indigo-600 font-medium">Last 5</span>
            )}
          </div>
          {loadingSections.meetings ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : meetings.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <FiVideo className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No meetings scheduled</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {meetings.map((meeting) => (
                <div key={meeting.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <FiVideo className="w-4 h-4 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{meeting.title || meeting.name}</p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                      <FiCalendar className="w-3 h-3" />
                      {meeting.date ? new Date(meeting.date).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    meeting.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                    meeting.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                    meeting.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {meeting.status || 'scheduled'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Documents</h4>
            {documents.length > 0 && (
              <span className="text-[10px] text-indigo-600 font-medium">Last 5</span>
            )}
          </div>
          {loadingSections.documents ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : documents.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <FiFileText className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No documents uploaded</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {documents.map((doc) => (
                <div key={doc.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
                    <FiFileText className="w-4 h-4 text-cyan-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{doc.name || doc.filename || doc.title}</p>
                    <p className="text-[11px] text-gray-400">{doc.type || doc.file_type || 'Unknown'}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {doc.updated_at || doc.created_at ? new Date(doc.updated_at || doc.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Activity</h4>
          </div>
          {loadingSections.activity ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : activity.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <FiActivity className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No recent activity</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {activity.map((item, idx) => {
                const Icon = ACTIVITY_ICONS[item.type] || FiActivity;
                const color = ACTIVITY_COLORS[item.type] || 'text-gray-400';
                return (
                  <div key={item.id || idx} className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{item.description || item.message || item.action}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabFallback() {
  return (
    <div className="py-8 space-y-4">
      <div className="flex gap-3">
        <div className="h-10 w-10 bg-gray-200 rounded-xl animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

const TAB_COMPONENTS = {
  overview: OverviewTab,
  teams: ProjectTeamsPage,
  channels: ProjectChannelsPage,
  tasks: ProjectTasksPage,
  documents: ProjectDocumentsPage,
  meetings: ProjectMeetingsPage,
  calendar: ProjectCalendarPage,
};

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const pid = Number(projectId);

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectService.getProject(pid);
      setProject(data);
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error('Project not found');
        navigate('/projects');
      } else {
        setError(getErrorMessage(err, 'Failed to load project'));
      }
    } finally {
      setLoading(false);
    }
  }, [pid, navigate]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container max-w-4xl">
        <div className="bg-white rounded-xl border border-gray-200 shadow-card p-12 text-center">
          <FiFolder className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Project</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button onClick={fetchProject} className="btn-secondary btn-sm">Try Again</button>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const statusStyle = STATUS_STYLES[project.status] || STATUS_STYLES.PLANNED;
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumb
        className="mb-6"
        items={[
          { label: 'Projects', to: '/projects' },
          { label: project.name },
        ]}
      />

      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 px-6 sm:px-8 pt-8 sm:pt-10 pb-20 sm:pb-24 relative">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'1\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

          <div className="flex items-end gap-5 sm:gap-6 relative z-10">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/15 ring-4 ring-white/40 flex items-center justify-center shadow-xl flex-shrink-0">
              <FiFolder className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
            </div>
            <div className="pb-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-sm truncate">
                {project.name}
              </h1>
              <div className="flex items-center flex-wrap gap-2 mt-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold ${HEADER_STATUS_STYLES[project.status] || HEADER_STATUS_STYLES.PLANNED}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                  {project.status || 'PLANNED'}
                </span>
                {project.priority && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-white/15 text-white/90">
                    {project.priority}
                  </span>
                )}
                {project.start_date && (
                  <span className="text-[11px] text-white/70 flex items-center gap-1">
                    <FiCalendar className="w-3 h-3" />
                    {new Date(project.start_date).toLocaleDateString()}
                  </span>
                )}
                {project.end_date && (
                  <span className="text-[11px] text-white/70 flex items-center gap-1">
                    <FiCalendar className="w-3 h-3" />
                    {new Date(project.end_date).toLocaleDateString()}
                  </span>
                )}
              </div>
              {project.description && (
                <p className="text-sm text-white/70 mt-2 max-w-2xl line-clamp-2">{project.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-8">
          <nav className="flex gap-1 -mt-4 sm:-mt-5 overflow-x-auto scrollbar-hide" aria-label="Project tabs">
            {PROJECT_TAB_CONFIG.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-t-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/70 border-b-white -mb-px z-10'
                      : 'bg-white text-gray-500 hover:text-gray-700 hover:shadow-sm border border-transparent hover:border-gray-200/50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-gray-200/70 p-6 sm:p-8">
          <Suspense fallback={<TabFallback />}>
            <div key={activeTab} className="animate-fadeSlideIn">
              {activeTab === 'overview' ? (
                <ActiveComponent project={project} />
              ) : (
                <ActiveComponent />
              )}
            </div>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
