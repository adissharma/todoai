'use client';

import { useState } from 'react';
import { useSecondBrain } from '../lib/store';
import { ProcessingLog, Project } from '../lib/types';
import { Check, FolderPlus, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ReviewDashboard() {
    const { logs, projects, addTask, updateLog, addProject } = useSecondBrain();
    const reviewItems = logs.filter((l) => l.status === 'needs_review');

    const handleResolve = (item: ProcessingLog, projectId: string, projectName: string) => {
        // 1. Create the task linked to the project
        addTask({
            title: item.rewrittenText || item.originalText,
            status: 'todo',
            list: 'next',
            projectId: projectId,
            tags: item.tagsApplied || { time: '15 min', contexts: [] },
            originalThought: item.originalText
        });

        // 2. Update log to success
        updateLog(item.id, {
            status: 'success',
            projectMatch: { ...item.projectMatch, id: projectId, name: projectName, confidence: 100 }
        });
    };

    const handleCreateAndResolve = (item: ProcessingLog, name: string) => {
        // 1. Create project
        const newProjectId = addProject({
            name: name,
            outcome: 'Created from review',
            status: 'active'
        });

        // 2. Resolve
        handleResolve(item, newProjectId, name);
    }

    if (reviewItems.length === 0) return null;

    return (
        <div className="w-full max-w-2xl mt-16 space-y-6">
            <div className="flex items-center gap-3 text-zinc-400 uppercase tracking-widest text-xs font-medium pl-1">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Needs Attention ({reviewItems.length})
            </div>

            <div className="grid gap-4">
                <AnimatePresence>
                    {reviewItems.map((item) => (
                        <ReviewItem
                            key={item.id}
                            item={item}
                            projects={projects}
                            onResolve={handleResolve}
                            onCreate={handleCreateAndResolve}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}

function ReviewItem({
    item,
    projects,
    onResolve,
    onCreate
}: {
    item: ProcessingLog,
    projects: Project[],
    onResolve: (item: ProcessingLog, projectId: string, projectName: string) => void,
    onCreate: (item: ProcessingLog, name: string) => void
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    // AI suggestion
    const suggestedName = item.projectMatch?.name;
    const isNewSuggestion = item.projectMatch?.isNew;
    // Find if the suggestion matches an existing project by name (fuzzy match?)
    // For now, assume exact match or rely on 'isNew' flag.

    // Check if suggested name exists in projects currently
    const existingProjectMatch = projects.find(p => p.name.toLowerCase() === suggestedName?.toLowerCase());

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="group relative bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 transition-all backdrop-blur-sm shadow-sm"
        >
            <div className="flex flex-col gap-4">

                {/* Header: Content */}
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-amber-500/80 text-xs font-medium mb-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Unsure where to file this</span>
                        </div>
                        <h3 className="text-lg font-medium text-zinc-100 leading-snug">
                            {item.rewrittenText || item.originalText}
                        </h3>
                        {item.rewrittenText && item.originalText !== item.rewrittenText && (
                            <p className="text-zinc-500 text-sm line-clamp-1 italic">
                                "{item.originalText}"
                            </p>
                        )}
                    </div>
                </div>

                {/* AI Suggestion Area */}
                <div className="bg-black/20 rounded-lg p-3 border border-white/5 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="text-sm">
                            <span className="text-zinc-400 block text-xs">AI Suggested Project:</span>
                            <span className="text-indigo-300 font-medium">
                                {suggestedName || "Unknown Project"}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Option 1: Confirm Suggestion */}
                        {suggestedName && (
                            <button
                                onClick={() => {
                                    if (existingProjectMatch) {
                                        onResolve(item, existingProjectMatch.id, existingProjectMatch.name);
                                    } else if (isNewSuggestion) {
                                        onCreate(item, suggestedName);
                                    } else {
                                        // Fallback: It suggested a name but it's not new and not found? 
                                        // Treat as create if user confirms? Or maybe prompt?
                                        // Let's assume create if confirmed and doesn't exist.
                                        onCreate(item, suggestedName);
                                    }
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-md transition-colors"
                            >
                                <Check className="w-3 h-3" />
                                Confirm
                            </button>
                        )}

                        {/* Option 2: Move to Existing */}
                        <div className="relative">
                            <select
                                className="appearance-none bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium py-1.5 pl-3 pr-8 rounded-md border border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer transition-colors"
                                onChange={(e) => {
                                    if (e.target.value === "new") {
                                        // TODO: Trigger manual creation input?
                                        // For simplicity, just use the AI suggestion or default placeholder
                                        const name = prompt("Enter new project name:", item.rewrittenText);
                                        if (name) onCreate(item, name);
                                        e.target.value = ""; // Reset
                                    } else if (e.target.value) {
                                        const p = projects.find(proj => proj.id === e.target.value);
                                        if (p) onResolve(item, p.id, p.name);
                                    }
                                }}
                                defaultValue=""
                            >
                                <option value="" disabled>Move to...</option>
                                <option value="new" className="text-indigo-400 font-bold">+ New Project</option>
                                <hr />
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <ArrowRight className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                        </div>
                    </div>
                </div>

            </div>
        </motion.div>
    );
}
