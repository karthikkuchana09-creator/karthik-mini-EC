import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  FiVideo, FiPlus, FiEdit2, FiX, FiClock, FiCalendar, FiUser,
  FiUsers, FiSearch, FiUserPlus, FiFileText, FiSave, FiCpu,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { meetingService } from '../../services/meetingService';
import { getUsers } from '../../api/users';
import { getErrorMessage } from '../../utils/errorHandler';
import Modal from '../../components/ui/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const STATUS_STYLE = {
  scheduled: { bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  in_progress: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  completed: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  cancelled: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
};

const ATTENDEE_STATUS_STYLE = {
  invited: { bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500', label: 'Invited' },
  accepted: { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', label: 'Accepted' },
  declined: { bg: 'bg-red-50 text-red-700', dot: 'bg-red-500', label: 'Declined' },
  tentative: { bg: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', label: 'Tentative' },
};

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180];

function formatTimeDisplay(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function addMinutesToTime(timeStr, mins) {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  const total = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + mins;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatEndTime(timeStr, mins) {
  const end = addMinutesToTime(timeStr, mins);
  return formatTimeDisplay(end);
}

export default function ProjectMeetingsPage() {
  const { projectId } = useParams();
  const pid = Number(projectId);

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editMeeting, setEditMeeting] = useState(null);
  const [viewMeeting, setViewMeeting] = useState(null);
  const [cancelMeeting, setCancelMeeting] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '', description: '', date: '', time: '', duration: 60, organizer: '',
  });

  const [attendees, setAttendees] = useState([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [addingAttendee, setAddingAttendee] = useState(false);
  const [removingAttendeeId, setRemovingAttendeeId] = useState(null);
  const [confirmRemoveAttendee, setConfirmRemoveAttendee] = useState(null);

  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [detailSection, setDetailSection] = useState('attendees');

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await meetingService.getProjectMeetings(pid);
      setMeetings(Array.isArray(data) ? data : data?.items || data?.results || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load meetings'));
      toast.error(getErrorMessage(err, 'Failed to load meetings'));
    } finally {
      setLoading(false);
    }
  }, [pid]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]); // eslint-disable-line react-hooks/set-state-in-effect

  function openCreate() {
    setEditMeeting(null);
    setFormData({ title: '', description: '', date: '', time: '', duration: 60, organizer: '' });
    setShowModal(true);
  }

  function openEdit(meeting) {
    setEditMeeting(meeting);
    setFormData({
      title: meeting.title || '',
      description: meeting.description || '',
      date: meeting.date ? meeting.date.slice(0, 10) : '',
      time: meeting.time || '',
      duration: meeting.duration || 60,
      organizer: meeting.organizer || meeting.organizer_name || '',
    });
    setShowModal(true);
  }

  function openView(meeting) {
    setViewMeeting(meeting);
    setAttendeeSearch('');
    setDetailSection('attendees');
    setShowAddNote(false);
    setNoteContent('');
    setEditingNoteId(null);
    fetchAttendees(meeting.id);
    fetchNotes(meeting.id);
    fetchSummary(meeting.id);
    if (allUsers.length === 0) {
      getUsers().then((data) => {
        setAllUsers(Array.isArray(data) ? data : data?.items || data?.results || []);
      }).catch(() => {});
    }
  }

  const fetchAttendees = useCallback(async (meetingId) => {
    if (!meetingId) return;
    setAttendeesLoading(true);
    try {
      const data = await meetingService.getMeetingAttendees(meetingId);
      setAttendees(Array.isArray(data) ? data : data?.items || data?.results || []);
    } catch {
      setAttendees([]);
    } finally {
      setAttendeesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewMeeting) {
      fetchAttendees(viewMeeting.id);
    }
  }, [viewMeeting, fetchAttendees]);

  async function handleAddAttendee(userId) {
    if (!viewMeeting || addingAttendee) return;
    setAddingAttendee(true);
    try {
      await meetingService.addMeetingAttendee(viewMeeting.id, { user_id: userId });
      toast.success('Attendee invited');
      setAttendeeSearch('');
      fetchAttendees(viewMeeting.id);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to invite attendee'));
    } finally {
      setAddingAttendee(false);
    }
  }

  const fetchNotes = useCallback(async (meetingId) => {
    if (!meetingId) return;
    setNotesLoading(true);
    try {
      const data = await meetingService.getMeetingNotes(meetingId);
      setNotes(Array.isArray(data) ? data : data?.items || data?.results || []);
    } catch {
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, []);

  async function handleAddNote() {
    if (!viewMeeting || !noteContent.trim() || noteSaving) return;
    setNoteSaving(true);
    try {
      await meetingService.createMeetingNote(viewMeeting.id, { content: noteContent.trim() });
      toast.success('Note added');
      setNoteContent('');
      setShowAddNote(false);
      fetchNotes(viewMeeting.id);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to add note'));
    } finally {
      setNoteSaving(false);
    }
  }

  async function handleUpdateNote(noteId) {
    if (!editNoteContent.trim() || noteSaving) return;
    setNoteSaving(true);
    try {
      await meetingService.updateMeetingNote(noteId, { content: editNoteContent.trim() });
      toast.success('Note updated');
      setEditingNoteId(null);
      setEditNoteContent('');
      fetchNotes(viewMeeting.id);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update note'));
    } finally {
      setNoteSaving(false);
    }
  }

  const fetchSummary = useCallback(async (meetingId) => {
    if (!meetingId) return;
    setSummaryLoading(true);
    try {
      const data = await meetingService.getMeetingSummary(meetingId);
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  function startEditNote(note) {
    setEditingNoteId(note.id);
    setEditNoteContent(note.content || '');
  }

  function cancelEditNote() {
    setEditingNoteId(null);
    setEditNoteContent('');
  }

  async function handleRemoveAttendee() {
    if (!viewMeeting || !confirmRemoveAttendee) return;
    setRemovingAttendeeId(confirmRemoveAttendee.user_id || confirmRemoveAttendee.id);
    try {
      const userId = confirmRemoveAttendee.user_id || confirmRemoveAttendee.id;
      await meetingService.removeMeetingAttendee(viewMeeting.id, userId);
      toast.success('Attendee removed');
      setConfirmRemoveAttendee(null);
      fetchAttendees(viewMeeting.id);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to remove attendee'));
    } finally {
      setRemovingAttendeeId(null);
    }
  }

  function openCancel(meeting) {
    setCancelMeeting(meeting);
  }

  async function handleSave() {
    if (!formData.title.trim() || !formData.date) return;
    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        date: formData.date,
        time: formData.time,
        duration: Number(formData.duration),
        organizer: formData.organizer.trim() || undefined,
      };
      if (editMeeting) {
        await meetingService.updateProjectMeeting(pid, editMeeting.id, payload);
        toast.success('Meeting updated');
      } else {
        await meetingService.createProjectMeeting(pid, payload);
        toast.success('Meeting scheduled');
      }
      setShowModal(false);
      setEditMeeting(null);
      fetchMeetings();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save meeting'));
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!cancelMeeting) return;
    setCancelling(true);
    try {
      await meetingService.deleteProjectMeeting(pid, cancelMeeting.id);
      toast.success('Meeting cancelled');
      setCancelMeeting(null);
      fetchMeetings();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to cancel meeting'));
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <div className="py-8"><LoadingSpinner text="Loading meetings..." /></div>;
  if (error) return (
    <div className="py-8">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center justify-between">
        <span>{error}</span>
        <button onClick={fetchMeetings} className="text-xs font-medium text-red-700 underline hover:no-underline">Retry</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <FiVideo className="w-4 h-4 text-gray-500" />
          Meetings <span className="text-gray-400 font-normal">({meetings.length})</span>
        </h3>
        <button onClick={openCreate} className="btn-secondary btn-sm">
          <FiPlus className="w-3.5 h-3.5" /> Schedule Meeting
        </button>
      </div>

      {meetings.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <FiVideo className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No meetings scheduled</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Schedule meetings to coordinate with your project team</p>
          <button onClick={openCreate} className="btn-primary btn-sm">
            <FiPlus className="w-3.5 h-3.5" /> Schedule Meeting
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {meetings.map((meeting) => {
            const statusCfg = STATUS_STYLE[meeting.status] || STATUS_STYLE.scheduled;
            const attendeeCount = meeting.attendee_count ?? meeting.attendees?.length;
            const startTime = formatTimeDisplay(meeting.time);
            const endTime = meeting.time && meeting.duration ? formatEndTime(meeting.time, meeting.duration) : null;
            return (
              <div key={meeting.id}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group"
                onClick={() => openView(meeting)}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                      <FiVideo className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                        {meeting.title}
                      </p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {meeting.status || 'scheduled'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(meeting)}
                      className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Edit">
                      <FiEdit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => openCancel(meeting)}
                      className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Cancel">
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {meeting.description && (
                  <p className="text-xs text-gray-500 line-clamp-1 mb-2">{meeting.description}</p>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <FiCalendar className="w-3 h-3 text-gray-400" />
                    {meeting.date ? new Date(meeting.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}
                    {startTime && <span className="text-gray-400">at {startTime}</span>}
                  </div>
                  {endTime && (
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <FiClock className="w-3 h-3 text-gray-400" />
                      Ends at {endTime} ({meeting.duration} min)
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    {meeting.organizer || meeting.organizer_name ? (
                      <div className="flex items-center gap-1 text-[11px] text-gray-500">
                        <FiUser className="w-3 h-3 text-gray-400" />
                        {meeting.organizer || meeting.organizer_name}
                      </div>
                    ) : null}
                    {attendeeCount !== undefined && attendeeCount !== null && (
                      <div className="flex items-center gap-1 text-[11px] text-gray-500">
                        <FiUsers className="w-3 h-3 text-gray-400" />
                        {attendeeCount} attendee{attendeeCount !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditMeeting(null); }}
        title={editMeeting ? 'Edit Meeting' : 'Schedule Meeting'} size="md">
        <div className="space-y-4">
          <div>
            <label className="label-required">Meeting Title</label>
            <input className="input" placeholder="e.g. Sprint Planning"
              value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[60px] resize-none" placeholder="Agenda, goals, or notes..."
              rows={2} value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-required">Date</label>
              <input type="date" className="input" value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div>
              <label className="label">Start Time</label>
              <input type="time" className="input" value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Duration</label>
            <div className="flex flex-wrap gap-1.5">
              {DURATION_OPTIONS.map((d) => (
                <button key={d} type="button" onClick={() => setFormData({ ...formData, duration: d })}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                    formData.duration === d
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}>
                  {d < 60 ? `${d}m` : `${d >= 120 ? d / 60 : ''}${d === 60 ? '1' : ''}h${d > 60 && d % 60 !== 0 ? ` ${d % 60}m` : ''}`}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Organizer</label>
            <input className="input" placeholder="Organizer name"
              value={formData.organizer}
              onChange={(e) => setFormData({ ...formData, organizer: e.target.value })} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2 mt-4 border-t border-gray-100">
            <button type="button" onClick={() => { setShowModal(false); setEditMeeting(null); }}
              className="btn-secondary" disabled={saving}>Cancel</button>
            <button type="button" onClick={handleSave}
              disabled={!formData.title.trim() || !formData.date || saving} className="btn-primary">
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </span>
              ) : editMeeting ? 'Update Meeting' : 'Schedule Meeting'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!viewMeeting} onClose={() => { setViewMeeting(null); setAttendeeSearch(''); }} title="Meeting Details" size="md">
        {viewMeeting && (
          <div className="space-y-5">
            {(() => {
              const m = viewMeeting;
              const statusCfg = STATUS_STYLE[m.status] || STATUS_STYLE.scheduled;
              const startTime = formatTimeDisplay(m.time);
              const endTime = m.time && m.duration ? formatEndTime(m.time, m.duration) : null;
              return (
                <>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                      <FiVideo className="w-6 h-6 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{m.title}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {m.status || 'scheduled'}
                      </span>
                    </div>
                  </div>

                  {m.description && (
                    <p className="text-sm text-gray-700 leading-relaxed">{m.description}</p>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-gray-500 mb-1">Date</p>
                      <p className="text-xs font-semibold text-gray-900 flex items-center justify-center gap-1">
                        <FiCalendar className="w-3 h-3 text-gray-400" />
                        {m.date ? new Date(m.date).toLocaleDateString() : '-'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-gray-500 mb-1">Start Time</p>
                      <p className="text-xs font-semibold text-gray-900 flex items-center justify-center gap-1">
                        <FiClock className="w-3 h-3 text-gray-400" />
                        {startTime || '-'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-gray-500 mb-1">End Time</p>
                      <p className="text-xs font-semibold text-gray-900 flex items-center justify-center gap-1">
                        <FiClock className="w-3 h-3 text-gray-400" />
                        {endTime || '-'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-gray-500 mb-1">Duration</p>
                      <p className="text-xs font-semibold text-gray-900">{m.duration || '-'} min</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-gray-500 mb-1">Organizer</p>
                      <p className="text-xs font-semibold text-gray-900 truncate flex items-center justify-center gap-1">
                        <FiUser className="w-3 h-3 text-gray-400" />
                        {m.organizer || m.organizer_name || 'Not specified'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-gray-500 mb-1">Attendees</p>
                      <p className="text-xs font-semibold text-gray-900 flex items-center justify-center gap-1">
                        <FiUsers className="w-3 h-3 text-gray-400" />
                        {attendees.length}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-1 mb-3">
                      <button onClick={() => setDetailSection('attendees')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          detailSection === 'attendees'
                            ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}>
                        <FiUsers className="w-3.5 h-3.5 inline mr-1" />
                        Attendees ({attendees.length})
                      </button>
                      <button onClick={() => setDetailSection('notes')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          detailSection === 'notes'
                            ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}>
                        <FiFileText className="w-3.5 h-3.5 inline mr-1" />
                        Notes ({notes.length})
                      </button>
                      <button onClick={() => setDetailSection('summary')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          detailSection === 'summary'
                            ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}>
                        <FiCpu className="w-3.5 h-3.5 inline mr-1" />
                        AI Summary
                      </button>
                    </div>

                    {detailSection === 'attendees' && (
                      <div>
                        <div className="relative mb-3">
                          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <input className="input pl-8 pr-2 text-xs h-8"
                            placeholder="Search users to invite..."
                            value={attendeeSearch}
                            onChange={(e) => setAttendeeSearch(e.target.value)} />
                        </div>

                        {attendeeSearch && (
                          <div className="mb-3 border border-gray-200 rounded-lg max-h-36 overflow-y-auto">
                            {allUsers
                              .filter((u) => {
                                const q = attendeeSearch.toLowerCase();
                                return (u.name || '').toLowerCase().includes(q) ||
                                       (u.email || '').toLowerCase().includes(q);
                              })
                              .filter((u) => !attendees.some((a) => (a.user_id || a.id) === u.id))
                              .slice(0, 10)
                              .map((user) => (
                                <div key={user.id}
                                  className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                      <span className="text-[10px] font-semibold text-indigo-600">
                                        {(user.name || user.email || '?').charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-gray-700 truncate">{user.name || 'Unnamed'}</p>
                                      <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                                    </div>
                                  </div>
                                  <button onClick={() => handleAddAttendee(user.id)}
                                    disabled={addingAttendee}
                                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition-colors disabled:opacity-50">
                                    <FiUserPlus className="w-3 h-3" /> Invite
                                  </button>
                                </div>
                              ))}
                            {allUsers.filter((u) => {
                              const q = attendeeSearch.toLowerCase();
                              return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
                            }).filter((u) => !attendees.some((a) => (a.user_id || a.id) === u.id)).length === 0 && (
                              <p className="text-[11px] text-gray-400 text-center py-3">No matching users found</p>
                            )}
                          </div>
                        )}

                        {attendeesLoading ? (
                          <div className="py-4"><LoadingSpinner text="Loading attendees..." /></div>
                        ) : attendees.length === 0 ? (
                          <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-xs text-gray-400">No attendees yet. Search and invite users above.</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {attendees.map((att) => {
                              const statusCfg = ATTENDEE_STATUS_STYLE[att.status] || ATTENDEE_STATUS_STYLE.invited;
                              return (
                                <div key={att.id}
                                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                      <span className="text-[11px] font-semibold text-indigo-600">
                                        {(att.name || att.email || '?').charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs font-medium text-gray-700 truncate">{att.name || 'Unnamed'}</p>
                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${statusCfg.bg}`}>
                                          <span className={`w-1 h-1 rounded-full ${statusCfg.dot}`} />
                                          {statusCfg.label}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-gray-400 truncate">{att.email}</p>
                                    </div>
                                  </div>
                                  <button onClick={() => setConfirmRemoveAttendee(att)}
                                    className="p-1.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                                    title="Remove attendee">
                                    <FiX className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {detailSection === 'summary' && (
                      <div>
                        {summaryLoading ? (
                          <div className="py-4"><LoadingSpinner text="Loading summary..." /></div>
                        ) : !summary ? (
                          <div className="bg-gray-50 rounded-lg p-8 text-center">
                            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
                              <FiCpu className="w-5 h-5 text-amber-500" />
                            </div>
                            <p className="text-sm font-medium text-gray-700">No AI summary available</p>
                            <p className="text-xs text-gray-400 mt-1">The meeting hasn't been summarized yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center">
                                <FiCpu className="w-3.5 h-3.5 text-amber-600" />
                              </div>
                              <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">AI Generated</span>
                              {summary.created_at && (
                                <span className="text-[10px] text-gray-400">{new Date(summary.created_at).toLocaleString()}</span>
                              )}
                            </div>

                            <div className="bg-white rounded-lg border border-gray-200 p-4">
                              <h5 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                                </svg>
                                Summary
                              </h5>
                              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{summary.summary || summary.content || '-'}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <h5 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                  </svg>
                                  Action Items
                                </h5>
                                {summary.action_items && summary.action_items.length > 0 ? (
                                  <ul className="space-y-1">
                                    {summary.action_items.map((item, i) => (
                                      <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 flex-shrink-0" />
                                        {typeof item === 'string' ? item : item.text || item.title || JSON.stringify(item)}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-[11px] text-gray-400">No action items</p>
                                )}
                              </div>

                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <h5 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                  Risks
                                </h5>
                                {summary.risks && summary.risks.length > 0 ? (
                                  <ul className="space-y-1">
                                    {summary.risks.map((item, i) => (
                                      <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1 flex-shrink-0" />
                                        {typeof item === 'string' ? item : item.text || item.title || JSON.stringify(item)}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-[11px] text-gray-400">No risks identified</p>
                                )}
                              </div>

                              <div className="bg-white rounded-lg border border-gray-200 p-4">
                                <h5 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Decisions
                                </h5>
                                {summary.decisions && summary.decisions.length > 0 ? (
                                  <ul className="space-y-1">
                                    {summary.decisions.map((item, i) => (
                                      <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 flex-shrink-0" />
                                        {typeof item === 'string' ? item : item.text || item.title || JSON.stringify(item)}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-[11px] text-gray-400">No decisions recorded</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {detailSection === 'notes' && (
                      <div>
                        {!showAddNote && (
                          <button onClick={() => setShowAddNote(true)}
                            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 mb-3 transition-colors">
                            <FiPlus className="w-3.5 h-3.5" /> Add Note
                          </button>
                        )}

                        {showAddNote && (
                          <div className="mb-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <textarea className="input min-h-[72px] resize-none text-xs"
                              placeholder="Write your notes here... (supports HTML)"
                              rows={3} value={noteContent}
                              onChange={(e) => setNoteContent(e.target.value)} />
                            <div className="flex items-center justify-end gap-2 mt-2">
                              <button onClick={() => { setShowAddNote(false); setNoteContent(''); }}
                                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1" disabled={noteSaving}>
                                Cancel
                              </button>
                              <button onClick={handleAddNote}
                                disabled={!noteContent.trim() || noteSaving}
                                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                                {noteSaving ? (
                                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : (
                                  <><FiSave className="w-3.5 h-3.5" /> Save Note</>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {notesLoading ? (
                          <div className="py-4"><LoadingSpinner text="Loading notes..." /></div>
                        ) : notes.length === 0 ? (
                          <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-xs text-gray-400">No notes yet. Add the first note above.</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {notes.slice().reverse().map((note) => (
                              <div key={note.id}
                                className="bg-gray-50 rounded-lg p-3 border border-gray-100 group">
                                {editingNoteId === note.id ? (
                                  <div>
                                    <textarea className="input min-h-[60px] resize-none text-xs"
                                      rows={2} value={editNoteContent}
                                      onChange={(e) => setEditNoteContent(e.target.value)} />
                                    <div className="flex items-center justify-end gap-2 mt-2">
                                      <button onClick={cancelEditNote}
                                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1" disabled={noteSaving}>
                                        Cancel
                                      </button>
                                      <button onClick={() => handleUpdateNote(note.id)}
                                        disabled={!editNoteContent.trim() || noteSaving}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                                        {noteSaving ? (
                                          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                          </svg>
                                        ) : (
                                          <><FiSave className="w-3.5 h-3.5" /> Update</>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap"
                                          dangerouslySetInnerHTML={{ __html: note.content || '' }} />
                                      </div>
                                      <button onClick={() => startEditNote(note)}
                                        className="p-1 rounded text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                                        title="Edit note">
                                        <FiEdit2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                                      {note.version !== undefined && (
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-200/60 text-gray-500">
                                          v{note.version}
                                        </span>
                                      )}
                                      {note.created_by_name && (
                                        <span>{note.created_by_name}</span>
                                      )}
                                      {note.created_at && (
                                        <span>{new Date(note.created_at).toLocaleString()}</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={!!cancelMeeting}
        onClose={() => setCancelMeeting(null)}
        onConfirm={handleCancel}
        title="Cancel Meeting"
        message={`Are you sure you want to cancel "${cancelMeeting?.title}"? This will notify attendees.`}
        confirmText={cancelling ? 'Cancelling...' : 'Cancel Meeting'}
        loading={cancelling}
        variant="danger"
      />

      <ConfirmModal
        isOpen={!!confirmRemoveAttendee}
        onClose={() => setConfirmRemoveAttendee(null)}
        onConfirm={handleRemoveAttendee}
        title="Remove Attendee"
        message={`Remove ${confirmRemoveAttendee?.name || 'this attendee'} from the meeting?`}
        confirmText={removingAttendeeId ? 'Removing...' : 'Remove'}
        loading={!!removingAttendeeId}
        variant="danger"
      />
    </div>
  );
}
