'use client';

import React, { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../lib/types';
import { TaskItem } from './TaskItem';
import { useSecondBrain } from '../lib/store';
import { GripVertical } from 'lucide-react';

interface SortableTaskItemProps {
    task: Task;
    onTaskClick?: (task: Task) => void;
    isHighlighted?: boolean;
}

function SortableTaskItem({ task, onTaskClick, isHighlighted }: SortableTaskItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-start gap-2 group relative">
            <div
                {...attributes}
                {...listeners}
                className="mt-4 cursor-grab active:cursor-grabbing text-zinc-700 hover:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <GripVertical size={16} />
            </div>
            <div className="flex-1" onClick={() => onTaskClick?.(task)}>
                <TaskItem task={task} isHighlighted={isHighlighted} />
            </div>
        </div>
    );
}

interface SortableListProps {
    items: Task[];
    onReorder: (items: Task[]) => void;
    onTaskClick?: (task: Task) => void;
    highlightedTaskId?: string | null;
}

export function SortableList({ items, onReorder, onTaskClick, highlightedTaskId }: SortableListProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = items.findIndex((item) => item.id === active.id);
            const newIndex = items.findIndex((item) => item.id === over.id);
            onReorder(arrayMove(items, oldIndex, newIndex));
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={items.map(i => i.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-2">
                    {items.map((task) => (
                        <SortableTaskItem
                            key={task.id}
                            task={task}
                            onTaskClick={onTaskClick}
                            isHighlighted={highlightedTaskId === task.id}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
