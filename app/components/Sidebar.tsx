'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Brain,
    Inbox,
    Calendar,
    CalendarDays,
    Hash,
    Plus,
    ChevronDown,
    ChevronRight,
    Search,
    Clock,
    Flag,
    Tag
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useSecondBrain } from '../lib/store';
import { ProjectModal } from './ProjectModal';
import { GlobalSearch } from './GlobalSearch';
import { useState, useMemo } from 'react';

// ... interface if any

export function Sidebar() {
    const pathname = usePathname();
    const { projects, logs, tasks, addProject } = useSecondBrain();
    const [isProjectsOpen, setIsProjectsOpen] = useState(true);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

    const inboxCount = logs.filter(l => l.status === 'needs_review').length;

    // Compute unique tags and their counts
    const tags = useMemo(() => {
        const counts: Record<string, number> = {};
        tasks.forEach(task => {
            task.tags.contexts.forEach(tag => {
                counts[tag] = (counts[tag] || 0) + 1;
            });
        });
        return counts;
    }, [tasks]);

    // Added Home to nav
    const mainNav = [
        { href: '/', label: 'Home', icon: Brain, color: 'text-zinc-100' },
        { href: '/inbox', label: 'Inbox', icon: Inbox, count: inboxCount, color: 'text-blue-400' },
        { href: '/today', label: 'Today', icon: Calendar, color: 'text-green-400' },
        { href: '/upcoming', label: 'Upcoming', icon: CalendarDays, color: 'text-purple-400' },
        { href: '/calendar', label: 'Time Blocking', icon: Clock, color: 'text-orange-400' },
        { href: '/priorities', label: 'Priorities', icon: Flag, color: 'text-red-400' },
    ];

    const handleCreateProject = (data: { name: string; outcome: string }) => {
        addProject({
            ...data,
            status: 'active'
        });
        setIsNewProjectModalOpen(false);
    };

    return (
        <>
            <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
            <ProjectModal
                isOpen={isNewProjectModalOpen}
                onClose={() => setIsNewProjectModalOpen(false)}
                onSave={handleCreateProject}
            />

            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col z-50 hidden md:flex">
                {/* User Profile / Header */}
                <div className="p-4 flex items-center gap-3 mb-2">
                    <Link href="/" className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xs hover:bg-indigo-500 transition-colors">
                        SB
                    </Link>
                    <span className="font-semibold text-zinc-200">Adiss's Brain</span>
                </div>

                {/* Quick Add / Search */}
                <div className="px-4 mb-4 flex gap-2">
                    <div
                        onClick={() => setIsSearchOpen(true)}
                        className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-lg text-zinc-500 text-sm border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                        <Search size={14} />
                        <span>Search...</span>
                    </div>
                    <div
                        onClick={() => setIsNewProjectModalOpen(true)}
                        className="flex items-center justify-center w-9 h-9 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer transition-colors"
                        title="New Project"
                    >
                        <Plus size={18} />
                    </div>
                </div>

                {/* Main Navigation */}
                <nav className="px-2 space-y-1 mb-6">
                    {mainNav.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                                    isActive
                                        ? "bg-zinc-900 text-white"
                                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon size={18} className={item.color} />
                                    <span>{item.label}</span>
                                </div>
                                {item.count ? (
                                    <span className="text-xs font-medium text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded-md">
                                        {item.count}
                                    </span>
                                ) : null}
                            </Link>
                        );
                    })}
                </nav>

                {/* Projects Section */}
                <div className="px-4 flex-1 overflow-y-auto">
                    <div
                        className="flex items-center justify-between text-zinc-500 hover:text-zinc-300 cursor-pointer mb-2 group"
                        onClick={() => setIsProjectsOpen(!isProjectsOpen)}
                    >
                        <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider">
                            {isProjectsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            Projects
                        </div>
                        <div
                            role="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsNewProjectModalOpen(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-800 rounded p-0.5"
                        >
                            <Plus size={14} />
                        </div>
                    </div>

                    {isProjectsOpen && (
                        <div className="space-y-0.5 mb-6">
                            {projects.map(project => {
                                const isActive = pathname === `/projects/${project.id}`;
                                return (
                                    <Link
                                        key={project.id}
                                        href={`/projects/${project.id}`}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors",
                                            isActive
                                                ? "bg-zinc-900 text-white"
                                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
                                        )}
                                    >
                                        <Hash size={14} className="text-zinc-600" />
                                        <span className="truncate">{project.name}</span>
                                    </Link>
                                );
                            })}
                            {projects.length === 0 && (
                                <div className="text-xs text-zinc-600 px-3 py-2 italic">
                                    No projects yet.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tags Section */}
                    {Object.keys(tags).length > 0 && (
                        <>
                            <div className="flex items-center items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2 px-1">
                                <Tag size={14} />
                                Tags
                            </div>
                            <div className="space-y-0.5">
                                {Object.keys(tags).sort().map(tag => {
                                    /* Handle tag encoding for URL */
                                    const encodedTag = encodeURIComponent(tag);
                                    const isActive = pathname === `/tags/${encodedTag}`;
                                    return (
                                        <Link
                                            key={tag}
                                            href={`/tags/${encodedTag}`}
                                            className={cn(
                                                "flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors group",
                                                isActive
                                                    ? "bg-zinc-900 text-white"
                                                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <span className="truncate">{tag}</span>
                                            </div>
                                            <span className="text-[10px] text-zinc-600 group-hover:text-zinc-500">
                                                {tags[tag]}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* System Status */}
                <div className="p-4 border-t border-zinc-900">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        AI Agent Online
                    </div>
                </div>
            </aside>
        </>
    );
}
