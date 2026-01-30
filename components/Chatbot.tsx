
'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Minimize2, Maximize2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ReactMarkdown from 'react-markdown';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading, isOpen]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, { role: 'user', content: userMessage }]
                }),
            });

            if (!response.ok) throw new Error('Failed to send message');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error('No reader available');

            // Add empty assistant message to start streaming into
            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value, { stream: true });

                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastIdx = newMessages.length - 1;
                    if (lastIdx >= 0 && newMessages[lastIdx].role === 'assistant') {
                        const lastMessage = { ...newMessages[lastIdx] };
                        lastMessage.content += text;
                        newMessages[lastIdx] = lastMessage;
                    }
                    return newMessages;
                });
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">

            {/* Chat Window */}
            <div
                className={`
          pointer-events-auto
          transition-all duration-300 ease-in-out transform origin-bottom-right
          ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4 pointer-events-none'}
          w-[380px] h-[600px] max-h-[80vh] flex flex-col
        `}
            >
                <Card className="flex flex-col h-full shadow-2xl border-slate-200 overflow-hidden bg-white/95 backdrop-blur-sm">
                    {/* Header */}
                    <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500 rounded-full blur-sm opacity-50 animate-pulse"></div>
                                <div className="relative bg-gradient-to-br from-blue-500 to-violet-600 rounded-full p-2">
                                    <Sparkles size={18} className="text-white" />
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Community AI</h3>
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    Online
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => setIsOpen(false)}>
                                <X size={18} />
                            </Button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 p-4 bg-slate-50/50 overflow-y-auto custom-scrollbar">
                        <div className="space-y-4">
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center mt-20 text-slate-500 space-y-4">
                                    <div className="bg-blue-100 p-4 rounded-full inline-block mb-2">
                                        <MessageCircle size={32} className="text-blue-600" />
                                    </div>
                                    <p className="text-sm font-medium">Ask me anything about the community!</p>
                                </div>
                            )}

                            {messages.map((m, i) => (
                                <div
                                    key={i}
                                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
                                >
                                    <div
                                        className={`
                      max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm
                      ${m.role === 'user'
                                                ? 'bg-blue-600 text-white rounded-br-none'
                                                : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'}
                    `}
                                    >
                                        {m.role === 'assistant' ? (
                                            <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-slate-100">
                                                <ReactMarkdown>
                                                    {m.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            m.content
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin text-blue-500" />
                                        <span className="text-xs text-slate-400">Thinking...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={scrollRef} />
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <Input
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type your message..."
                                className="rounded-full bg-slate-50 border-slate-200 focus-visible:ring-blue-500 text-slate-900 placeholder:text-slate-400"
                                disabled={isLoading}
                            />
                            <Button
                                type="submit"
                                size="icon"
                                className="rounded-full bg-blue-600 hover:bg-blue-700 shadow-md transition-transform active:scale-95 disabled:opacity-50"
                                disabled={isLoading || !input.trim()}
                            >
                                <Send size={18} />
                            </Button>
                        </form>
                    </div>
                </Card>
            </div>

            {/* Floating Toggle Button */}
            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="pointer-events-auto mt-4 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-90"
                >
                    <MessageCircle size={28} className="text-white" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                    </span>
                </Button>
            )}
        </div>
    );
}
