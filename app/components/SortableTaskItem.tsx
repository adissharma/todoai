'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../lib/types';
import { TaskItem } from './TaskItem';
import { GripVertical } from 'lucide-react';

interface SortableTaskItemProps {
    task: Task;
    onTaskClick?: (task: Task) => void;
    isHighlighted?: boolean;
    onContextMenu?: (e: React.MouseEvent, task: Task) => void;
}

export function SortableTaskItem({ task, onTaskClick, isHighlighted, onContextMenu }: SortableTaskItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id, data: { task } });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-start gap-2 group relative"
            onContextMenu={(e) => onContextMenu?.(e, task)}
        >
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
