'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { useSecondBrain } from '../lib/store';
import { Task } from '../lib/types';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface AIChatProps {
    variant?: 'default' | 'sidebar';
}

export function AIChat({ variant = 'default' }: AIChatProps) {
    const { tasks, projects, deleteItem } = useSecondBrain();
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "I'm your Second Brain. Ask me to find tasks, summarize projects, or help you prioritize." }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            // Prepare context
            const context = {
                tasks: tasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    list: t.list,
                    tags: t.tags
                })),
                projects: projects.map(p => ({
                    name: p.name,
                    status: p.status,
                    outcome: p.outcome
                }))
            };

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    context: JSON.stringify(context)
                }),
            });

            if (!response.ok) throw new Error('Failed to chat');

            const data = await response.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I had trouble thinking about that." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const containerClasses = variant === 'sidebar'
        ? "flex flex-col h-full w-full bg-zinc-950 border-none rounded-none shadow-none"
        : "flex flex-col h-[600px] w-full max-w-2xl mx-auto bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl";

    const headerClasses = variant === 'sidebar'
        ? "flex items-center gap-3 p-4 border-b border-zinc-900 bg-zinc-950"
        : "flex items-center gap-3 p-4 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur";

    return (
        <div className={containerClasses}>
            <div className={headerClasses}>
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                    <Sparkles size={18} className="text-indigo-400" />
                </div>
                <h3 className="font-medium text-zinc-200">Brain Chat</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`p-2 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-zinc-700' : 'bg-indigo-500/10 text-indigo-400'
                            }`}>
                            {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                        </div>
                        <div className={`p-3 rounded-2xl text-sm max-w-[80%] ${msg.role === 'user'
                            ? 'bg-zinc-800 text-zinc-100 rounded-tr-sm'
                            : 'bg-zinc-900/50 border border-zinc-800 text-zinc-300 rounded-tl-sm'
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="p-2 w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                            <Bot size={16} />
                        </div>
                        <div className="flex items-center gap-1 p-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl rounded-tl-sm">
                            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask your brain (e.g. 'Show me low energy tasks')..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 pr-12 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all placeholder-zinc-600"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </form>
        </div>
    );
}
