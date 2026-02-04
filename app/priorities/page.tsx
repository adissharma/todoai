'use client';

import { useSecondBrain } from '../lib/store';
import { TaskItem } from '../components/TaskItem';
import { Flag } from 'lucide-react';

export default function PrioritiesPage() {
    const { tasks, projects } = useSecondBrain();

    // Group tasks by priority
    // Priority 1: High
    // Priority 2: Medium
    // Priority 3: Low
    // Priority 4 (or undefined): None

    const activeTasks = tasks.filter(t => t.status === 'todo');

    const priority1 = activeTasks.filter(t => t.priority === 1);
    const priority2 = activeTasks.filter(t => t.priority === 2);
    const priority3 = activeTasks.filter(t => t.priority === 3);
    const priority4 = activeTasks.filter(t => t.priority === 4 || !t.priority);

    // Helper to get project name for a task
    const getProjectName = (projectId?: string) => {
        if (!projectId) return 'Inbox';
        return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-8 md:p-12 max-w-5xl mx-auto">
            <header className="mb-12">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
                        <Flag className="text-red-500" size={20} />
                    </div>
                    <h1 className="text-3xl font-bold">Priorities</h1>
                </div>
                <p className="text-zinc-400">
                    Focus on what matters most. {priority1.length} high priority tasks.
                </p>
            </header>

            <div className="space-y-12">
                {/* Priority 1 */}
                <section>
                    <header className="flex items-center gap-2 mb-4 text-red-400 font-bold uppercase tracking-wider text-sm border-b border-red-500/10 pb-2">
                        <Flag size={14} className="fill-current" />
                        Priority 1 - High Impact
                        <span className="ml-auto bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs">{priority1.length}</span>
                    </header>
                    <div className="space-y-2">
                        {priority1.length === 0 ? (
                            <p className="text-zinc-600 text-sm italic py-4">No high priority tasks. Great job!</p>
                        ) : (
                            priority1.map(task => (
                                <div key={task.id} className="relative group">
                                    <div className="absolute -left-20 top-3 text-[10px] text-zinc-600 w-16 text-right truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                        {getProjectName(task.projectId)}
                                    </div>
                                    <TaskItem task={task} />
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Priority 2 */}
                <section>
                    <header className="flex items-center gap-2 mb-4 text-orange-400 font-bold uppercase tracking-wider text-sm border-b border-orange-500/10 pb-2">
                        <Flag size={14} className="fill-current" />
                        Priority 2 - Important
                        <span className="ml-auto bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded text-xs">{priority2.length}</span>
                    </header>
                    <div className="space-y-2">
                        {priority2.length === 0 ? (
                            <p className="text-zinc-600 text-sm italic py-4">Nothing here.</p>
                        ) : (
                            priority2.map(task => (
                                <div key={task.id} className="relative group">
                                    <div className="absolute -left-20 top-3 text-[10px] text-zinc-600 w-16 text-right truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                        {getProjectName(task.projectId)}
                                    </div>
                                    <TaskItem task={task} />
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Priority 3 */}
                <section>
                    <header className="flex items-center gap-2 mb-4 text-blue-400 font-bold uppercase tracking-wider text-sm border-b border-blue-500/10 pb-2">
                        <Flag size={14} className="fill-current" />
                        Priority 3 - Normal
                        <span className="ml-auto bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-xs">{priority3.length}</span>
                    </header>
                    <div className="space-y-2">
                        {priority3.length === 0 ? (
                            <p className="text-zinc-600 text-sm italic py-4">Nothing here.</p>
                        ) : (
                            priority3.map(task => (
                                <div key={task.id} className="relative group">
                                    <div className="absolute -left-20 top-3 text-[10px] text-zinc-600 w-16 text-right truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                        {getProjectName(task.projectId)}
                                    </div>
                                    <TaskItem task={task} />
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Priority 4 / None (Collapsible or just lower emphasis) */}
                <section className="opacity-60 hover:opacity-100 transition-opacity">
                    <header className="flex items-center gap-2 mb-4 text-zinc-500 font-bold uppercase tracking-wider text-sm border-b border-zinc-800 pb-2">
                        <Flag size={14} />
                        No Priority
                        <span className="ml-auto bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded text-xs">{priority4.length}</span>
                    </header>
                    <div className="space-y-2">
                        {priority4.map(task => (
                            <div key={task.id} className="relative group">
                                <div className="absolute -left-20 top-3 text-[10px] text-zinc-600 w-16 text-right truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                    {getProjectName(task.projectId)}
                                </div>
                                <TaskItem task={task} />
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
