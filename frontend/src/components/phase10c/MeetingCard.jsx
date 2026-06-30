import { FiVideo, FiCalendar, FiClock, FiUser, FiEdit2, FiX } from 'react-icons/fi';
import MeetingStatusBadge from './MeetingStatusBadge';

function formatTime(time) {
  if (!time) return '';
  const p = time.split(':');
  if (p.length < 2) return time;
  const h = parseInt(p[0], 10), m = p[1];
  return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

function formatEndTime(time, dur) {
  if (!time || !dur) return null;
  const p = time.split(':');
  const total = parseInt(p[0], 10) * 60 + parseInt(p[1], 10) + dur;
  const h = Math.floor(total / 60) % 24, m = total % 60;
  return formatTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
}

export default function MeetingCard({ meeting, onView, onEdit, onCancel }) {
  const startTime = formatTime(meeting.time);
  const endTime = formatEndTime(meeting.time, meeting.duration);
  const attendeeCount = meeting.attendee_count ?? meeting.attendees?.length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group"
      onClick={() => onView?.(meeting)}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
            <FiVideo className="w-4 h-4 text-violet-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
              {meeting.title}
            </p>
            <MeetingStatusBadge status={meeting.status} />
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}>
          {onEdit && <button onClick={() => onEdit(meeting)}
            className="p-1.5 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Edit">
            <FiEdit2 className="w-3.5 h-3.5" />
          </button>}
          {onCancel && <button onClick={() => onCancel(meeting)}
            className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Cancel">
            <FiX className="w-3.5 h-3.5" />
          </button>}
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
          {(meeting.organizer || meeting.organizer_name) && (
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <FiUser className="w-3 h-3 text-gray-400" />
              {meeting.organizer || meeting.organizer_name}
            </div>
          )}
          {attendeeCount !== undefined && attendeeCount !== null && (
            <div className="text-[11px] text-gray-500">{attendeeCount} attendee{attendeeCount !== 1 ? 's' : ''}</div>
          )}
        </div>
      </div>
    </div>
  );
}
