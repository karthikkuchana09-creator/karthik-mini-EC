import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import * as workspaceMessagesApi from '../../../api/workspaceMessages';
import { useAuth } from '../../../context/AuthContext';
import { getErrorMessage } from '../../../utils/errorHandler';
import MessageCard from '../../messages/MessageCard';
import MessageComposer from '../../messages/MessageComposer';

export default function MessagesTab({ workspaceId }) {
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await workspaceMessagesApi.getWorkspaceMessages(workspaceId);
      setMessages(Array.isArray(data) ? data : data?.messages || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load messages'));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSend = async (content) => {
    const optimistic = {
      id: `temp-${Date.now()}`,
      content,
      sender_id: user?.id,
      sender_name: user?.name || 'You',
      sender_avatar: user?.avatar_url,
      created_at: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const sent = await workspaceMessagesApi.sendWorkspaceMessage(workspaceId, { content });
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? sent : m)));
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      toast.error(getErrorMessage(err, 'Failed to send message'));
    }
  };

  const handleDelete = async (messageId) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    try {
      await workspaceMessagesApi.deleteWorkspaceMessage(messageId);
    } catch (err) {
      fetchMessages();
      toast.error(getErrorMessage(err, 'Failed to delete message'));
    }
  };

  const currentUserId = user?.id;

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 bg-gray-200 rounded" />
              <div className="h-8 w-full bg-gray-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[520px]">
      <div className="flex-1 overflow-y-auto space-y-1 pr-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">No messages yet</p>
            <p className="text-xs text-gray-400 mt-1">Send the first message</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id && currentUserId && msg.sender_id === currentUserId;
            return (
              <MessageCard
                key={msg.id}
                message={msg}
                isOwn={isOwn}
                showAvatar={true}
                onDelete={handleDelete}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="pt-4 border-t border-gray-100 mt-4">
        <MessageComposer
          placeholder="Type your message..."
          onSubmit={onSend}
        />
      </div>
    </div>
  );
}
