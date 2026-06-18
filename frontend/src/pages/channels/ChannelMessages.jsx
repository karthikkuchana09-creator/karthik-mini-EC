import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as channelApi from '../../api/channels';
import * as channelMessagesApi from '../../api/channelMessages';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/errorHandler';
import MessageCard from '../../components/messages/MessageCard';
import MessageComposer from '../../components/messages/MessageComposer';

const PAGE_SIZE = 30;

function groupMessagesByDate(messages) {
  const groups = [];
  let currentDate = null;
  for (const msg of messages) {
    const d = new Date(msg.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    if (d !== currentDate) {
      currentDate = d;
      const isToday = new Date(msg.created_at).toDateString() === new Date().toDateString();
      const isYesterday = new Date(Date.now() - 86400000).toDateString() === new Date(msg.created_at).toDateString();
      groups.push({ type: 'date', label: isToday ? 'Today' : isYesterday ? 'Yesterday' : currentDate });
    }
    groups.push({ type: 'message', message: msg });
  }
  return groups;
}

function shouldShowAvatar(grouped, idx) {
  if (idx === 0) return true;
  const prev = grouped[idx - 1];
  const curr = grouped[idx];
  if (prev.type === 'date') return true;
  if (prev.type === 'message' && curr.type === 'message') {
    const timeDiff = new Date(curr.message.created_at) - new Date(prev.message.created_at);
    if (timeDiff > 300000) return true;
    return prev.message.sender_id !== curr.message.sender_id;
  }
  return true;
}

export default function ChannelMessages() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const channelId = Number(id);

  const [channel, setChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [editingId, setEditingId] = useState(null);

  const messagesContainerRef = useRef(null);
  const pollRef = useRef(null);

  const editForm = useForm({ defaultValues: { content: '' } });

  const fetchChannel = useCallback(async () => {
    try {
      const data = await channelApi.getChannel(channelId);
      setChannel(data);
    } catch (err) {
      if (err?.response?.status === 404) {
        toast.error('Channel not found');
        navigate('/channels');
      } else {
        setError(getErrorMessage(err, 'Failed to load channel'));
        toast.error(getErrorMessage(err, 'Failed to load channel'));
      }
    }
  }, [channelId, navigate]);

  const fetchMessages = useCallback(async (loadOffset = 0, append = false) => {
    try {
      const data = await channelMessagesApi.getChannelMessages(channelId, {
        limit: PAGE_SIZE,
        offset: loadOffset,
      });
      const list = Array.isArray(data) ? data : data?.messages || data?.data || [];
      setMessages((prev) => (append ? [...prev, ...list] : list));
      setHasMore(list.length >= PAGE_SIZE);
      setOffset(loadOffset + list.length);
      return list;
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load messages'));
      return [];
    }
  }, [channelId]);

  useEffect(() => {
    fetchChannel();
    fetchMessages(0).finally(() => setLoading(false));
  }, [fetchChannel, fetchMessages]);

  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchMessages(0, false);
    }, 10000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  const handleLoadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    await fetchMessages(offset, true);
    setLoadingOlder(false);
  }, [loadingOlder, hasMore, offset, fetchMessages]);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (el.scrollTop < 80 && hasMore && !loadingOlder) {
      handleLoadOlder();
    }
  }, [hasMore, loadingOlder, handleLoadOlder]);

  const onSend = useCallback(async (content) => {
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
    setTimeout(() => {
      messagesContainerRef.current?.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 50);
    try {
      const sent = await channelMessagesApi.sendChannelMessage(channelId, { content });
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? sent : m)));
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      toast.error(getErrorMessage(err, 'Failed to send message'));
    }
  }, [channelId, user]);

  const startEditing = (msg) => {
    setEditingId(msg.id);
    editForm.setValue('content', msg.content);
    setTimeout(() => editForm.setFocus('content'), 0);
  };

  const cancelEditing = () => {
    setEditingId(null);
    editForm.reset({ content: '' });
  };

  const onEdit = async (msgId, content) => {
    if (!content?.trim()) return;
    setEditingId(null);
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, content: content.trim(), edited: true } : m)),
    );
    try {
      await channelMessagesApi.updateChannelMessage(msgId, { content: content.trim() });
      toast.success('Message updated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update message'));
    }
  };

  const handleDelete = (msgId) => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm">Delete this message?</span>
        <button
          onClick={async () => {
            toast.dismiss(t.id);
            setMessages((prev) => prev.filter((m) => m.id !== msgId));
            try {
              await channelMessagesApi.deleteChannelMessage(msgId);
              toast.success('Message deleted');
            } catch (err) {
              toast.error(getErrorMessage(err, 'Failed to delete message'));
            }
          }}
          className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors"
        >
          Delete
        </button>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    ), { duration: 8000 });
  };

  const grouped = groupMessagesByDate(messages);
  const currentUserId = user?.id;
  const channelName = channel?.name || 'channel';

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-white">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex-1 p-6 space-y-5 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 bg-gray-200 rounded" />
                <div className="h-8 w-3/4 bg-gray-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="page-container max-w-4xl">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="p-3 rounded-full bg-red-50 mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">Failed to load</p>
          <p className="text-xs text-gray-500 mb-4">{error}</p>
          <button onClick={fetchChannel} className="btn-secondary text-sm">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-gray-200 shrink-0 bg-white z-10">
        <button onClick={() => navigate(`/channel-list/${channelId}`)} className="text-gray-400 hover:text-gray-600 transition-colors p-1 -ml-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
          #
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-gray-900 truncate">{channel?.name || 'Channel'}</h1>
          <p className="text-[11px] text-gray-500">
            {channel?.workspace_name && `${channel.workspace_name} · `}{channel?.member_count || 0} members
          </p>
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-1 scrollbar-thin"
      >
        {loadingOlder && (
          <div className="flex justify-center py-3">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading older messages...
            </div>
          </div>
        )}

        {!hasMore && messages.length > 0 && (
          <div className="flex justify-center py-3">
            <span className="text-[11px] text-gray-400 font-medium">Beginning of conversation</span>
          </div>
        )}

        {messages.length === 0 && !loadingOlder ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center mb-4 shadow-sm">
              <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">No messages yet</h2>
            <p className="text-sm text-gray-500 max-w-sm">Send the first message to start the conversation in #{channelName}.</p>
          </div>
        ) : (
          grouped.map((item, idx) => {
            if (item.type === 'date') {
              return (
                <div key={`date-${item.label}`} className="flex items-center gap-3 py-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">{item.label}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              );
            }

            const msg = item.message;
            const isOwn = msg.sender_id && currentUserId && msg.sender_id === currentUserId;
            const showAvatar = shouldShowAvatar(grouped, idx);
            const isEditing = editingId === msg.id;

            return (
              <MessageCard
                key={msg.id}
                message={msg}
                isOwn={isOwn}
                showAvatar={showAvatar}
                isEditing={isEditing}
                editForm={editForm}
                onStartEdit={startEditing}
                onCancelEdit={cancelEditing}
                onEdit={onEdit}
                onDelete={handleDelete}
              />
            );
          })
        )}

        <div className="h-4" />
      </div>

      <div className="shrink-0 border-t border-gray-200 bg-white px-4 sm:px-6 py-3 sm:py-4">
        <MessageComposer
          placeholder={`Message #${channelName}`}
          onSubmit={onSend}
        />
      </div>
    </div>
  );
}
