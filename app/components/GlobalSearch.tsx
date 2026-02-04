'use client';

import { useState, useEffect } from 'react';
import { Search, X, Check, ArrowRight, CornerDownLeft, Hash, Plus } from 'lucide-react';
import { useSecondBrain } from '../lib/store';
import { useRouter } from 'next/navigation';

interface GlobalSearchProps {
    isOpen: boolean;
    onClose: () => void;
}

export function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
    const { tasks, projects, addTask, addLog } = useSecondBrain();
    const [query, setQuery] = useState('');
    const router = useRouter();
    const [mode, setMode] = useState<'search' | 'add'>('search');

    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setMode('search');
        }
    }, [isOpen]);

    // Handle escape to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            // Toggle mode with Tab? maybe too complex for now.
        };
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Filter Logic
    const filteredTasks = tasks.filter(t =>
        t.title.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 3);

    const handleQuickAdd = () => {
        if (!query.trim()) return;
        // Logic: If query starts with "task:", add task directly.
        // Otherwise, add to log for processing.
        // Simpler: Just add to log (Quick Capture)
        addLog(query);
        onClose();
        router.push('/'); // Go home to see it? or stays where they are.
    };

    const navigateTo = (path: string) => {
        router.push(path);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-32 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                {/* Input Area */}
                <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
                    {mode === 'search' ? <Search className="text-zinc-500" /> : <Plus className="text-green-500" />}
                    <input
                        autoFocus
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search tasks, projects, or type to capture..."
                        className="flex-1 bg-transparent border-none outline-none text-zinc-200 placeholder-zinc-600 text-lg"
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                if (filteredTasks.length === 0 && filteredProjects.length === 0 && query.trim()) {
                                    handleQuickAdd();
                                }
                            }
                        }}
                    />
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded">
                            <X size={18} className="text-zinc-500" />
                        </button>
                    </div>
                </div>

                {/* Results Area */}
                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {query.trim() === '' ? (
                        <div className="p-8 text-center text-zinc-500 text-sm">
                            <p>Type to search...</p>
                            <p className="mt-2 text-xs text-zinc-600">Press <kbd className="font-sans bg-zinc-800 px-1.5 rounded text-zinc-400">Enter</kbd> to quick capture</p>
                        </div>
                    ) : (
                        <div className="space-y-4">

                            {/* Actions */}
                            {(filteredTasks.length === 0 && filteredProjects.length === 0) && (
                                <div
                                    onClick={handleQuickAdd}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800 cursor-pointer group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                                        <ArrowRight size={16} className="text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-zinc-200 text-sm font-medium">Quick Capture</p>
                                        <p className="text-zinc-500 text-xs">Add "{query}" to Inbox</p>
                                    </div>
                                    <CornerDownLeft size={14} className="ml-auto text-zinc-600" />
                                </div>
                            )}

                            {/* Projects */}
                            {filteredProjects.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold text-zinc-500 px-3 mb-2 uppercase tracking-wider">Projects</h3>
                                    {filteredProjects.map(p => (
                                        <div
                                            key={p.id}
                                            onClick={() => navigateTo(`/projects/${p.id}`)}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800 cursor-pointer group"
                                        >
                                            <Hash size={16} className="text-zinc-500 group-hover:text-indigo-400" />
                                            <span className="text-zinc-300 text-sm">{p.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Tasks */}
                            {filteredTasks.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-semibold text-zinc-500 px-3 mb-2 uppercase tracking-wider">Tasks</h3>
                                    {filteredTasks.map(t => (
                                        <div
                                            key={t.id}
                                            onClick={() => {
                                                if (t.projectId) navigateTo(`/projects/${t.projectId}`);
                                            }}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800 cursor-pointer group"
                                        >
                                            <div className={`w-4 h-4 rounded-full border border-zinc-600 ${t.status === 'done' ? 'bg-green-500/20 border-green-500/50' : ''}`} />
                                            <span className={`text-zinc-300 text-sm ${t.status === 'done' ? 'line-through opacity-50' : ''}`}>{t.title}</span>
                                            {t.projectId && <span className="ml-auto text-xs text-zinc-600">{projects.find(p => p.id === t.projectId)?.name}</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-2 border-t border-zinc-800 bg-zinc-900/50 text-[10px] text-zinc-500 flex justify-between px-4">
                    <span>Search or Capture</span>
                    <span className="flex items-center gap-1"><CornerDownLeft size={10} /> to select</span>
                </div>
            </div>
        </div>
    );
}
