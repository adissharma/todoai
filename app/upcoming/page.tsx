'use client';

import { useSecondBrain } from '../lib/store';
import { TaskItem } from '../components/TaskItem';
import { CalendarDays } from 'lucide-react';

const getStartOfDay = (date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate.getTime();
};

export default function UpcomingPage() {
    const { tasks } = useSecondBrain();

    const todayStart = getStartOfDay(new Date());
    const tomorrowStart = todayStart + 86400000;

    const futureTasks = tasks.filter(t =>
        t.status === 'todo' &&
        t.scheduledAt && t.scheduledAt >= tomorrowStart
    ).sort((a, b) => (a.scheduledAt || 0) - (b.scheduledAt || 0));

    // Group by date
    const grouped = futureTasks.reduce((acc, task) => {
        const date = new Date(task.scheduledAt!).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        if (!acc[date]) acc[date] = [];
        acc[date].push(task);
        return acc;
    }, {} as Record<string, typeof tasks>);

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12 max-w-4xl mx-auto">
            <header className="mb-8">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <CalendarDays size={20} />
                    <span className="font-semibold text-sm uppercase tracking-wide">Upcoming</span>
                </div>
                <h1 className="text-3xl font-bold text-white">
                    Scheduled Items
                </h1>
            </header>

            <div className="space-y-8">
                {Object.entries(grouped).length === 0 ? (
                    <p className="text-zinc-500">No upcoming tasks scheduled.</p>
                ) : (
                    Object.entries(grouped).map(([date, tasks]) => (
                        <section key={date}>
                            <h2 className="text-sm font-semibold text-zinc-400 sticky top-0 bg-zinc-950 py-2 border-b border-zinc-900 mb-4 z-10">
                                {date}
                            </h2>
                            <div className="grid grid-cols-1 gap-2">
                                {tasks.map(task => <TaskItem key={task.id} task={task} />)}
                            </div>
                        </section>
                    ))
                )}
            </div>
        </div>
    );
}
