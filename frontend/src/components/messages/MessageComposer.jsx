import { useForm } from 'react-hook-form';

export default function MessageComposer({ placeholder = 'Type a message...', onSubmit, disabled = false, autoFocus = false }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({ defaultValues: { content: '' } });

  const onSend = async (data) => {
    if (!data.content?.trim() || isSubmitting || disabled) return;
    reset({ content: '' });
    try {
      await onSubmit?.(data.content.trim());
    } catch {
      // Error handling left to parent
    }
  };

  return (
    <form onSubmit={handleSubmit(onSend)} className="flex items-end gap-3">
      <div className="flex-1 relative">
        <textarea
          {...register('content', { required: true })}
          placeholder={placeholder}
          className="input w-full resize-none text-sm py-2.5 pl-4 pr-10 rounded-xl min-h-[44px] max-h-32 leading-relaxed"
          rows={1}
          autoFocus={autoFocus}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(onSend)();
            }
          }}
        />
        <div className="absolute right-2 bottom-2 flex items-center gap-1">
          <span className="text-[10px] text-gray-300 hidden sm:inline">Shift+Enter for new line</span>
        </div>
      </div>
      <button
        type="submit"
        disabled={isSubmitting || disabled}
        className="btn-primary rounded-xl px-4 py-2.5 h-[44px] shrink-0"
        title="Send message"
      >
        {isSubmitting || disabled ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        )}
        <span className="hidden sm:inline ml-1.5">Send</span>
      </button>
    </form>
  );
}
