import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  FiChevronLeft, FiChevronRight, FiTarget, FiVideo,
  FiFlag, FiUpload, FiCalendar, FiClock, FiUser,
  FiX, FiList,
} from 'react-icons/fi';
import { calendarService } from '../../services/calendarService';
import { getErrorMessage } from '../../utils/errorHandler';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Phase10CEmptyState from '../../components/phase10c/EmptyState';

const VIEWS = ['month', 'week', 'day'];

const TYPE_STYLES = {
  task: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', border: 'border-l-blue-500', icon: FiTarget, label: 'Task' },
  meeting: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', border: 'border-l-violet-500', icon: FiVideo, label: 'Meeting' },
  milestone: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-l-amber-500', icon: FiFlag, label: 'Milestone' },
  release: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-l-emerald-500', icon: FiUpload, label: 'Release' },
};

const CALENDAR_COLORS = {
  task: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  meeting: { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  milestone: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  release: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_MIN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getMonthDays(year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const days = [];
  const startDow = start.getDay();
  for (let i = 0; i < startDow; i++) {
    days.push(null);
  }
  for (let d = 1; d <= end.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  while (days.length % 7 !== 0) {
    days.push(null);
  }
  return days;
}

function isSameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(d) {
  return isSameDay(d, new Date());
}

function eventDate(event) {
  if (!event) return null;
  const d = event.date || event.due_date || event.start_date || event.event_date;
  return d ? new Date(d) : null;
}

function formatEventTime(event) {
  const d = eventDate(event);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(event) {
  if (event.time) {
    const parts = event.time.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parts[1];
      return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
    }
  }
  return '';
}

export default function ProjectCalendarPage() {
  const { projectId } = useParams();
  const pid = Number(projectId);

  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [view, setView] = useState('month');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (view === 'month') {
        params.month = month + 1;
        params.year = year;
      }
      const data = await calendarService.getProjectCalendarEvents(pid, params);
      setEvents(Array.isArray(data) ? data : data?.items || data?.results || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load calendar'));
    } finally {
      setLoading(false);
    }
  }, [pid, view, month, year]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]); // eslint-disable-line react-hooks/set-state-in-effect

  function prev() {
    if (view === 'month') setViewDate(new Date(year, month - 1, 1));
    else if (view === 'week') setViewDate(new Date(year, month, viewDate.getDate() - 7));
    else setViewDate(new Date(year, month, viewDate.getDate() - 1));
  }

  function next() {
    if (view === 'month') setViewDate(new Date(year, month + 1, 1));
    else if (view === 'week') setViewDate(new Date(year, month, viewDate.getDate() + 7));
    else setViewDate(new Date(year, month, viewDate.getDate() + 1));
  }

  function goToday() {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  function viewLabel() {
    if (view === 'month') return `${viewDate.toLocaleString('en-US', { month: 'long' })} ${year}`;
    if (view === 'week') {
      const start = viewDate;
      const end = new Date(year, month, start.getDate() + 6);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  function eventsForDate(date) {
    return events.filter((e) => {
      const ed = eventDate(e);
      return ed && isSameDay(ed, date);
    });
  }

  function getWeekDates() {
    const start = new Date(viewDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }

  function getHourSlots() {
    return Array.from({ length: 24 }, (_, i) => i);
  }

  function timeToDecimal(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    return parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
  }

  const typeStyle = (event) => TYPE_STYLES[event.type] || TYPE_STYLES.task;

  function renderEventIcon(event) {
    const s = typeStyle(event);
    return <s.icon className="w-3.5 h-3.5" />;
  }

  function renderMonth() {
    const days = getMonthDays(year, month);
    return (
      <div>
        <div className="hidden sm:grid grid-cols-7 mb-1">
          {DAYS_SHORT.map((d) => (
            <div key={d} className="text-[10px] font-semibold text-gray-400 uppercase text-center py-1.5">{d}</div>
          ))}
        </div>
        <div className="sm:hidden grid grid-cols-7 mb-1">
          {DAYS_MIN.map((d) => (
            <div key={d} className="text-[9px] font-semibold text-gray-400 uppercase text-center py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 border border-gray-200 rounded-lg overflow-hidden">
          {days.map((d, i) => {
            const dayEvents = d ? eventsForDate(d) : [];
            const isTodayDate = isToday(d);
            const isOtherMonth = d && d.getMonth() !== month;
            return (
              <div key={i}
                className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-gray-100 p-1 relative ${
                  isOtherMonth ? 'bg-gray-50/50' : d ? 'bg-white' : 'bg-gray-50/50'
                }`}>
                <span className={`inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-[10px] sm:text-xs font-medium ${
                  isTodayDate
                    ? 'bg-indigo-600 text-white'
                    : isOtherMonth ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {d ? d.getDate() : ''}
                </span>
                <div className="space-y-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((ev) => {
                    const cc = CALENDAR_COLORS[ev.type] || CALENDAR_COLORS.task;
                    return (
                      <button key={ev.id} onClick={() => setSelectedEvent(ev)}
                        className={`w-full text-left text-[9px] sm:text-[10px] leading-tight truncate rounded px-1 py-0.5 ${cc.bg} ${cc.text} hover:opacity-80 transition-opacity flex items-center gap-0.5`}>
                        <span className={`w-1 h-1 rounded-full ${cc.dot} flex-shrink-0`} />
                        {ev.title || ev.name}
                      </button>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] text-gray-400 pl-1">+{dayEvents.length - 3} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderWeek() {
    const weekDates = getWeekDates();
    const hourSlots = getHourSlots();
    return (
      <div>
        <div className="grid grid-cols-[50px_repeat(7,1fr)] border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b border-r border-gray-100" />
          {weekDates.map((d, i) => {
            const isTodayDate = isToday(d);
            return (
              <div key={i}
                className={`text-center py-2 border-b border-r border-gray-100 ${
                  isTodayDate ? 'bg-indigo-50/50' : 'bg-gray-50'
                }`}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase">{DAYS_SHORT[i]}</p>
                <p className={`text-xs font-bold ${isTodayDate ? 'text-indigo-600' : 'text-gray-700'}`}>{d.getDate()}</p>
              </div>
            );
          })}
          {hourSlots.map((hour) => (
            <div key={hour} className="contents">
              <div className="text-[9px] text-gray-400 text-right pr-2 py-1 border-b border-r border-gray-100 bg-gray-50/50">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
              {weekDates.map((d, di) => {
                const dayEvts = events.filter((e) => {
                  const ed = eventDate(e);
                  if (!ed || !isSameDay(ed, d)) return false;
                  if (!e.time) return true;
                  const h = timeToDecimal(e.time);
                  return Math.floor(h) === hour;
                });
                return (
                  <div key={di}
                    className={`border-b border-r border-gray-100 min-h-[28px] p-0.5 ${
                      isToday(d) ? 'bg-indigo-50/20' : ''
                    }`}>
                    {dayEvts.map((ev) => {
                      const cc = CALENDAR_COLORS[ev.type] || CALENDAR_COLORS.task;
                      return (
                        <button key={ev.id} onClick={() => setSelectedEvent(ev)}
                          className={`w-full text-left text-[9px] leading-tight truncate rounded px-1 py-0.5 mb-0.5 ${cc.bg} ${cc.text} hover:opacity-80 transition-opacity block`}>
                          {ev.title || ev.name}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderDay() {
    const hourSlots = getHourSlots();
    const dayEvents = eventsForDate(viewDate);
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="text-center py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase">{viewDate.toLocaleDateString('en-US', { weekday: 'long' })}</p>
          <p className={`text-lg font-bold ${isToday(viewDate) ? 'text-indigo-600' : 'text-gray-900'}`}>{viewDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          {hourSlots.map((hour) => {
            const hourEvts = dayEvents.filter((e) => {
              if (!e.time) return false;
              return Math.floor(timeToDecimal(e.time)) === hour;
            });
            const noTimeEvts = !hour ? dayEvents.filter((e) => !e.time) : [];
            return (
              <div key={hour} className="flex border-b border-gray-100 min-h-[32px] hover:bg-gray-50/50">
                <div className="w-16 text-[9px] text-gray-400 text-right pr-2 py-1 border-r border-gray-100 flex-shrink-0">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
                <div className="flex-1 p-0.5 space-y-0.5">
                  {hour === 0 && noTimeEvts.map((ev) => {
                    const cc = CALENDAR_COLORS[ev.type] || CALENDAR_COLORS.task;
                    return (
                      <button key={ev.id} onClick={() => setSelectedEvent(ev)}
                        className={`w-full text-left text-[11px] rounded px-2 py-1 ${cc.bg} ${cc.text} hover:opacity-80 transition-opacity flex items-center gap-1.5`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cc.dot} flex-shrink-0`} />
                        {ev.title || ev.name}
                      </button>
                    );
                  })}
                  {hourEvts.map((ev) => {
                    const cc = CALENDAR_COLORS[ev.type] || CALENDAR_COLORS.task;
                    return (
                      <button key={ev.id} onClick={() => setSelectedEvent(ev)}
                        className={`w-full text-left text-[11px] rounded px-2 py-1 ${cc.bg} ${cc.text} hover:opacity-80 transition-opacity flex items-center gap-1.5`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cc.dot} flex-shrink-0`} />
                        <span className="text-[10px] opacity-70">{formatTime(ev)}</span>
                        {ev.title || ev.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <FiCalendar className="w-4 h-4 text-gray-500" />
          Calendar
        </h3>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <button onClick={prev} className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors">
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goToday} className="px-2.5 py-1 rounded text-[11px] font-medium text-gray-600 hover:bg-gray-200 transition-colors">
              Today
            </button>
            <button onClick={next} className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors">
              <FiChevronRight className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-900 ml-2">{viewLabel()}</span>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            {VIEWS.map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 rounded text-[11px] font-medium capitalize transition-all ${
                  view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-white">
          <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Tasks</span>
          <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" />Meetings</span>
          <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Milestones</span>
          <span className="text-[10px] font-medium text-gray-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Releases</span>
        </div>

        <div className="p-3">
          {loading ? (
            <div className="py-8"><LoadingSpinner text="Loading calendar..." /></div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={fetchEvents} className="text-xs font-medium text-red-700 underline hover:no-underline">Retry</button>
            </div>
          ) : events.length === 0 ? (
            <Phase10CEmptyState preset="noCalendarEvents" size="sm" />
          ) : view === 'month' ? renderMonth() : view === 'week' ? renderWeek() : renderDay()}
        </div>
      </div>

      {selectedEvent && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelectedEvent(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto animate-slideIn">
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeStyle(selectedEvent).bg}`}>
                    {renderEventIcon(selectedEvent)}
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeStyle(selectedEvent).bg} ${typeStyle(selectedEvent).text}`}>
                    {typeStyle(selectedEvent).label}
                  </span>
                </div>
                <button onClick={() => setSelectedEvent(null)}
                  className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-base font-semibold text-gray-900 mb-4">
                {selectedEvent.title || selectedEvent.name}
              </h3>

              {selectedEvent.description && (
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{selectedEvent.description}</p>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <FiCalendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>{formatEventTime(selectedEvent)}</span>
                </div>
                {formatTime(selectedEvent) && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <FiClock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{formatTime(selectedEvent)}</span>
                  </div>
                )}
                {selectedEvent.status && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <FiList className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="capitalize">{selectedEvent.status.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {selectedEvent.assigned_to && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <FiUser className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{selectedEvent.assigned_to || selectedEvent.assignee}</span>
                  </div>
                )}
              </div>

              {selectedEvent.notes && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedEvent.notes}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slideIn { animation: slideIn 0.2s ease-out; }
      `}</style>
    </div>
  );
}
