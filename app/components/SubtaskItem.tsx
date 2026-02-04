'use client';

import React from 'react';
import { Check, ChevronRight, Trash2 } from 'lucide-react';
import { Subtask } from '../lib/types';

export interface SubtaskItemProps {
    subtask: Subtask;
    toggleSubtask: (id: string, e: React.MouseEvent) => void;
    onNavigate: (id: string) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
}

export function SubtaskItem({ subtask, toggleSubtask, onNavigate, onDelete }: SubtaskItemProps) {
    return (
        <div className="bg-zinc-950/30 rounded-lg border border-zinc-800/50 hover:bg-zinc-800/50 transition-colors flex items-center gap-3 p-2 group">
            <button
                onClick={(e) => toggleSubtask(subtask.id, e)}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${subtask.completed ? 'bg-indigo-500 border-indigo-500' : 'border-zinc-600 hover:border-indigo-400'}`}
            >
                {subtask.completed && <Check size={10} className="text-white" />}
            </button>

            {/* Click to Navigate */}
            <div
                className="flex-1 cursor-pointer"
                onClick={() => onNavigate(subtask.id)}
            >
                <span className={`text-sm ${subtask.completed ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                    {subtask.title}
                </span>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onNavigate(subtask.id)}
                    className="p-1 text-zinc-500 hover:text-zinc-300"
                    title="Open Details"
                >
                    <ChevronRight size={14} />
                </button>
                <button
                    onClick={(e) => onDelete(subtask.id, e)}
                    className="p-1 text-zinc-600 hover:text-red-400"
                >
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    );
}
