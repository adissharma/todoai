'use client';

import { use, useMemo, useState, useEffect, useRef, Fragment } from 'react';
import { useSecondBrain } from '../../lib/store';
import { TaskItem } from '../../components/TaskItem';
import { TaskDetailModal } from '../../components/TaskDetailModal';
import { SortableTaskItem } from '../../components/SortableTaskItem';
import { ProjectModal } from '../../components/ProjectModal';
import { ViewControls, LayoutType, GroupingType, SortType, FilterState } from '../../components/ViewControls';
import { DatePicker } from '../../components/DatePicker';

import {
    ArrowLeft, Folder, MoreVertical, Pencil, Trash2, Sparkles, Check, X,
    Flag, Sun, ArrowRight, ChevronsRight, Calendar, CalendarOff, Star,
    SlidersHorizontal, Plus, GripVertical, ListChecks
} from 'lucide-react';
import Link from 'next/link';
import { Task } from '../../lib/types';
import { addDays, addWeeks, startOfWeek, startOfDay, isBefore, isAfter, isToday, isSameDay } from 'date-fns';
import { useSearchParams, useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Popover, Transition } from '@headlessui/react';

// DnD
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    KeyboardSensor,
    closestCorners,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
    DropAnimation,
    UniqueIdentifier
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    arrayMove
} from '@dnd-kit/sortable';

export default function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const searchParams = useSearchParams();
    const router = useRouter();
    const highlightedTaskId = searchParams.get('highlight');

    // Global Store
    const { projects, tasks, updateProject, deleteItem, addTask, updateTask, batchUpdateTasks } = useSecondBrain();
    const project = projects.find(p => p.id === id);

    // Initial Loading State or 404
    if (!project) {
        return (
            <div className="p-12 text-center text-zinc-500">
                Project not found.
                <Link href="/projects" className="underline ml-2">Go back</Link>
            </div>
        );
    }

    // --- Local State ---
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);

    // View State
    const [layout, setLayout] = useState<LayoutType>('list');
    const [grouping, setGrouping] = useState<GroupingType>('category');
    const [sorting, setSorting] = useState<SortType>('manual');
    const [filters, setFilters] = useState<FilterState>({ priority: 'all', date: 'all', label: 'all' });

    // Category Management State
    const [isGroupingLoading, setIsGroupingLoading] = useState(false);
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, taskId: string } | null>(null);
    const [contextMenuView, setContextMenuView] = useState<'main' | 'calendar'>('main');

    // Drag State
    const [activeDragId, setActiveDragId] = useState<UniqueIdentifier | null>(null);
    const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Close Modals on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (categoryToDelete) setCategoryToDelete(null);
                if (isEditModalOpen) setIsEditModalOpen(false);
                if (isAddingSection) setIsAddingSection(false);
                if (contextMenu) setContextMenu(null);
                if (isMenuOpen) setIsMenuOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [categoryToDelete, isEditModalOpen, isAddingSection, contextMenu, isMenuOpen]);

    // --- Derived Data ---

    const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) || null : null;

    // 1. Filter Tasks
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            // Base Project Filter
            if (t.projectId !== project.id) return false;

            // Status Filter (We generally show active in the main view, but let's be flexible)
            // For now, adhere to existing "Next Actions" style which hides completed usually, 
            // OR maybe we want a "Show Completed" toggle? 
            // The previous code had `activeTasks` and `completedTasks` separate.
            // Let's filter to ONLY 'todo' for the main view board/list, unless we add a 'status' filter.
            if (t.status === 'done') return false;

            // Priority Filter
            if (filters.priority !== 'all' && t.priority !== parseInt(filters.priority)) return false;

            // Date Filter
            if (filters.date !== 'all') {
                if (!t.scheduledAt) {
                    // if filter is for specific dates, unscheduled items might be excluded?
                    // logic: 'upcoming' might include today? 
                    // Let's interpret 'all' as everything.
                    // If 'today', must be today.
                    // If 'upcoming', must be future.
                    // If 'overdue', must be past.
                    return false; // Strict filtering for dates?
                }
                const date = new Date(t.scheduledAt);
                const now = new Date();
                if (filters.date === 'today' && !isToday(date)) return false;
                if (filters.date === 'overdue' && !isSameDay(date, now) && isBefore(date, now)) return false; // isBefore is strict, so check !isSameDay
                if (filters.date === 'upcoming' && (isBefore(date, now) || isToday(date))) return false;
            }

            // Label Filter
            if (filters.label !== 'all' && !t.tags.contexts.includes(filters.label)) return false;

            return true;
        });
    }, [tasks, project.id, filters]);

    // 2. Sort Tasks
    const sortedTasks = useMemo(() => {
        // If manual, we simply sort by order. If order is duplicate or missing, fallback to createdAt
        if (sorting === 'manual') {
            return [...filteredTasks].sort((a, b) => (a.order || 0) - (b.order || 0) || (b.createdAt - a.createdAt));
        }
        return [...filteredTasks].sort((a, b) => {
            if (sorting === 'alphabetical') return a.title.localeCompare(b.title);
            if (sorting === 'priority') return (a.priority || 4) - (b.priority || 4);
            if (sorting === 'date') return (a.scheduledAt || 9999999999999) - (b.scheduledAt || 9999999999999);
            // Default to Manual (Order) if nothing else matches, or fallback to creation for strictly everything else
            return (a.order || 0) - (b.order || 0) || (b.createdAt - a.createdAt);
        });
    }, [filteredTasks, sorting]);

    // 3. Group Tasks
    const groupedData = useMemo(() => {
        const groups: Record<string, Task[]> = {};
        const uncategorized: Task[] = [];

        // Define groups based on GroupingType
        if (grouping === 'none') {
            return { groups: { 'All Tasks': sortedTasks }, order: ['All Tasks'] };
        }

        if (grouping === 'priority') {
            // Pre-seed groups
            groups['High (P1)'] = [];
            groups['Medium (P2)'] = [];
            groups['Low (P3)'] = [];
            groups['None (P4)'] = [];

            sortedTasks.forEach(t => {
                const p = t.priority || 4;
                if (p === 1) groups['High (P1)'].push(t);
                else if (p === 2) groups['Medium (P2)'].push(t);
                else if (p === 3) groups['Low (P3)'].push(t);
                else groups['None (P4)'].push(t);
            });
            return {
                groups,
                order: ['High (P1)', 'Medium (P2)', 'Low (P3)', 'None (P4)']
            };
        }

        if (grouping === 'category') {
            // 1. Initialize groups from persisted project sections
            (project.sections || []).forEach(section => {
                groups[section] = [];
            });

            // 2. Distribute tasks
            sortedTasks.forEach(t => {
                const cat = t.category;
                if (cat) {
                    if (!groups[cat]) groups[cat] = []; // Catch ad-hoc categories not in project list
                    groups[cat].push(t);
                } else {
                    // Collect uncategorized
                    if (!groups['Uncategorized']) groups['Uncategorized'] = [];
                    groups['Uncategorized'].push(t);
                }
            });

            // 3. Ensure 'Uncategorized' exists for robustness
            if (!groups['Uncategorized']) groups['Uncategorized'] = [];

            // 4. Determine Order
            let order = [...(project.sections || [])];

            // Append ad-hoc categories (not in project sections)
            const adHoc = Object.keys(groups).filter(g => g !== 'Uncategorized' && !order.includes(g)).sort();
            order = [...order, ...adHoc];

            // Prepend Uncategorized (Inbox style)
            order = ['Uncategorized', ...order];

            return { groups, order };
        }

        // Status? We filtered out 'done', so mostly 'todo'.
        return { groups: { 'Tasks': sortedTasks }, order: ['Tasks'] };

    }, [sortedTasks, grouping]);

    // Available labels for filter dropdown
    const availableLabels = useMemo(() => {
        const set = new Set<string>();
        tasks.filter(t => t.projectId === project.id).forEach(t => {
            t.tags.contexts.forEach(c => set.add(c));
        });
        return Array.from(set);
    }, [tasks, project.id]);

    const completedTasks = tasks.filter(t => t.projectId === project.id && t.status === 'done');
    const progress = (tasks.filter(t => t.projectId === project.id).length > 0)
        ? Math.round((completedTasks.length / tasks.filter(t => t.projectId === project.id).length) * 100)
        : 0;


    // --- Handlers ---

    // 0. Context Menu
    const handleContextMenu = (e: React.MouseEvent, task: Task) => {
        e.preventDefault();
        setContextMenuView('main');
        setContextMenu({ x: e.clientX, y: e.clientY, taskId: task.id });
    };

    // 1. Task Management
    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        addTask({
            title: newTaskTitle.trim(),
            status: 'todo',
            list: 'next',
            projectId: project.id,
            tags: { time: '15 min', contexts: [] },
            originalThought: newTaskTitle.trim()
        });
        setNewTaskTitle('');
    };

    // 2. Auto Grouping
    const handleAutoGroup = async () => {
        // Find tasks that are effectively "Uncategorized" in the current project
        // Note: This only works meaningfully if we are using Category grouping mode or want to assign categories.
        const tasksToGroup = tasks.filter(t => t.projectId === project.id && t.status === 'todo' && !t.category);
        if (tasksToGroup.length === 0) return;

        setIsGroupingLoading(true);
        try {
            const existingGroups = Array.from(new Set(tasks.filter(t => t.projectId === project.id && t.category).map(t => t.category!)));
            const response = await fetch('/api/group-tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectName: project.name,
                    tasks: tasksToGroup.map(t => ({ id: t.id, title: t.title })),
                    existingGroups
                })
            });

            if (!response.ok) throw new Error('Grouping failed');
            const data = await response.json();

            if (data.groups) {
                data.groups.forEach((group: { categoryName: string; taskIds: string[] }) => {
                    group.taskIds.forEach(taskId => {
                        updateTask(taskId, { category: group.categoryName });
                    });
                });
            }
        } catch (error) {
            console.error('Failed to group', error);
            alert('Failed to auto-group. See console.');
        } finally {
            setIsGroupingLoading(false);
        }
    };

    // 3. Categories
    const handleAddSection = (e: React.FormEvent) => {
        e.preventDefault();
        const name = newSectionName.trim();
        if (!name) return;

        if ((project.sections || []).includes(name)) {
            alert('Section already exists');
            return;
        }

        updateProject(project.id, { sections: [...(project.sections || []), name] });
        setNewSectionName('');
        setIsAddingSection(false);
    };

    const handleRenameCategory = (oldName: string) => {
        if (!newCategoryName.trim() || newCategoryName === oldName) {
            setEditingCategory(null);
            return;
        }
        const name = newCategoryName.trim();

        // 1. Update Project Sections List
        if (project.sections?.includes(oldName)) {
            const newSections = project.sections.map(s => s === oldName ? name : s);
            updateProject(project.id, { sections: newSections });
        }

        // 2. Rename all tasks with this category in this project
        const affectedTasks = tasks.filter(t => t.projectId === project.id && t.category === oldName);
        affectedTasks.forEach(t => updateTask(t.id, { category: name }));

        setEditingCategory(null);
        setNewCategoryName('');
    };

    const confirmDeleteCategory = (includeTasks: boolean) => {
        if (!categoryToDelete) return;
        const affectedTasks = tasks.filter(t => t.projectId === project.id && t.category === categoryToDelete);

        if (includeTasks) {
            affectedTasks.forEach(t => deleteItem('task', t.id));
        } else {
            affectedTasks.forEach(t => updateTask(t.id, { category: undefined }));
        }

        // Update Project Sections (Remove the section)
        if (project.sections?.includes(categoryToDelete)) {
            const newSections = project.sections.filter(s => s !== categoryToDelete);
            updateProject(project.id, { sections: newSections });
        }

        setCategoryToDelete(null);
    };

    // 4. Board DnD
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveDragId(active.id);
        const task = tasks.find(t => t.id === active.id);
        if (task) setActiveDragTask(task);
    };

    const handleDragOver = (event: DragOverEvent) => {
        // Visual updates only - handled by DndKit overlay generally? 
        // We might need to handle optimistic updates here if dragging between columns.
        // For simplicity, we can defer to DragEnd unless we want reordering visual feedback within strictly.
    };



    const handleDragEnd = (event: DragEndEvent) => {
        try {
            const { active, over } = event;

            if (!over) return;
            const activeId = active.id as string;
            const overId = over.id as string;

            if (activeId === overId) return;

            const activeTask = tasks.find(t => t.id === activeId);
            if (!activeTask) return;

            // Auto-switch to manual sorting
            if (sorting !== 'manual') {
                setSorting('manual');
            }

            let targetGroupId: string | null = null;
            let isReordering = false;

            // Is overId a group key?
            if (groupedData.groups[overId]) {
                targetGroupId = overId;
            } else {
                // Find the task and its group
                for (const [gKey, gTasks] of Object.entries(groupedData.groups)) {
                    if (gTasks.find(t => t.id === overId)) {
                        targetGroupId = gKey;
                        isReordering = true;
                        break;
                    }
                }
            }

            if (targetGroupId) {
                const updates: { id: string; updates: Partial<Task> }[] = [];
                let groupChanged = false;

                // 1. Group Change Logic
                if (grouping === 'category') {
                    const newCat = targetGroupId === 'Uncategorized' ? undefined : targetGroupId;
                    if (activeTask.category !== newCat) {
                        updates.push({ id: activeId, updates: { category: newCat } });
                        groupChanged = true;
                    }
                } else if (grouping === 'priority') {
                    let newPriority: 1 | 2 | 3 | 4 = 4;
                    if (targetGroupId.includes('P1')) newPriority = 1;
                    else if (targetGroupId.includes('P2')) newPriority = 2;
                    else if (targetGroupId.includes('P3')) newPriority = 3;

                    if (activeTask.priority !== newPriority) {
                        updates.push({ id: activeId, updates: { priority: newPriority } });
                        groupChanged = true;
                    }
                }

                // 2. Reordering Logic initialization
                // We construct the new list for the target group
                // Filter out the active task from the target group list first.
                let targetList = (groupedData.groups[targetGroupId] || []).filter(t => t.id !== activeId);

                // Insert activeTask at correct position
                if (isReordering) {
                    const overIndex = targetList.findIndex(t => t.id === overId);
                    if (overIndex !== -1) {
                        // Default behavior: Insert AT index
                        targetList.splice(overIndex, 0, activeTask);
                    } else {
                        targetList.push(activeTask);
                    }
                } else {
                    // Dropped on container -> add to end
                    targetList.push(activeTask);
                }

                // 3. Assign New Orders to the Whole Group
                targetList.forEach((t, i) => {
                    const newOrder = i * 1000;
                    if (t.order !== newOrder) {
                        const existing = updates.find(u => u.id === t.id);
                        if (existing) {
                            existing.updates.order = newOrder;
                        } else {
                            updates.push({ id: t.id, updates: { order: newOrder } });
                        }
                    }
                });

                if (updates.length > 0) {
                    batchUpdateTasks(updates);
                }
            }
        } catch (error) {
            console.error('Drag failed', error);
        } finally {
            setActiveDragId(null);
            setActiveDragTask(null);
        }
    };


    // --- Sub-Components ---

    // Category Header Renderer (for List View)
    const renderCategoryHeader = (groupName: string, count: number) => {
        return (
            <div className="flex items-center gap-3 mb-2 group/header">
                {editingCategory === groupName ? (
                    <div className="flex items-center gap-2">
                        <input
                            autoFocus
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            className="bg-zinc-800 border-b border-indigo-500 text-sm font-bold text-white px-1 py-0.5 outline-none w-48"
                        />
                        <button onClick={() => handleRenameCategory(groupName)} className="text-indigo-400 hover:text-indigo-300"><Check size={14} /></button>
                        <button onClick={() => setEditingCategory(null)} className="text-zinc-500 hover:text-zinc-400"><X size={14} /></button>
                    </div>
                ) : (
                    <>
                        <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                            {grouping === 'category' ? <Folder size={14} className="text-zinc-600" /> : <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />}
                            {groupName}
                            <span className="text-zinc-600 font-normal text-xs">({count})</span>
                        </h3>
                        {grouping === 'category' && groupName !== 'Uncategorized' && (
                            <div className="opacity-0 group-hover/header:opacity-100 flex items-center gap-1 transition-opacity">
                                <button onClick={() => { setEditingCategory(groupName); setNewCategoryName(groupName); }} className="p-1 text-zinc-600 hover:text-zinc-300 rounded"><Pencil size={12} /></button>
                                <button onClick={() => setCategoryToDelete(groupName)} className="p-1 text-zinc-600 hover:text-red-400 rounded"><Trash2 size={12} /></button>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12 max-w-7xl mx-auto" onClick={() => setContextMenu(null)}>
            <TaskDetailModal task={selectedTask} onClose={() => setSelectedTaskId(null)} />
            <ProjectModal
                project={project}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={(data) => { updateProject(project.id, data); setIsEditModalOpen(false); setIsMenuOpen(false); }}
            />

            {/* Delete Category Modal */}
            {categoryToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl shadow-2xl max-w-sm w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-white">Delete "{categoryToDelete}"?</h3>
                        <p className="text-sm text-zinc-400">Tasks in this group will remain but be uncategorized unless you choose otherwise.</p>
                        <div className="flex flex-col gap-2 pt-2">
                            <button onClick={() => confirmDeleteCategory(false)} className="w-full px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors border border-zinc-700">
                                Keep Tasks (Ungroup)
                            </button>
                            <button onClick={() => confirmDeleteCategory(true)} className="w-full px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg text-sm font-medium transition-colors border border-red-500/20">
                                Delete Group & Tasks
                            </button>
                        </div>
                        <button onClick={() => setCategoryToDelete(null)} className="w-full px-4 py-2 text-zinc-500 hover:text-zinc-300 text-xs transition-colors mt-2">Cancel</button>
                    </div>
                </div>
            )}

            {/* Context Menu (Portaled) */}
            {contextMenu && createPortal(
                <div
                    className="fixed z-[100] bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl py-1 w-64 animate-in fade-in zoom-in-95 duration-75 overflow-hidden"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {contextMenuView === 'main' ? (
                        <div className="flex flex-col">
                            <div className="px-3 py-2">
                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Priority</div>
                                <div className="flex gap-1 justify-between mb-2">
                                    {[1, 2, 3, 4].map(p => (
                                        <button key={p} onClick={() => { updateTask(contextMenu.taskId, { priority: p as any }); setContextMenu(null); }} className="p-1 hover:bg-zinc-800 rounded">
                                            <Flag size={14} className={p === 1 ? "text-red-500" : p === 2 ? "text-orange-500" : p === 3 ? "text-blue-500" : "text-zinc-500"} />
                                        </button>
                                    ))}
                                </div>
                                <div className="h-px bg-zinc-800 my-2" />
                                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Schedule</div>
                                <div className="flex gap-1 justify-between mb-2">
                                    <button onClick={() => { updateTask(contextMenu.taskId, { scheduledAt: startOfDay(new Date()).getTime() }); setContextMenu(null); }} className="p-1 hover:bg-zinc-800 rounded" title="Today"><Star size={14} className="text-yellow-500" /></button>
                                    <button onClick={() => { updateTask(contextMenu.taskId, { scheduledAt: addDays(startOfDay(new Date()), 1).getTime() }); setContextMenu(null); }} className="p-1 hover:bg-zinc-800 rounded" title="Tomorrow"><Sun size={14} className="text-orange-400" /></button>
                                    <button onClick={() => { updateTask(contextMenu.taskId, { scheduledAt: startOfWeek(addWeeks(new Date(), 1)).getTime() }); setContextMenu(null); }} className="p-1 hover:bg-zinc-800 rounded" title="Next Week"><ArrowRight size={14} className="text-purple-400" /></button>
                                    <button onClick={() => { updateTask(contextMenu.taskId, { scheduledAt: undefined }); setContextMenu(null); }} className="p-1 hover:bg-zinc-800 rounded" title="Clear"><CalendarOff size={14} className="text-zinc-500" /></button>
                                </div>
                            </div>
                            <div className="h-px bg-zinc-800 my-1" />
                            <button onClick={() => {
                                const t = tasks.find(t => t.id === contextMenu.taskId);
                                if (t) {
                                    const newSub = { id: crypto.randomUUID(), title: '', completed: false };
                                    updateTask(t.id, { subtasks: [...(t.subtasks || []), newSub] });
                                }
                                setContextMenu(null);
                            }} className="px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 text-left flex items-center gap-2">
                                <ListChecks size={14} /> Add Subtask
                            </button>
                            <button onClick={() => setContextMenuView('calendar')} className="px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 text-left flex items-center gap-2">
                                <Calendar size={14} /> Schedule Custom...
                            </button>
                            <button onClick={() => { if (confirm('Delete?')) deleteItem('task', contextMenu.taskId); setContextMenu(null); }} className="px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 text-left flex items-center gap-2">
                                <Trash2 size={14} /> Delete
                            </button>
                        </div>
                    ) : (
                        <DatePicker
                            onSelect={(date) => { updateTask(contextMenu.taskId, { scheduledAt: date.getTime() }); setContextMenu(null); }}
                            onClose={() => setContextMenu(null)}
                        />
                    )}
                </div>,
                document.body
            )}

            {/* --- Header --- */}
            <header className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <Link href="/projects" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm">
                        <ArrowLeft size={16} /> Back to Projects
                    </Link>

                    <div className="flex items-center gap-2">
                        {/* View Options Popover */}
                        <Popover className="relative">
                            <Popover.Button className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg text-sm transition-colors outline-none focus:ring-2 focus:ring-indigo-500/50">
                                <SlidersHorizontal size={16} />
                                View
                            </Popover.Button>
                            <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-1" enterTo="opacity-100 translate-y-0" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0" leaveTo="opacity-0 translate-y-1">
                                <Popover.Panel className="absolute right-0 mt-2 z-50 w-80">
                                    <ViewControls
                                        layout={layout} onLayoutChange={setLayout}
                                        grouping={grouping} onGroupingChange={setGrouping}
                                        sorting={sorting} onSortingChange={setSorting}
                                        filters={filters} onFilterChange={setFilters}
                                        availableLabels={availableLabels}
                                    />
                                </Popover.Panel>
                            </Transition>
                        </Popover>

                        {/* Project Settings Menu */}
                        <div className="relative" ref={menuRef}>
                            <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors">
                                <MoreVertical size={20} />
                            </button>
                            {isMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                                    <button onClick={() => setIsEditModalOpen(true)} className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2">
                                        <Pencil size={14} /> Edit Project
                                    </button>
                                    <button onClick={() => { if (confirm('Delete Project?')) { deleteItem('project', project.id); router.push('/'); } }} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 border-t border-zinc-800">
                                        <Trash2 size={14} /> Delete Project
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Title & Progress */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-indigo-500/10 rounded-xl">
                                <Folder size={32} className="text-indigo-400" />
                            </div>
                            <h1 className="text-4xl font-bold tracking-tight">{project.name}</h1>
                        </div>
                        <div className="text-zinc-400 max-w-2xl text-lg leading-relaxed">
                            <span className="text-indigo-400 font-medium text-xs uppercase tracking-widest block mb-2">Desired Outcome</span>
                            {project.outcome}
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                        <div className="flex items-center gap-2 text-2xl font-bold font-mono text-zinc-200">
                            {progress}% <span className="text-sm font-sans font-normal text-zinc-500 self-end mb-1">Complete</span>
                        </div>
                        <div className="w-full md:w-48 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </div>
            </header>

            {/* --- Main Content --- */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
            >
                <div>
                    {/* Sub-Header / Controls Area */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            {groupedData.order.length > 1 ? `Grouped by ${grouping}` : 'All Tasks'} ({filteredTasks.length})
                        </h2>

                        {grouping === 'category' && (
                            <button
                                onClick={handleAutoGroup}
                                disabled={isGroupingLoading || !tasks.some(t => !t.category)}
                                className="text-xs flex items-center gap-1.5 px-3 py-1.5 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Sparkles size={12} />
                                {isGroupingLoading ? 'Grouping...' : 'AI Group'}
                            </button>
                        )}
                    </div>

                    {/* Quick Add */}
                    <form onSubmit={handleAddTask} className="mb-8">
                        <div className="relative">
                            <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                            <input
                                type="text"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="Add new action..."
                                className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-xl pl-11 pr-4 py-3 text-sm text-zinc-200 focus:outline-none focus:bg-zinc-900 focus:border-indigo-500/50 transition-all placeholder:text-zinc-600"
                            />
                        </div>
                    </form>

                    {/* --- VIEW RENDERER --- */}

                    {filteredTasks.length === 0 ? (
                        <div className="p-12 border border-dashed border-zinc-800 rounded-xl text-center text-zinc-600 flex flex-col items-center gap-2">
                            <Sparkles size={24} className="opacity-20 mb-2" />
                            <p>No tasks match your filters.</p>
                            <button onClick={() => { setFilters({ priority: 'all', date: 'all', label: 'all' }); setNewTaskTitle(''); }} className="text-indigo-400 hover:underline text-sm">Clear filters</button>
                        </div>
                    ) : (
                        layout === 'board' ? (
                            // BOARD VIEW
                            <div className="flex gap-6 overflow-x-auto pb-8 items-start min-h-[50vh]">
                                {groupedData.order.map(groupKey => {
                                    const groupTasks = groupedData.groups[groupKey] || [];
                                    return (
                                        <div key={groupKey} className="min-w-[300px] w-[300px] flex-shrink-0 bg-zinc-900/30 rounded-xl border border-zinc-800/50 flex flex-col max-h-[70vh]">
                                            <div className="p-3 border-b border-zinc-800/50 sticky top-0 bg-zinc-900/90 backdrop-blur z-10 rounded-t-xl">
                                                {renderCategoryHeader(groupKey, groupTasks.length)}
                                            </div>
                                            <div className="p-2 overflow-y-auto flex-1 space-y-2 custom-scrollbar">
                                                <SortableContext id={groupKey} items={groupTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                                    {groupTasks.map(task => (
                                                        <SortableTaskItem
                                                            key={task.id}
                                                            task={task}
                                                            onTaskClick={() => setSelectedTaskId(task.id)}
                                                            onContextMenu={handleContextMenu}
                                                            isHighlighted={highlightedTaskId === task.id}
                                                        />
                                                    ))}
                                                    {/* Empty drop zone placeholder if needed? DndKit handles empty sortables if defined */}
                                                    {groupTasks.length === 0 && (
                                                        <div className="h-24 flex items-center justify-center text-xs text-zinc-600 border border-dashed border-zinc-800/50 rounded">
                                                            Empty
                                                        </div>
                                                    )}
                                                </SortableContext>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Add Section Button (Board View) */}
                                {grouping === 'category' && (
                                    <div className="min-w-[300px] flex-shrink-0">
                                        {isAddingSection ? (
                                            <form onSubmit={handleAddSection} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 animate-in fade-in zoom-in-95">
                                                <input
                                                    autoFocus
                                                    value={newSectionName}
                                                    onChange={e => setNewSectionName(e.target.value)}
                                                    placeholder="Section name..."
                                                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none mb-2"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-1.5 rounded transition-colors">Add</button>
                                                    <button type="button" onClick={() => setIsAddingSection(false)} className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white">Cancel</button>
                                                </div>
                                            </form>
                                        ) : (
                                            <button
                                                onClick={() => setIsAddingSection(true)}
                                                className="w-full py-3 flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 border border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl transition-all"
                                            >
                                                <Plus size={16} /> Add Section
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            // LIST VIEW
                            <div className="space-y-8 animate-in fade-in duration-300">
                                {groupedData.order.map(groupKey => {
                                    const groupTasks = groupedData.groups[groupKey] || [];
                                    if (groupTasks.length === 0 && grouping === 'none') return null; // Don't show empty groups in list view if none

                                    return (
                                        <div key={groupKey}>
                                            {grouping !== 'none' && (
                                                <div className="mb-2">
                                                    {renderCategoryHeader(groupKey, groupTasks.length)}
                                                </div>
                                            )}
                                            <SortableContext id={groupKey} items={groupTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                                <div className="space-y-2">
                                                    {groupTasks.map(task => (
                                                        <SortableTaskItem
                                                            key={task.id}
                                                            task={task}
                                                            onTaskClick={() => setSelectedTaskId(task.id)}
                                                            onContextMenu={handleContextMenu}
                                                            isHighlighted={highlightedTaskId === task.id}
                                                        />
                                                    ))}
                                                </div>
                                            </SortableContext>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}

                </div>

                <DragOverlay dropAnimation={{
                    sideEffects: defaultDropAnimationSideEffects({
                        styles: {
                            active: {
                                opacity: '0.4',
                            },
                        },
                    }),
                }}>
                    {activeDragTask ? (
                        <div className="w-[300px]">
                            <TaskItem task={activeDragTask} isHighlighted />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Completed Tasks (Bottom) */}
            {completedTasks.length > 0 && (
                <div className="mt-16 pt-8 border-t border-zinc-900/50">
                    <button onClick={() => {/* toggle? */ }} className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                        Completed ({completedTasks.length})
                    </button>
                    <div className="space-y-2 opacity-50 hover:opacity-100 transition-opacity">
                        {completedTasks.slice(0, 5).map(task => (
                            <TaskItem key={task.id} task={task} />
                        ))}
                        {completedTasks.length > 5 && <p className="text-xs text-zinc-600 text-center pt-2">...and {completedTasks.length - 5} more</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
