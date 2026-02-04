'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { SubtaskItem, SubtaskItemProps } from './SubtaskItem';

interface SortableSubtaskItemProps extends SubtaskItemProps { }

export function SortableSubtaskItem(props: SortableSubtaskItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props.subtask.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 group relative">
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-zinc-700 hover:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 -ml-6 absolute left-0" // Pos absolute to not shift layout
            >
                <GripVertical size={14} />
            </div>

            <div className="flex-1">
                <SubtaskItem {...props} />
            </div>
        </div>
    );
}
