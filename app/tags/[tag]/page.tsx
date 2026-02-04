'use client';

import { use } from 'react';
import { useSecondBrain } from '../../lib/store';
import { TaskItem } from '../../components/TaskItem';
import { TaskDetailModal } from '../../components/TaskDetailModal';
import { ArrowLeft, Tag, Folder } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function TagPage({ params }: { params: Promise<{ tag: string }> }) {
    const { tag } = use(params);
    const decodedTag = decodeURIComponent(tag);

    const { tasks, projects } = useSecondBrain();
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

    const filteredTasks = tasks.filter(t => t.tags.contexts.includes(decodedTag));
    const activeTasks = filteredTasks.filter(t => t.status === 'todo');
    const completedTasks = filteredTasks.filter(t => t.status === 'done');

    const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) || null : null;

    // improved grouping logic
    const groupedActiveTasks = activeTasks.reduce((groups, task) => {
        const projectId = task.projectId || 'uncategorized';
        if (!groups[projectId]) {
            groups[projectId] = [];
        }
        groups[projectId].push(task);
        return groups;
    }, {} as Record<string, typeof activeTasks>);

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12 max-w-5xl mx-auto">
            <TaskDetailModal task={selectedTask} onClose={() => setSelectedTaskId(null)} />

            <header className="mb-12">
                <div className="flex items-center justify-between mb-6">
                    <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm">
                        <ArrowLeft size={16} /> Back to Home
                    </Link>
                </div>

                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-indigo-500/10 rounded-xl">
                        <Tag size={32} className="text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">{decodedTag}</h1>
                        <p className="text-zinc-500 mt-1">{filteredTasks.length} tasks found</p>
                    </div>
                </div>
            </header>

            <section className="space-y-8">
                <div>
                    <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        Active Tasks ({activeTasks.length})
                    </h2>

                    {activeTasks.length === 0 ? (
                        <div className="p-8 border border-dashed border-zinc-800 rounded-xl text-center text-zinc-600">
                            No active tasks with this tag.
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {Object.entries(groupedActiveTasks).map(([projectId, projectTasks]) => {
                                const project = projects.find(p => p.id === projectId);
                                const projectName = project ? project.name : 'Inbox / No Project';

                                return (
                                    <div key={projectId} className="space-y-3">
                                        <h3 className="text-xs font-semibold text-zinc-400 flex items-center gap-2">
                                            <Folder size={14} />
                                            {project ? (
                                                <Link href={`/projects/${projectId}`} className="hover:text-white transition-colors underline decoration-zinc-700 underline-offset-2">
                                                    {projectName}
                                                </Link>
                                            ) : (
                                                <span>{projectName}</span>
                                            )}
                                            <span className="text-zinc-600 font-normal">({projectTasks.length})</span>
                                        </h3>
                                        <div className="space-y-2">
                                            {projectTasks.map(task => (
                                                <div key={task.id} onClick={() => setSelectedTaskId(task.id)}>
                                                    <TaskItem task={task} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {completedTasks.length > 0 && (
                    <div className="pt-8 border-t border-zinc-900">
                        <h2 className="text-sm font-semibold text-zinc-600 uppercase tracking-widest mb-4">
                            Completed ({completedTasks.length})
                        </h2>
                        <div className="space-y-2 opacity-50 hover:opacity-100 transition-opacity">
                            {completedTasks.map(task => (
                                <div key={task.id} onClick={() => setSelectedTaskId(task.id)}>
                                    <TaskItem task={task} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
