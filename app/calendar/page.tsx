'use client';

import React, { useState, useMemo } from 'react';
import {
    DndContext,
    DragOverlay,
    useDraggable,
    useDroppable,
    DragStartEvent,
    DragEndEvent,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    Modifier,
} from '@dnd-kit/core';
import { useSecondBrain } from '../lib/store';
import { Task } from '../lib/types';
import { Search, GripVertical, X, Pencil, Check } from 'lucide-react';
import { startOfWeek, addDays, format, setHours, setMinutes, getDay, getHours } from 'date-fns';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CELL_HEIGHT = 60; // pixel height per hour
const SLOT_DURATION = 60; // minutes per slot

// --- Components ---

function DraggableTask({ task, isOverlay }: { task: Task; isOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: task.id,
        data: { type: 'task', task },
    });

    if (isDragging && !isOverlay) {
        return <div ref={setNodeRef} className="opacity-30 p-3 bg-zinc-800 rounded mb-2 border border-zinc-700 h-16" />;
    }

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`p-3 bg-zinc-800 rounded-lg border border-zinc-700 mb-2 cursor-grab active:cursor-grabbing hover:bg-zinc-700 transition-colors shadow-sm select-none ${isOverlay ? 'shadow-xl scale-105 z-50 cursor-grabbing' : ''}`}
        >
            <div className="flex items-start gap-2">
                <GripVertical size={16} className="text-zinc-500 mt-0.5 flex-shrink-0" />
                <div>
                    <div className="text-sm font-medium text-zinc-200 line-clamp-2">{task.title}</div>
                    <div className="text-xs text-zinc-500 mt-1 flex gap-2">
                        <span>{task.tags.time}</span>
                        <span>{task.tags.energy}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Simplified Cell - reduces listeners significantly (4x)
function DroppableCell({ dayIndex, hour, children }: { dayIndex: number; hour: number; children?: React.ReactNode }) {
    const { isOver, setNodeRef } = useDroppable({
        id: `cell-${dayIndex}-${hour}`,
        data: { dayIndex, hour },
    });

    return (
        <div
            ref={setNodeRef}
            className={`border-b border-r border-zinc-800/50 relative flex flex-col`}
            style={{ height: CELL_HEIGHT }}
        >
            {/* Visual Helpers for 15 min increments (optional, purely visual) */}
            {isOver && (
                <>
                    {/* Minimal helpers if needed, but placeholder handles main visual now */}
                </>
            )}
            {children}
        </div>
    );
}

// Editor Component
function TaskTimeEditor({ task, onSave, onCancel }: { task: Task, onSave: (start: number, duration: number) => void, onCancel: () => void }) {
    const start = new Date(task.scheduledAt!);
    const end = new Date(start.getTime() + (task.duration || 30) * 60000);

    const [startStr, setStartStr] = useState(format(start, 'HH:mm'));
    const [endStr, setEndStr] = useState(format(end, 'HH:mm'));

    const handleSave = () => {
        const [sH, sM] = startStr.split(':').map(Number);
        const [eH, eM] = endStr.split(':').map(Number);

        if (isNaN(sH) || isNaN(eH)) return; // Simple validation

        let newStart = setMinutes(setHours(start, sH), sM);
        let newEnd = setMinutes(setHours(start, eH), eM);

        // Handle crossing midnight (simple check)
        if (newEnd <= newStart) {
            // Assume next day if end time is smaller than start time
            // Or strictly, duration must be positive. 
            // If user sets 13:00 to 12:00, it's ambiguous. But let's assume valid duration flows forward.
            // If it's effectively 24 hours, or just separate days, this simple editor assumes same day largely.
            // Let's just fix the date to match the start date day first.
            newEnd = setMinutes(setHours(newStart, eH), eM);
            if (newEnd <= newStart) newEnd = addDays(newEnd, 1);
        }

        const duration = Math.round((newEnd.getTime() - newStart.getTime()) / 60000);
        onSave(newStart.getTime(), duration);
    };

    return (
        <div
            className="absolute top-0 left-full ml-2 bg-zinc-900 border border-zinc-700 p-3 rounded-lg shadow-xl z-50 w-48 flex flex-col gap-3 cursor-default"
            onPointerDown={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
        >
            <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Start</label>
                    <input
                        type="time"
                        value={startStr}
                        onChange={e => setStartStr(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <div className="flex-1 space-y-1">
                    <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">End</label>
                    <input
                        type="time"
                        value={endStr}
                        onChange={e => setEndStr(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                </div>
            </div>

            <div className="flex gap-2">
                <button onClick={handleSave} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-1.5 rounded font-medium flex items-center justify-center gap-1 transition-colors">
                    <Check size={12} /> Save
                </button>
                <button onClick={onCancel} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-1.5 rounded font-medium transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    );
}

function ScheduledTaskBlock({ task, updateTask }: { task: Task; updateTask: (id: string, updates: Partial<Task>) => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const date = new Date(task.scheduledAt!);
    const minutes = date.getMinutes();
    const duration = task.duration || parseInt(task.tags.time) || 30; // Fallback or parse "15 min"

    // Calculate position
    const topOffset = (minutes / 60) * CELL_HEIGHT;
    const height = (duration / 60) * CELL_HEIGHT;

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: task.id,
        data: { type: 'scheduled-task', task },
        disabled: isEditing
    });

    // Resize Logic
    const handleResizeStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        const startY = e.clientY;
        const startHeight = height;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaY = moveEvent.clientY - startY;
            const newHeight = Math.max(CELL_HEIGHT / 4, startHeight + deltaY); // Min 15 mins

            // Just local visual update would go here if we had local state for height
        };

        const onMouseUp = (upEvent: MouseEvent) => {
            const deltaY = upEvent.clientY - startY;
            const newHeight = Math.max(CELL_HEIGHT / 4, startHeight + deltaY);
            // Snap to 15 min increments
            const rawMinutes = (newHeight / CELL_HEIGHT) * 60;
            const snapedMinutes = Math.round(rawMinutes / 15) * 15;

            updateTask(task.id, { duration: Math.max(15, snapedMinutes) });

            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    if (isDragging) return null; // Hide original while dragging

    return (

        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`absolute left-1 right-1 rounded group select-none z-10 
                ${isEditing ? 'z-50' : ''}`}
            style={{
                top: `${topOffset}px`,
                height: `${height}px`,
                minHeight: '20px'
            }}
        >
            <div
                className={`w-full h-full rounded px-2 py-1 text-xs text-white border shadow-sm cursor-grab active:cursor-grabbing overflow-hidden relative
                    ${isEditing ? 'bg-indigo-600 border-indigo-400 ring-2 ring-indigo-400' : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400/50'}`}
            >
                <div className="flex justify-between items-start gap-1 relative z-10">
                    <div className="font-semibold truncate">{task.title}</div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                setIsEditing(!isEditing);
                            }}
                            className="p-0.5 hover:bg-indigo-400 rounded"
                        >
                            <Pencil size={12} />
                        </button>
                        <button
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                // We use onMouseDown to catch it before drag starts
                                updateTask(task.id, { scheduledAt: undefined });
                            }}
                            className="p-0.5 hover:bg-indigo-400 rounded"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>

                {height > 40 && <div className="opacity-80 truncate">{duration}m</div>}

                {/* Resize Handle */}
                <div
                    onMouseDown={handleResizeStart}
                    className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-indigo-400/50 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                />
            </div>

            {isEditing && (
                <TaskTimeEditor
                    task={task}
                    onSave={(newStart, newDuration) => {
                        updateTask(task.id, { scheduledAt: newStart, duration: newDuration });
                        setIsEditing(false);
                    }}
                    onCancel={() => setIsEditing(false)}
                />
            )}
        </div>
    );

}

// --- Main Page ---

export default function CalendarPage() {
    const { tasks, updateTask } = useSecondBrain();
    const [searchQuery, setSearchQuery] = useState('');
    const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday start
    const [activeDragItem, setActiveDragItem] = useState<Task | null>(null);
    const [activeDragType, setActiveDragType] = useState<'task' | 'scheduled-task' | null>(null);
    const [dragPlaceholder, setDragPlaceholder] = useState<{ dayIndex: number; hour: number; minute: number; duration: number } | null>(null);

    // Filtering
    const unscheduledTasks = tasks.filter(t =>
        !t.scheduledAt &&
        t.status !== 'done' &&
        t.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get scheduled tasks for the week
    const weekEnd = addDays(weekStart, 7);
    const scheduledTasks = tasks.filter(t =>
        t.scheduledAt &&
        t.scheduledAt >= weekStart.getTime() &&
        t.scheduledAt < weekEnd.getTime()
    );

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const item = event.active.data.current?.task as Task;
        const type = event.active.data.current?.type as 'task' | 'scheduled-task';
        setActiveDragItem(item);
        setActiveDragType(type);
    };

    const handleDragMove = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over) {
            setDragPlaceholder(null);
            return;
        }

        // Parse ID: cell-DAY-HOUR
        const parts = over.id.toString().split('-');
        if (parts[0] !== 'cell') {
            setDragPlaceholder(null);
            return;
        }

        const dayIndex = parseInt(parts[1]);
        const hour = parseInt(parts[2]);

        let minute = 0;
        if (active.rect.current.translated && active.rect.current.translated.top) {
            const overElement = document.getElementById(over.id as string);
            if (overElement) {
                const overRect = overElement.getBoundingClientRect();
                const activeTop = active.rect.current.translated.top;
                const relativeY = activeTop - overRect.top;
                const rawMinutes = (relativeY / CELL_HEIGHT) * 60;
                minute = Math.round(rawMinutes / 15) * 15;
                if (minute < 0) minute = 0;
                if (minute > 45) minute = 45;
            }
        }

        const task = active.data.current?.task as Task;
        const duration = task?.duration || parseInt(task?.tags?.time) || 30;

        // Optimization: Only update if changed
        setDragPlaceholder(prev => {
            if (prev?.dayIndex === dayIndex && prev?.hour === hour && prev?.minute === minute) return prev;
            return { dayIndex, hour, minute, duration };
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragItem(null);
        setDragPlaceholder(null);

        if (!over) return;

        // Parse ID: cell-DAY-HOUR
        const parts = over.id.toString().split('-');
        if (parts[0] !== 'cell') return;

        const dayIndex = parseInt(parts[1]);
        const hour = parseInt(parts[2]);

        let minute = 0;

        // Calculate refined minute based on drop position relative to cell
        if (active.rect.current.translated && active.rect.current.translated.top) {
            const overElement = document.getElementById(over.id as string);
            if (overElement) {
                const overRect = overElement.getBoundingClientRect();
                const activeTop = active.rect.current.translated.top;
                const relativeY = activeTop - overRect.top;
                const rawMinutes = (relativeY / CELL_HEIGHT) * 60;
                minute = Math.round(rawMinutes / 15) * 15;

                // Clamp
                if (minute < 0) minute = 0;
                if (minute > 45) minute = 45;
            }
        }

        // Calculate new date
        const targetDate = addDays(weekStart, dayIndex);
        const newScheduledAt = setMinutes(setHours(targetDate, hour), minute).getTime();

        const task = active.data.current?.task as Task;

        // If it's a new task (not previously scheduled) or moving existin
        // We just update scheduledAt. 
        // We also ensure duration is set if missing.
        let updates: Partial<Task> = { scheduledAt: newScheduledAt };
        if (!task.duration) {
            // Parse duration from time tag or default to 30
            const estimate = parseInt(task.tags.time) || 30; // "15 min" -> 15
            updates.duration = estimate;
        }

        updateTask(task.id, updates);
    };

    const handleRemoveFromSchedule = (taskId: string) => {
        updateTask(taskId, { scheduledAt: undefined });
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-screen bg-zinc-950 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-80 border-r border-zinc-900 bg-zinc-950 flex flex-col z-20 shadow-xl">
                    <div className="p-4 border-b border-zinc-900">
                        <h2 className="text-lg font-bold text-white mb-1">Time Blocking</h2>
                        <p className="text-xs text-zinc-500">Drag actions onto the calendar</p>
                    </div>

                    <div className="p-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-zinc-600" size={14} />
                            <input
                                type="text"
                                placeholder="Search actions..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3">
                        {unscheduledTasks.length === 0 ? (
                            <div className="text-center text-zinc-500 py-8 text-sm italic">
                                No unscheduled tasks found.
                            </div>
                        ) : (
                            unscheduledTasks.map(task => (
                                <DraggableTask key={task.id} task={task} />
                            ))
                        )}
                    </div>
                </aside>

                {/* Main Calendar Area */}
                <main className="flex-1 flex flex-col overflow-hidden relative">
                    {/* Calendar Header */}
                    <header className="h-16 flex items-center border-b border-zinc-900 px-6">
                        <div className="flex-1 text-center">
                            <h3 className="text-white font-medium">
                                {format(weekStart, 'MMMM yyyy')}
                            </h3>
                            <div className="text-xs text-zinc-500">
                                Week of {format(weekStart, 'do')}
                            </div>
                        </div>
                    </header>

                    {/* Grid Days Header */}
                    <div className="grid grid-cols-8 border-b border-zinc-900 bg-zinc-950/50">
                        <div className="p-2 border-r border-zinc-900/50" /> {/* Time Col */}
                        {DAYS.map((day, i) => {
                            const date = addDays(weekStart, i);
                            const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                            return (
                                <div key={day} className={`p-2 text-center border-r border-zinc-900/50 ${isToday ? 'bg-indigo-500/5' : ''}`}>
                                    <div className={`text-xs font-semibold ${isToday ? 'text-indigo-400' : 'text-zinc-500'}`}>{day}</div>
                                    <div className={`text-sm font-bold ${isToday ? 'text-white' : 'text-zinc-300'}`}>{format(date, 'd')}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Scrollable Grid */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-8 relative" style={{ minWidth: '800px' }}>
                            {/* Time Labels Column */}
                            <div className="border-r border-zinc-900/50 bg-zinc-950/20">
                                {HOURS.map(hour => (
                                    <div key={hour} className="border-b border-zinc-900/50 text-right pr-2 py-1 text-xs text-zinc-600 font-mono" style={{ height: CELL_HEIGHT }}>
                                        {hour}:00
                                    </div>
                                ))}
                            </div>

                            {/* Day Columns */}
                            {Array.from({ length: 7 }, (_, i) => {
                                const dayIndex = i;
                                const dayDate = addDays(weekStart, dayIndex);
                                // Tasks for this day
                                const dayTasks = scheduledTasks.filter(t => {
                                    const taskDate = new Date(t.scheduledAt!);
                                    return taskDate.getDate() === dayDate.getDate() &&
                                        taskDate.getMonth() === dayDate.getMonth() &&
                                        taskDate.getFullYear() === dayDate.getFullYear();
                                });

                                return (
                                    <div key={i} className="relative border-r border-zinc-900/50">
                                        {HOURS.map(hour => (
                                            <DroppableCell key={hour} dayIndex={dayIndex} hour={hour}>
                                                {/* We don't render tasks IN the cell directly via children because they might span multiple cells */}
                                                {/* Instead, we perform absolute positioning relative to the DAY column */}
                                            </DroppableCell>
                                        ))}

                                        {/* Render Scheduled Tasks Absolute over the day column */}
                                        {dayTasks.map(task => {
                                            const hour = new Date(task.scheduledAt!).getHours();
                                            // Only render if within our view hours
                                            if (hour >= HOURS[0] && hour <= HOURS[HOURS.length - 1]) {
                                                const top = (hour - HOURS[0]) * CELL_HEIGHT;
                                                // Fine tune minutes
                                                const minutes = new Date(task.scheduledAt!).getMinutes();
                                                const minuteOffset = (minutes / 60) * CELL_HEIGHT;
                                                const finalTop = top + minuteOffset;

                                                return (
                                                    <div key={task.id} style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${finalTop}px)` }} className="z-10 pointer-events-none">
                                                        {/* Wrapper div to reset transform for the draggable context if needed? NO, dnd-kit handles transform on the DRAG node. */}
                                                        {/* Actually, we need to pass a positioned wrapper or let ScheduledTaskBlock handle styles. */}
                                                        {/* But wait, if we wrap it in absolute, dnd-kit transform will apply to the inner block or the wrapper? */}
                                                        {/* Let's put the absolute positioning ON the component or wrapper */}
                                                        <div className="pointer-events-auto">
                                                            <ScheduledTaskBlock task={task} updateTask={updateTask} />
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                        {/* Render Drag Placeholder */}
                                        {dragPlaceholder && dragPlaceholder.dayIndex === i && (() => {
                                            const phHour = dragPlaceholder.hour;
                                            // Only render if within our view hours
                                            if (phHour >= HOURS[0] && phHour <= HOURS[HOURS.length - 1]) {
                                                const top = (phHour - HOURS[0]) * CELL_HEIGHT;
                                                const minuteOffset = (dragPlaceholder.minute / 60) * CELL_HEIGHT;
                                                const finalTop = top + minuteOffset;
                                                const height = (dragPlaceholder.duration / 60) * CELL_HEIGHT;

                                                return (
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 4,
                                                            right: 4,
                                                            height: `${height}px`,
                                                            transform: `translateY(${finalTop}px)`
                                                        }}
                                                        className="z-20 pointer-events-none bg-indigo-500/30 border-2 border-indigo-500/50 rounded-md transition-all duration-75 ease-out"
                                                    />
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </main>

                <DragOverlay>
                    {activeDragItem ? (
                        activeDragType === 'scheduled-task' ? (
                            <div
                                className="rounded px-2 py-1 text-xs bg-indigo-600 text-white border border-indigo-400/50 shadow-xl overflow-hidden"
                                style={{
                                    height: `${((activeDragItem.duration || parseInt(activeDragItem.tags.time) || 30) / 60) * CELL_HEIGHT}px`,
                                    minHeight: '20px',
                                    width: '100px' // Approximate column width for visual feedback
                                }}
                            >
                                <div className="font-semibold truncate">{activeDragItem.title}</div>
                                {(activeDragItem.duration || parseInt(activeDragItem.tags.time) || 30) > 40 && (
                                    <div className="opacity-80 truncate">{activeDragItem.duration || parseInt(activeDragItem.tags.time) || 30}m</div>
                                )}
                            </div>
                        ) : (
                            <div className="opacity-80">
                                <DraggableTask task={activeDragItem} isOverlay />
                            </div>
                        )
                    ) : null}
                </DragOverlay>
            </div>
        </DndContext>
    );
}
