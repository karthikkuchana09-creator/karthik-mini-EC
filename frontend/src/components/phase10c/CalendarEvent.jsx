import { FiTarget, FiVideo, FiFlag, FiUpload } from 'react-icons/fi';

const TYPE_STYLES = {
  task: { bg: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', icon: FiTarget },
  meeting: { bg: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500', icon: FiVideo },
  milestone: { bg: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', icon: FiFlag },
  release: { bg: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', icon: FiUpload },
};

export default function CalendarEvent({ event, onClick, variant = 'chip' }) {
  const style = TYPE_STYLES[event.type] || TYPE_STYLES.task;
  const Icon = style.icon;

  if (variant === 'detail') {
    return (
      <button onClick={() => onClick?.(event)}
        className={`w-full text-left rounded px-2 py-1.5 ${style.bg} hover:opacity-80 transition-opacity flex items-center gap-2`}>
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{event.title || event.name}</p>
          {event.time && <p className="text-[10px] opacity-70">{event.time}</p>}
        </div>
      </button>
    );
  }

  return (
    <button onClick={() => onClick?.(event)}
      className={`w-full text-left text-[9px] sm:text-[10px] leading-tight truncate rounded px-1 py-0.5 ${style.bg} hover:opacity-80 transition-opacity flex items-center gap-0.5`}>
      <span className={`w-1 h-1 rounded-full ${style.dot} shrink-0`} />
      {event.title || event.name}
    </button>
  );
}
