'use client';

import { useState, useEffect, useRef } from 'react';
import { Task } from '../lib/types';
import { useSecondBrain } from '../lib/store';
import { Check, Circle, Calendar, ListChecks, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TaskItemProps {
    task: Task;
    isHighlighted?: boolean;
}

// ... imports
// ... props

export function TaskItem({ task, isHighlighted }: TaskItemProps) {
    const { updateTask } = useSecondBrain();
    const [isCompleted, setIsCompleted] = useState(task.status === 'done');
    const [isExpanded, setIsExpanded] = useState(false);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const itemRef = useRef<HTMLDivElement>(null);

    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
    const totalSubtasks = task.subtasks?.length || 0;

    // ... useEffect scroll

    const toggleComplete = (e: React.MouseEvent) => {
        // ... existing toggle logic
        e.stopPropagation();
        const newState = !isCompleted;
        setIsCompleted(newState);

        if (newState) {
            // FIREWORKS!
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const x = (rect.left + rect.width / 2) / window.innerWidth;
            const y = (rect.top + rect.height / 2) / window.innerHeight;

            confetti({
                origin: { x, y },
                particleCount: 50,
                spread: 60,
                colors: ['#6366f1', '#a855f7', '#ec4899', '#10b981']
            });
        }

        setTimeout(() => {
            updateTask(task.id, { status: newState ? 'done' : 'todo' });
        }, 300);
    };

    const toggleSubtask = (e: React.MouseEvent, subtaskId: string) => {
        e.stopPropagation();
        const subtasks = task.subtasks?.map(s =>
            s.id === subtaskId ? { ...s, completed: !s.completed } : s
        ) || [];
        updateTask(task.id, { subtasks });
    };

    const handleAddSubtask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtaskTitle.trim()) return;

        const newSub = {
            id: crypto.randomUUID(),
            title: newSubtaskTitle.trim(),
            completed: false
        };

        updateTask(task.id, {
            subtasks: [...(task.subtasks || []), newSub]
        });
        setNewSubtaskTitle('');
    };

    if (task.status === 'done' && !isCompleted) {
        setIsCompleted(true);
    }

    return (
        <div
            ref={itemRef}
            className={`group flex flex-col p-3 rounded-xl border transition-all duration-500 relative ${isCompleted
                ? 'bg-zinc-900/30 border-zinc-900 border-dashed opacity-50'
                : isHighlighted
                    ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/20'
                    : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                }`}>

            <div className="flex items-start gap-3 w-full">
                {/* Chevron / Toggle */}
                {hasSubtasks ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="mt-1 -ml-1.5 p-0.5 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800 transition-colors"
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                ) : (
                    <div className="w-5" /> /* Spacer if we aligned alignment, but here we might want just spacing or nothing */
                )}

                <button
                    onClick={toggleComplete}
                    className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isCompleted
                        ? 'bg-green-500 border-green-500 text-zinc-950'
                        : task.priority === 1 ? 'border-red-500 hover:border-red-400 text-transparent'
                            : task.priority === 2 ? 'border-orange-500 hover:border-orange-400 text-transparent'
                                : task.priority === 3 ? 'border-blue-500 hover:border-blue-400 text-transparent'
                                    : 'border-zinc-600 hover:border-indigo-400 text-transparent'
                        }`}
                >
                    <Check size={12} strokeWidth={3} />
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                        <p className={`text-sm font-medium transition-all ${isCompleted ? 'text-zinc-500 line-through decoration-zinc-700' : 'text-zinc-200'
                            }`}>
                            {task.title}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                        {/* Tags */}
                        {task.tags.contexts.map(c => (
                            <a
                                key={c}
                                href={`/tags/${encodeURIComponent(c)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors rounded border border-zinc-700/50"
                            >
                                {c}
                            </a>
                        ))}

                        {hasSubtasks && !isExpanded && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                                className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-500 flex items-center gap-1 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                            >
                                <ListChecks size={10} />
                                {completedSubtasks}/{totalSubtasks}
                            </button>
                        )}

                        {/* Quick Add Subtask Button */}
                        {!isExpanded && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                                className="text-[10px] px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors ml-1"
                                title="Add Subtask"
                            >
                                <Plus size={10} />
                            </button>
                        )}

                        {/* Due Date Indicator */}
                        {task.scheduledAt && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-purple-400 rounded border border-purple-500/20 flex items-center gap-1">
                                <Calendar size={10} />
                                {new Date(task.scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded Subtasks */}
            {hasSubtasks && isExpanded && (
                <div className="mt-3 pl-10 space-y-2 animate-in slide-in-from-top-1 duration-200 border-t border-zinc-800/50 pt-3">
                    {task.subtasks!.map(subtask => (
                        <div
                            key={subtask.id}
                            className="flex items-start gap-3 group/subtask p-1 -ml-2 rounded-lg hover:bg-zinc-800/30 transition-colors cursor-default"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={(e) => toggleSubtask(e, subtask.id)}
                                className={`flex-shrink-0 mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${subtask.completed
                                    ? 'bg-zinc-600 border-zinc-600 text-zinc-950'
                                    : 'border-zinc-600 hover:border-indigo-400'
                                    }`}
                            >
                                {subtask.completed && <Check size={10} strokeWidth={3} className="text-white" />}
                            </button>
                            <span className={`text-sm transition-all ${subtask.completed ? 'text-zinc-600 line-through' : 'text-zinc-400'}`}>
                                {subtask.title}
                            </span>
                        </div>
                    ))}

                    {/* Inline Add Subtask Input */}
                    <form onSubmit={handleAddSubtask} className="flex items-center gap-3 group/add p-1 -ml-2 rounded-lg hover:bg-zinc-800/30 transition-colors" onClick={e => e.stopPropagation()}>
                        <Plus size={14} className="text-zinc-600 group-hover/add:text-zinc-400 ml-0.5" />
                        <input
                            type="text"
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            placeholder="Add subtask..."
                            className="bg-transparent text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none w-full"
                        />
                    </form>
                </div>
            )}
        </div>
    );
}
