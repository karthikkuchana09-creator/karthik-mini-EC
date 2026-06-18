import { timeAgo } from '../../utils/format';
import MessageActions from './MessageActions';

export default function MessageCard({
  message,
  isOwn,
  showAvatar,
  isEditing,
  editForm,
  onStartEdit,
  onCancelEdit,
  onEdit,
  onDelete,
}) {
  const isOptimistic = message._optimistic;

  return (
    <div
      className={`group flex gap-3 px-2 py-1.5 rounded-xl transition-colors hover:bg-gray-50/60 ${
        isOptimistic ? 'opacity-60' : ''
      } ${isEditing ? 'bg-indigo-50/40 ring-1 ring-indigo-200/50' : ''}`}
    >
      {showAvatar ? (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-indigo-600 text-sm font-semibold shrink-0 mt-0.5 overflow-hidden ring-1 ring-white">
          {message.sender_avatar ? (
            <img src={message.sender_avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            message.sender_name?.[0]?.toUpperCase() || '?'
          )}
        </div>
      ) : (
        <div className="w-9 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        {showAvatar && (
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
              {message.sender_name || 'Unknown'}
            </span>
            <span className="text-[11px] text-gray-400 tabular-nums">{timeAgo(message.created_at)}</span>
            {message.pinned && (
              <span className="text-[10px] text-amber-600 font-medium">Pinned</span>
            )}
            {message.edited && (
              <span className="text-[10px] text-gray-400 italic">(edited)</span>
            )}
          </div>
        )}

        {isEditing ? (
          <form
            onSubmit={editForm?.handleSubmit?.((data) => {
              onEdit?.(message.id, data.content);
            })}
            className="mt-1"
          >
            <textarea
              {...(editForm?.register?.('content', { required: true }) || {})}
              className="input w-full resize-none text-sm min-h-[60px] py-2 px-3 rounded-lg"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') onCancelEdit?.();
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  editForm?.handleSubmit?.((data) => {
                    onEdit?.(message.id, data.content);
                  })();
                }
              }}
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                type="submit"
                disabled={editForm?.formState?.isSubmitting}
                className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-medium hover:bg-indigo-600 transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed break-words">
              {message.content}
            </p>
            {showAvatar === false && message.edited && (
              <span className="text-[10px] text-gray-400 italic">edited</span>
            )}
          </div>
        )}

        <div className={`flex items-center mt-0.5 ${isEditing ? 'hidden' : ''}`}>
          <MessageActions
            isOwn={isOwn}
            show={!isEditing}
            onEdit={() => onStartEdit?.(message)}
            onDelete={() => onDelete?.(message.id)}
          />
        </div>
      </div>
    </div>
  );
}
