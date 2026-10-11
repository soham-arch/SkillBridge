'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import {
  Send,
  Paperclip,
  CheckCheck,
  Check,
  FileText,
  Download,
  MessageSquare,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  fetchOrderMessages,
  sendOrderMessage,
  markOrderMessagesAsRead,
  uploadOrderAttachment,
} from '@/lib/services/messages';
import { OrderMessage, Profile } from '@/types';

interface OrderChatProps {
  orderId: string;
  currentUserId: string;
  currentUserName?: string;
  recipient?: Profile | null;
  orderTitle?: string;
}

export function OrderChat({
  orderId,
  currentUserId,
  currentUserName,
  recipient,
  orderTitle,
}: OrderChatProps) {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Attachment staged for next message
  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string;
    name: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const recipientName = recipient?.full_name || 'Participant';
  const recipientInitials = recipientName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initial load & Realtime subscription
  useEffect(() => {
    let isMounted = true;

    async function loadThread() {
      try {
        const data = await fetchOrderMessages(orderId);
        if (isMounted) {
          setMessages(data);
          await markOrderMessagesAsRead(orderId, currentUserId);
        }
      } catch (err) {
        console.error('Failed to load message thread:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadThread();

    // Setup Supabase Realtime channel
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`order_chat_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const newMsg = payload.new as OrderMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.receiver_id === currentUserId) {
            markOrderMessagesAsRead(orderId, currentUserId);
          }
        }
      )
      .subscribe();

    // Fallback polling every 5s for environments with offline websockets
    const pollInterval = setInterval(async () => {
      try {
        const fresh = await fetchOrderMessages(orderId);
        if (isMounted) {
          setMessages((prev) => {
            if (fresh.length !== prev.length) return fresh;
            return prev;
          });
        }
      } catch {
        // Non-fatal
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [orderId, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    const content = inputText.trim();

    if (!content && !pendingAttachment) return;
    if (!recipient?.user_id) {
      toast.error('Recipient could not be resolved for this order.');
      return;
    }

    setSending(true);

    try {
      const msg = await sendOrderMessage({
        orderId,
        senderId: currentUserId,
        receiverId: recipient.user_id,
        content,
        attachmentUrl: pendingAttachment?.url,
        attachmentName: pendingAttachment?.name,
        senderName: currentUserName,
      });

      setMessages((prev) => [...prev, msg]);
      setInputText('');
      setPendingAttachment(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { url, name } = await uploadOrderAttachment(file, orderId, currentUserId);
      setPendingAttachment({ url, name });
      toast.success(`Attached "${name}". Send your message to share.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-white shadow-sm overflow-hidden h-[540px]">
      {/* Chat Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-[#fbfcfd] px-6 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-gray-200">
            {recipient?.avatar_url && <AvatarImage src={recipient.avatar_url} />}
            <AvatarFallback className="bg-[#004ac6] text-white text-xs font-bold">
              {recipientInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              {recipientName}
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" title="Online" />
            </h3>
            <p className="text-[11px] text-gray-500">
              {recipient?.college || 'Campus Peer'} · Order Discussion
            </p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <span className="text-xs font-bold text-[#004ac6] uppercase tracking-wider">
            Order Chat
          </span>
          <p className="text-[10px] text-gray-400">Encrypted Participant Workspace</p>
        </div>
      </div>

      {/* Message Thread Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#fafbfc]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#004ac6]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#004ac6] mb-3">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-gray-800">No Messages Yet</h4>
            <p className="mt-1 text-xs text-gray-500 max-w-xs">
              Direct participant communication for {orderTitle ? `"${orderTitle}"` : 'this project'}. Clarify deliverables, share progress updates, or provide feedback.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[85%] sm:max-w-[75%] ${
                  isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {!isMe && (
                  <Avatar className="h-7 w-7 mt-0.5 shrink-0 border border-gray-200">
                    {recipient?.avatar_url && <AvatarImage src={recipient.avatar_url} />}
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-[10px] font-bold">
                      {recipientInitials}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div>
                  <div
                    className={`rounded-2xl px-4 py-3 text-xs shadow-sm ${
                      isMe
                        ? 'bg-[#004ac6] text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-200/80 rounded-bl-none'
                    }`}
                  >
                    {msg.content && <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>}

                    {/* Attachment Pill */}
                    {msg.attachment_url && (
                      <div
                        className={`mt-2 flex items-center justify-between gap-3 rounded-xl p-2.5 text-[11px] ${
                          isMe ? 'bg-white/15 text-white' : 'bg-gray-50 text-gray-800 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="font-semibold truncate">
                            {msg.attachment_name || 'Attached File'}
                          </span>
                        </div>
                        <a
                          href={msg.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 p-1 hover:opacity-80 transition-opacity"
                          title="Download / View"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Timestamp & Status */}
                  <div
                    className={`flex items-center gap-1 mt-1 text-[10px] text-gray-400 ${
                      isMe ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span>{timeStr}</span>
                    {isMe && (
                      <span title={msg.read ? 'Read' : 'Sent'}>
                        {msg.read ? (
                          <CheckCheck className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Check className="h-3 w-3 text-gray-400" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Staged Preview */}
      {pendingAttachment && (
        <div className="flex items-center justify-between bg-blue-50/70 border-t border-blue-100 px-4 py-2 text-xs">
          <div className="flex items-center gap-2 text-[#004ac6] font-semibold truncate">
            <Paperclip className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Attached: {pendingAttachment.name}</span>
          </div>
          <button
            type="button"
            onClick={() => setPendingAttachment(null)}
            className="text-gray-400 hover:text-red-500 p-1"
            title="Remove attachment"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Message Input Footer */}
      <form onSubmit={handleSendMessage} className="border-t border-gray-100 bg-white p-3 sm:p-4">
        <div className="flex items-center gap-2">
          {/* File Upload Trigger */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.zip,.txt,.docx"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending}
            className="h-10 w-10 shrink-0 rounded-xl border-gray-200 text-gray-500 hover:text-[#004ac6] hover:border-[#004ac6]"
            title="Attach a file (PDF, image, ZIP, up to 10MB)"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#004ac6]" />
            ) : (
              <Paperclip className="h-4 w-4" />
            )}
          </Button>

          {/* Text Input */}
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message ${recipientName}...`}
            disabled={sending}
            className="h-10 text-xs rounded-xl border-gray-200 bg-white focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6]"
          />

          {/* Send Button */}
          <Button
            type="submit"
            disabled={sending || (!inputText.trim() && !pendingAttachment)}
            className="h-10 px-4 shrink-0 rounded-xl bg-[#004ac6] hover:bg-[#003b9e] text-white font-bold text-xs shadow-sm"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
