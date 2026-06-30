import { FiVideo, FiClock, FiCalendar, FiUser } from 'react-icons/fi';
import MeetingStatusBadge from './MeetingStatusBadge';

export default function MeetingTimeline({ meetings = [], onSelect }) {
  if (meetings.length === 0) return null;

  const sorted = [...meetings].sort((a, b) => {
    const da = a.date ? new Date(a.date) : new Date(0);
    const db = b.date ? new Date(b.date) : new Date(0);
    return db - da;
  });

  return (
    <div className="relative">
      <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-200 rounded-full" />
      <div className="space-y-4">
        {sorted.map((meeting, i) => {
          const isLast = i === sorted.length - 1;
          return (
            <div key={meeting.id} className="relative pl-10">
              <div className={`absolute left-[9px] w-3 h-3 rounded-full bg-violet-500 ring-2 ring-white mt-1.5 ${isLast ? '' : ''}`} />
              <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer"
                onClick={() => onSelect?.(meeting)}>
                <div className="flex items-center gap-2 mb-1.5">
                  <FiVideo className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                  <p className="text-xs font-semibold text-gray-900 truncate">{meeting.title}</p>
                  <MeetingStatusBadge status={meeting.status} />
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1"><FiCalendar className="w-3 h-3" />{meeting.date ? new Date(meeting.date).toLocaleDateString() : '-'}</span>
                  {meeting.time && <span className="flex items-center gap-1"><FiClock className="w-3 h-3" />{meeting.time}</span>}
                  {(meeting.organizer || meeting.organizer_name) && <span className="flex items-center gap-1"><FiUser className="w-3 h-3" />{meeting.organizer || meeting.organizer_name}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
