'use client';

import React from 'react';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { Task } from '../lib/types';
import { useSecondBrain } from '../lib/store';

// Helper to get start of day timestamp
const getStartOfDay = (date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate.getTime();
};

const DraggableTask = ({ task }: { task: Task }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: task.id,
    });
    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="p-3 bg-zinc-800 rounded-lg shadow-sm mb-2 cursor-move border border-zinc-700 hover:border-indigo-500 transition-colors z-50 relative">
            <div className="text-sm text-zinc-200 font-medium">{task.title}</div>
            <div className="flex gap-1 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-400">{task.tags.time}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-zinc-700 rounded text-zinc-400">{task.tags.energy}</span>
            </div>
        </div>
    );
};

const DroppableDay = ({ date, tasks, title }: { date: number | null, tasks: Task[], title: string }) => {
    // ID must be string
    const droppableId = date ? date.toString() : 'unscheduled';

    const { setNodeRef } = useDroppable({
        id: droppableId,
    });

    return (
        <div ref={setNodeRef} className="flex-1 min-w-[200px] bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col h-[600px]">
            <h3 className="text-zinc-400 font-medium mb-4 uppercase text-xs tracking-wider border-b border-zinc-800 pb-2">{title}</h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {tasks.map(task => (
                    <DraggableTask key={task.id} task={task} />
                ))}
                {tasks.length === 0 && (
                    <div className="h-full flex items-center justify-center text-zinc-700 text-xs italic">
                        No tasks
                    </div>
                )}
            </div>
        </div>
    );
};

export function CalendarBoard() {
    const { tasks, updateTask } = useSecondBrain();

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            // If dropped on "unscheduled", remove scheduledAt
            if (over.id === 'unscheduled') {
                updateTask(active.id as string, { scheduledAt: undefined });
            } else {
                // If dropped on a date timestamp
                const newDate = parseInt(over.id as string);
                if (!isNaN(newDate)) {
                    updateTask(active.id as string, { scheduledAt: newDate });
                }
            }
        }
    };

    // Prepare Columns
    const today = getStartOfDay(new Date());
    const tomorrow = today + 86400000;
    const dayAfter = tomorrow + 86400000;

    const unscheduledTasks = tasks.filter(t => !t.scheduledAt && t.status !== 'done');
    const todayTasks = tasks.filter(t => t.scheduledAt === today);
    const tomorrowTasks = tasks.filter(t => t.scheduledAt === tomorrow);
    const dayAfterTasks = tasks.filter(t => t.scheduledAt === dayAfter);

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <div className="flex overflow-x-auto gap-4 p-4 pb-8 w-full">
                <DroppableDay date={null} tasks={unscheduledTasks} title="Unscheduled (Backlog)" />
                <DroppableDay date={today} tasks={todayTasks} title="Today" />
                <DroppableDay date={tomorrow} tasks={tomorrowTasks} title="Tomorrow" />
                <DroppableDay date={dayAfter} tasks={dayAfterTasks} title={new Date(dayAfter).toLocaleDateString(undefined, { weekday: 'long' })} />
            </div>
        </DndContext>
    );
}
