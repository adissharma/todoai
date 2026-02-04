'use client';

import { Task, Subtask, ChecklistItem } from '../lib/types';
import { useSecondBrain } from '../lib/store';
import { X, Check, Plus, Trash2, Sparkles, ChevronRight, ChevronLeft, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { DndContext, closestCorners, useSensor, useSensors, PointerSensor, KeyboardSensor, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableSubtaskItem } from './SortableSubtaskItem';

interface TaskDetailModalProps {
    task: Task | null;
    onClose: () => void;
}

export function TaskDetailModal({ task, onClose }: TaskDetailModalProps) {
    const { updateTask } = useSecondBrain();
    const [newSubtask, setNewSubtask] = useState('');
    const [newTag, setNewTag] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Navigation State
    const [viewingSubtaskId, setViewingSubtaskId] = useState<string | null>(null);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id || !task || !task.subtasks) return;

        const oldIndex = task.subtasks.findIndex(s => s.id === active.id);
        const newIndex = task.subtasks.findIndex(s => s.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newSubtasks = arrayMove(task.subtasks, oldIndex, newIndex);
            updateTask(task.id, { subtasks: newSubtasks });
        }
    };

    if (!task) return null;

    const activeSubtask = viewingSubtaskId
        ? task.subtasks?.find(s => s.id === viewingSubtaskId)
        : null;

    // --- Main Task Handlers ---

    const handleGenerateSubtasks = async () => {
        setIsGenerating(true);
        try {
            const response = await fetch('/api/subtasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: task.title,
                    context: task.originalThought
                })
            });

            if (!response.ok) throw new Error('Generation failed');

            const data = await response.json();
            if (data.subtasks && Array.isArray(data.subtasks)) {
                const newSubtasks = data.subtasks.map((t: string) => ({
                    id: crypto.randomUUID(),
                    title: t,
                    completed: false
                }));

                const existingSubtasks = task.subtasks || [];
                updateTask(task.id, { subtasks: [...existingSubtasks, ...newSubtasks] });
            }
        } catch (error) {
            console.error(error);
            alert('Failed to generate subtasks. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddSubtask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubtask.trim()) return;

        const subtask: Subtask = {
            id: crypto.randomUUID(),
            title: newSubtask.trim(),
            completed: false
        };

        const existingSubtasks = task.subtasks || [];
        updateTask(task.id, { subtasks: [...existingSubtasks, subtask] });
        setNewSubtask('');
    };

    const toggleSubtask = (subtaskId: string) => {
        const subtasks = task.subtasks?.map(s =>
            s.id === subtaskId ? { ...s, completed: !s.completed } : s
        ) || [];
        updateTask(task.id, { subtasks });
    };

    const deleteSubtask = (subtaskId: string) => {
        const subtasks = task.subtasks?.filter(s => s.id !== subtaskId) || [];
        updateTask(task.id, { subtasks });
        if (viewingSubtaskId === subtaskId) setViewingSubtaskId(null);
    };

    const updateSubtask = (subtaskId: string, updates: Partial<Subtask>) => {
        const subtasks = task.subtasks?.map(s =>
            s.id === subtaskId ? { ...s, ...updates } : s
        ) || [];
        updateTask(task.id, { subtasks });
    };

    // --- Tag Handlers ---
    const removeTag = (tagToRemove: string) => {
        const newContexts = task.tags.contexts.filter(t => t !== tagToRemove);
        updateTask(task.id, { tags: { ...task.tags, contexts: newContexts } });
    };

    const addTag = (e: React.FormEvent) => {
        e.preventDefault();
        const tag = newTag.trim();
        if (!tag || task.tags.contexts.includes(tag)) {
            setNewTag('');
            return;
        }
        updateTask(task.id, { tags: { ...task.tags, contexts: [...task.tags.contexts, tag] } });
        setNewTag('');
    };

    // --- Checklist Logic (Generic) ---
    // We can't easily make a generic "useChecklist" hook here because of the nested updates in updateTask.
    // So we'll inline logic for main task vs subtask.

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 min-h-[600px] flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>

                {/* Header / Navigation */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
                            <button
                                onClick={() => setViewingSubtaskId(null)}
                                className={`hover:text-zinc-300 transition-colors flex items-center gap-1 ${activeSubtask ? 'font-medium' : 'font-bold text-zinc-300'}`}
                            >
                                {activeSubtask && <ArrowLeft size={12} />}
                                {task.title || 'Untitled Task'}
                            </button>
                            {activeSubtask && (
                                <>
                                    <ChevronRight size={14} />
                                    <span className="font-bold text-zinc-300 truncate max-w-[200px]">{activeSubtask.title || 'Untitled Subtask'}</span>
                                </>
                            )}
                        </div>

                        {/* Title (Only editable if active view matches) */}
                        {!activeSubtask ? (
                            <input
                                type="text"
                                value={task.title}
                                onChange={(e) => updateTask(task.id, { title: e.target.value })}
                                className="bg-transparent border-none outline-none text-2xl font-bold text-white placeholder-zinc-600 w-full"
                            />
                        ) : (
                            <input
                                type="text"
                                value={activeSubtask.title}
                                onChange={(e) => updateSubtask(activeSubtask.id, { title: e.target.value })}
                                className="bg-transparent border-none outline-none text-2xl font-bold text-white placeholder-zinc-600 w-full"
                            />
                        )}

                        {!activeSubtask && <div className="text-[10px] uppercase font-bold text-zinc-500 mt-1 tracking-wider">{(task.list || 'TASK').toUpperCase()}</div>}
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* CONTENT AREA */}
                {activeSubtask ? (
                    // --- SUBTASK VIEW ---
                    <div className="animate-in slide-in-from-right-8 duration-200 flex-1 space-y-6">

                        {/* Description */}
                        <div>
                            <label className="text-xs font-semibold text-zinc-500 uppercase mb-2 block">Notes</label>
                            <textarea
                                value={activeSubtask.description || ''}
                                onChange={(e) => updateSubtask(activeSubtask.id, { description: e.target.value })}
                                placeholder="Add notes for this subtask..."
                                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 placeholder-zinc-600 focus:border-indigo-500/50 outline-none min-h-[150px] resize-y"
                            />
                        </div>

                        {/* Checklist */}
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">Checklist</h3>
                            <div className="space-y-2 mb-3">
                                {activeSubtask.checklist?.map(item => (
                                    <div key={item.id} className="flex items-center gap-3 p-2 bg-zinc-950/30 rounded-lg group border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                                        <button
                                            onClick={() => {
                                                const newChecklist = activeSubtask.checklist?.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i);
                                                updateSubtask(activeSubtask.id, { checklist: newChecklist });
                                            }}
                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${item.checked ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-600 hover:border-indigo-400'}`}
                                        >
                                            {item.checked && <Check size={10} className="text-white" />}
                                        </button>
                                        <input
                                            type="text"
                                            value={item.text}
                                            onChange={(e) => {
                                                const newChecklist = activeSubtask.checklist?.map(i => i.id === item.id ? { ...i, text: e.target.value } : i);
                                                updateSubtask(activeSubtask.id, { checklist: newChecklist });
                                            }}
                                            className={`flex-1 bg-transparent border-none outline-none text-sm ${item.checked ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}
                                        />
                                        <button
                                            onClick={() => {
                                                const newChecklist = activeSubtask.checklist?.filter(i => i.id !== item.id);
                                                updateSubtask(activeSubtask.id, { checklist: newChecklist });
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const input = e.currentTarget.elements.namedItem('subCheckInput') as HTMLInputElement;
                                    const text = input.value.trim();
                                    if (!text) return;
                                    const newItem = { id: crypto.randomUUID(), text, checked: false };
                                    const currentChecklist = activeSubtask.checklist || [];
                                    updateSubtask(activeSubtask.id, { checklist: [...currentChecklist, newItem] });
                                    input.value = '';
                                }}
                                className="flex items-center gap-2"
                            >
                                <div className="w-4 h-4 flex items-center justify-center"><Plus size={14} className="text-zinc-600" /></div>
                                <input
                                    name="subCheckInput"
                                    type="text"
                                    placeholder="Add checklist item..."
                                    className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-300 placeholder-zinc-600"
                                    autoFocus
                                />
                            </form>
                        </div>
                    </div>
                ) : (
                    // --- MAIN TASK VIEW ---
                    <div className="animate-in slide-in-from-left-8 duration-200 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-8">

                            {/* Description */}
                            <div>
                                <label className="text-xs font-semibold text-zinc-500 uppercase mb-2 block">Description</label>
                                <textarea
                                    value={task.description || ''}
                                    onChange={(e) => updateTask(task.id, { description: e.target.value })}
                                    placeholder="Add a more detailed description..."
                                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 placeholder-zinc-600 focus:border-indigo-500/50 outline-none min-h-[100px] resize-y"
                                />
                            </div>

                            {/* Checklist */}
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">Checklist</h3>
                                <div className="space-y-2 mb-3">
                                    {task.checklist?.map(item => (
                                        <div key={item.id} className="flex items-center gap-3 p-2 bg-zinc-950/30 rounded-lg group border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                                            <button
                                                onClick={() => {
                                                    const newChecklist = task.checklist?.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i);
                                                    updateTask(task.id, { checklist: newChecklist });
                                                }}
                                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${item.checked ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-600 hover:border-indigo-400'}`}
                                            >
                                                {item.checked && <Check size={10} className="text-white" />}
                                            </button>
                                            <input
                                                type="text"
                                                value={item.text}
                                                onChange={(e) => {
                                                    const newChecklist = task.checklist?.map(i => i.id === item.id ? { ...i, text: e.target.value } : i);
                                                    updateTask(task.id, { checklist: newChecklist });
                                                }}
                                                className={`flex-1 bg-transparent border-none outline-none text-sm ${item.checked ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}
                                            />
                                            <button
                                                onClick={() => {
                                                    const newChecklist = task.checklist?.filter(i => i.id !== item.id);
                                                    updateTask(task.id, { checklist: newChecklist });
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const input = e.currentTarget.elements.namedItem('checklistInput') as HTMLInputElement;
                                        const text = input.value.trim();
                                        if (!text) return;
                                        const newItem = { id: crypto.randomUUID(), text, checked: false };
                                        const currentChecklist = task.checklist || [];
                                        updateTask(task.id, { checklist: [...currentChecklist, newItem] });
                                        input.value = '';
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <div className="w-4 h-4 flex items-center justify-center"><Plus size={14} className="text-zinc-600" /></div>
                                    <input
                                        name="checklistInput"
                                        type="text"
                                        placeholder="Add checklist item..."
                                        className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-300 placeholder-zinc-600"
                                    />
                                </form>
                            </div>

                            {/* Subtasks (Sortable List) */}
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">Subtasks</h3>

                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCorners}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={task.subtasks?.map(s => s.id) || []}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-2 mb-3 pl-6"> {/* Added padding-left for drag handle space */}
                                            {task.subtasks?.map(subtask => (
                                                <SortableSubtaskItem
                                                    key={subtask.id}
                                                    subtask={subtask}
                                                    toggleSubtask={(id, e) => { e.stopPropagation(); toggleSubtask(id); }}
                                                    onNavigate={(id) => setViewingSubtaskId(id)}
                                                    onDelete={(id, e) => { e.stopPropagation(); deleteSubtask(id); }}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>

                                <form onSubmit={handleAddSubtask} className="flex items-center gap-2 mb-4">
                                    <div className="w-4 h-4 flex items-center justify-center"><Plus size={14} className="text-zinc-600" /></div>
                                    <input
                                        type="text"
                                        value={newSubtask}
                                        onChange={e => setNewSubtask(e.target.value)}
                                        placeholder="Add subtask..."
                                        className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-300 placeholder-zinc-600"
                                    />
                                </form>

                                <button
                                    onClick={handleGenerateSubtasks}
                                    disabled={isGenerating}
                                    className="w-full py-2 flex items-center justify-center gap-2 text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Sparkles size={14} />
                                    {isGenerating ? 'Generating...' : 'Auto-Generate Steps'}
                                </button>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-900 space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-zinc-500 uppercase">Tags</label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {task.tags.contexts.map(tag => (
                                            <span key={tag} className="flex items-center gap-1 text-[10px] px-2 py-1 bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                                                {tag}
                                                <button onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors"><X size={10} /></button>
                                            </span>
                                        ))}
                                    </div>
                                    <form onSubmit={addTag} className="mt-2 flex items-center gap-2">
                                        <Plus size={14} className="text-zinc-600" />
                                        <input
                                            type="text"
                                            value={newTag}
                                            onChange={e => setNewTag(e.target.value)}
                                            placeholder="Add tag..."
                                            className="bg-transparent border-none outline-none text-xs text-zinc-300 placeholder-zinc-700 w-full"
                                        />
                                    </form>
                                </div>

                                <div className="h-px bg-zinc-900" />

                                <div>
                                    <label className="text-xs font-semibold text-zinc-500 uppercase">Original Thought</label>
                                    <p className="text-sm text-zinc-400 mt-1 italic">"{task.originalThought}"</p>
                                </div>

                                {task.scheduledAt && (
                                    <div>
                                        <label className="text-xs font-semibold text-zinc-500 uppercase">Due Date</label>
                                        <p className="text-sm text-zinc-300 mt-1">{new Date(task.scheduledAt).toLocaleDateString()}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
