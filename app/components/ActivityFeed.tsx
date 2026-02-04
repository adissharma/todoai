'use client';
import { useState } from 'react';

import { useSecondBrain } from '../lib/store';
import { ActivityLog } from '../lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Clock, Folder, Pencil, X, Check } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function ActivityFeed() {
    const { activities, logs } = useSecondBrain();

    // 1. Get confirmed AI activities
    const confirmedActivities = activities
        .filter(a => a.type === 'ai_processed')
        .map(a => ({ ...a, status: 'completed' as const }));

    // 2. Get pending items from logs that are currently being processed
    // We treat "pending" logs as "in-progress activities"
    const pendingActivities = logs
        .filter(l => l.status === 'pending')
        .map(l => ({
            id: l.id,
            timestamp: l.timestamp,
            description: 'Processing thought...',
            detail: 'AI is analyzing and organizing...',
            metadata: { originalText: l.originalText },
            type: 'ai_processed' as const,
            status: 'pending' as const
        }));

    // 3. Merge and Sort (Newest First)
    const allItems = [...pendingActivities, ...confirmedActivities]
        .sort((a, b) => b.timestamp - a.timestamp);

    if (allItems.length === 0) return null;

    return (
        <div className="w-full max-w-2xl mt-8 space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    AI Activity Feed
                </h3>
            </div>

            {/* The Feed */}
            <div className="space-y-3">
                <AnimatePresence initial={false}>
                    {allItems.map((item) => (
                        <ActivityCard key={item.id} activity={item as any} status={item.status} />
                    ))}
                </AnimatePresence>
            </div>

        </div>
    );
}

function ActivityCard({ activity, status = 'completed' }: { activity: ActivityLog, status?: 'pending' | 'completed' }) {
    const { projects, updateTask, updateActivity, tasks } = useSecondBrain();
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);

    // Parse description to handle clickable project logic if standard format
    // Description format typically: 'Filed "Task Name" to ProjectName'
    // But better to use metadata if available
    const projectName = activity.metadata?.projectName;
    const projectId = activity.metadata?.projectId;
    let taskId = activity.metadata?.taskId;
    const originalText = activity.metadata?.originalText;
    const refinedText = activity.metadata?.refinedText;

    // Fallback search for taskId if missing (backward compatibility)
    if (!taskId && projectId && refinedText) {
        // Try to find a task that matches the title and project
        // We use a loose match or just exact match on title
        const foundTask = tasks.find(t => t.projectId === projectId && t.title === refinedText);
        if (foundTask) {
            taskId = foundTask.id;
        }
    }

    const [editTitle, setEditTitle] = useState(refinedText || activity.description);
    const [editProjectId, setEditProjectId] = useState(projectId || '');

    const isPending = status === 'pending';

    const handleSave = () => {
        // If we still don't have a taskId, we can't edit the underlying task easily without finding it first.
        // We rely on the fallback logic above.
        if (!taskId) {
            console.warn("Cannot save edit: Underlying task not found.");
            // We can still update the activity log though
            const newProjectName = projects.find(p => p.id === editProjectId)?.name || 'Unknown Project';
            updateActivity(activity.id, {
                metadata: {
                    ...activity.metadata,
                    refinedText: editTitle,
                    projectId: editProjectId,
                    projectName: newProjectName
                },
                description: `Filed "${editTitle}" to ${newProjectName}`
            });
            setIsEditing(false);
            return;
        }

        // 1. Update the actual Task
        updateTask(taskId, {
            title: editTitle,
            projectId: editProjectId
        });

        // 2. Update the Activity Log UI
        const newProjectName = projects.find(p => p.id === editProjectId)?.name || 'Unknown Project';
        updateActivity(activity.id, {
            metadata: {
                ...activity.metadata,
                refinedText: editTitle,
                projectId: editProjectId,
                projectName: newProjectName,
                taskId: taskId // Ensure we verify/persist the found taskId
            },
            description: `Filed "${editTitle}" to ${newProjectName}`
        });

        setIsEditing(false);
    };

    const handleCardClick = () => {
        if (isPending || isEditing) return;
        if (projectId && taskId) {
            router.push(`/projects/${projectId}?highlight=${taskId}`);
        } else if (projectId) {
            router.push(`/projects/${projectId}`);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={handleCardClick}
            className={`group flex items-start gap-3 p-3 rounded-xl border transition-all duration-500 relative ${isPending
                ? 'bg-zinc-900/30 border-zinc-900 border-dashed'
                : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 cursor-pointer'
                }`}
        >
            {/* Leading Icon (Matches TaskItem Checkbox Area) */}
            <div className={`
                flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                ${isPending
                    ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                    : 'border-zinc-700 bg-zinc-800/50 text-indigo-400'
                }
            `}>
                {isPending ? (
                    <Sparkles className="w-3 h-3 animate-pulse" />
                ) : (
                    <Sparkles className="w-3 h-3" />
                )}
            </div>

            {/* Card Content */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                    {/* Main Title / Content */}
                    <div className="flex-1">
                        <AnimatePresence mode="wait">
                            {isPending ? (
                                <motion.div
                                    key="pending-text"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="text-zinc-400 text-sm italic"
                                >
                                    "{originalText}"
                                    <span className="inline-block w-1 h-3 ml-1 align-middle bg-indigo-500/50 animate-pulse" />
                                </motion.div>
                            ) : isEditing ? (
                                <div onClick={(e) => e.stopPropagation()} className="space-y-3 mb-2">
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                                        autoFocus
                                    />
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={editProjectId}
                                            onChange={(e) => setEditProjectId(e.target.value)}
                                            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50"
                                        >
                                            <option value="" disabled>Select Project</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                        <div className="flex items-center gap-1 ml-auto">
                                            <button onClick={() => setIsEditing(false)} className="p-1 text-zinc-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                                            <button onClick={handleSave} className="p-1 text-indigo-400 hover:text-indigo-300"><Check className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-zinc-200 text-sm font-medium leading-snug">
                                    {refinedText || activity.description}
                                </p>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Edit Button (Top Right) */}
                    {!isPending && !isEditing && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditTitle(refinedText || activity.description);
                                setEditProjectId(projectId || '');
                                setIsEditing(true);
                            }}
                            className="text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Pencil className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {/* Metadata Row (Tags style) */}
                <div className="flex flex-wrap gap-2 mt-2 items-center">
                    {/* Status/Type Tag */}
                    {isPending && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded border border-zinc-700/50 animate-pulse">
                            Processing...
                        </span>
                    )}

                    {/* Project File */}
                    {!isEditing && projectName && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-300 rounded border border-indigo-500/20 flex items-center gap-1">
                            <Folder size={10} />
                            {projectName}
                        </span>
                    )}

                    {/* Timestamp */}
                    {!isPending && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded border border-zinc-700/50 flex items-center gap-1">
                            <Clock size={10} />
                            <TimeAgo timestamp={activity.timestamp} />
                        </span>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function TimeAgo({ timestamp }: { timestamp: number }) {
    // Simple rough time ago
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    let text = '';
    if (seconds < 60) text = 'Just now';
    else if (seconds < 3600) text = `${Math.floor(seconds / 60)}m ago`;
    else if (seconds < 86400) text = `${Math.floor(seconds / 3600)}h ago`;
    else text = `${Math.floor(seconds / 86400)}d ago`;

    return <span>{text}</span>;
}
