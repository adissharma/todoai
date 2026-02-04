'use client';

import { useSecondBrain } from '../lib/store';
import { Folder } from 'lucide-react';
import Link from 'next/link';

export default function ProjectsPage() {
    const { projects } = useSecondBrain();

    return (
        <div className="p-12">
            <h1 className="text-3xl font-bold mb-8">Active Projects</h1>

            {projects.length === 0 ? (
                <div className="text-zinc-500">No active projects. Capture a thought to create one!</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {projects.map(project => (
                        <Link href={`/projects/${project.id}`} key={project.id} className="block group">
                            <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl relative overflow-hidden hover:border-indigo-500/50 transition-colors h-full">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Folder size={64} className="text-indigo-500" />
                                </div>

                                <div className="relative z-10">
                                    <h3 className="font-semibold text-xl mb-2">{project.name}</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Desired Outcome</p>
                                            <p className="text-zinc-400 text-sm leading-relaxed">{project.outcome}</p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wide ${project.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-zinc-800 text-zinc-400'
                                                }`}>
                                                {project.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
