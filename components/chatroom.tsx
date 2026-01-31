'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Message {
  id: string;
  message: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface ChatroomProps {
  communityId: string;
}

export function Chatroom({ communityId }: ChatroomProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 2 seconds
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [communityId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/communities/${communityId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetch(`/api/communities/${communityId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: newMessage }),
      });

      if (response.ok) {
        setNewMessage('');
        // Fetch messages again to get the new one
        await fetchMessages();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: `Failed to send message: ${error.error}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    // Dialog handling is done via state now, so we proceed directly to delete
    try {
      const response = await fetch(`/api/communities/${communityId}/messages?messageId=${messageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Optimistically remove the message from state
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        toast({
          title: 'Message Deleted',
          description: 'The message has been removed.',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: `Failed to delete message: ${error.error}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive',
      });
    } finally {
      setMessageToDelete(null); // Close dialog
    }
  };

  const formatTime = (dateString: string) => {
    // Treat the dateString as UTC
    const date = new Date(dateString);
    const now = new Date();

    // Calculate difference in milliseconds
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-slate-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] border border-slate-200 rounded-lg bg-white">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <p>No messages yet. Be the first to say something!</p>
            </div>
          ) : (
            <>
              {messages.map((message) => {
                const isOwnMessage = message.user?.id === user?.id;
                const isAdmin = profile?.role === 'admin';
                const fullName = message.user?.full_name || 'Unknown User';
                const initial = fullName.charAt(0)?.toUpperCase() || '?';

                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3 group relative',
                      isOwnMessage && 'flex-row-reverse'
                    )}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                        {initial}
                      </div>
                    </div>
                    <div className={cn('flex-1', isOwnMessage && 'flex flex-col items-end')}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-900">
                          {fullName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatTime(message.created_at)}
                        </span>
                        {isAdmin && !isOwnMessage && (
                          <button
                            onClick={() => setMessageToDelete(message.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-xs transition-opacity"
                            title="Delete message"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <div
                        className={cn(
                          'rounded-lg px-4 py-2 max-w-[70%]',
                          isOwnMessage
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-900'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={sendMessage} className="border-t border-slate-200 p-4">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={sending || !newMessage.trim()}>
            <Send size={18} />
          </Button>
        </div>
      </form>

      <AlertDialog open={!!messageToDelete} onOpenChange={(open) => !open && setMessageToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={() => messageToDelete && handleDeleteMessage(messageToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

