export default function MessageActions({ isOwn, onEdit, onDelete, show = false }) {
  if (!isOwn) return null;

  return (
    <div
      className={`flex items-center gap-0.5 transition-opacity ${
        show ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <button
        onClick={onEdit}
        className="text-[10px] text-gray-400 hover:text-indigo-500 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors"
        title="Edit message"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.155.75l-2.404.98a.75.75 0 01-.967-1.027l.98-2.404a4.5 4.5 0 01.75-1.155L16.862 4.487z" />
        </svg>
      </button>
      <button
        onClick={onDelete}
        className="text-[10px] text-gray-400 hover:text-red-500 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors"
        title="Delete message"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>
    </div>
  );
}
