'use client';

import { useSecondBrain } from '../lib/store';
import { ArrowRight, Check, X, AlertCircle, Sparkles, Inbox } from 'lucide-react';
import { useState } from 'react';
import { TaskItem } from '../components/TaskItem';

export default function InboxPage() {
    const { logs, updateLog, addTask, addProject } = useSecondBrain();

    // Action Required Items
    const needsReviewItems = logs.filter(l => l.status === 'needs_review');

    // Recently Processed (Last 24 hours, success)
    const processedItems = logs.filter(l =>
        l.status === 'success' &&
        (Date.now() - l.timestamp) < 24 * 60 * 60 * 1000
    );

    const handleAccept = (item: any) => {
        const { rewrittenText, tagsApplied, projectMatch } = item;
        let finalProjectId = projectMatch.id;

        if (projectMatch.isNew) {
            finalProjectId = addProject({
                name: projectMatch.name,
                outcome: projectMatch.outcome || 'No outcome defined',
                status: 'active'
            });
        }

        addTask({
            title: rewrittenText,
            status: 'todo',
            list: 'next',
            projectId: finalProjectId || '',
            tags: tagsApplied,
            originalThought: item.originalText
        });

        updateLog(item.id, { status: 'success' });
    };

    const handleDiscard = (id: string) => {
        updateLog(id, { status: 'discarded' as any });
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12 max-w-4xl mx-auto">
            <header className="mb-8 flex items-end gap-3">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Inbox size={32} /> Inbox
                </h1>
                <span className="text-zinc-500 pb-1">Review & Process</span>
            </header>

            <div className="space-y-12">

                {/* 1. Action Required Section */}
                <section>
                    <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        Action Required ({needsReviewItems.length})
                    </h2>

                    {needsReviewItems.length === 0 ? (
                        <div className="p-8 border border-dashed border-zinc-900 rounded-2xl bg-zinc-900/20 flex flex-col items-center text-center">
                            <Check size={24} className="text-zinc-700 mb-2" />
                            <p className="text-zinc-500 text-sm">No items need human review.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {needsReviewItems.map(item => (
                                <div key={item.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row gap-6 group hover:border-zinc-700 transition-all">
                                    <div className="flex-1 space-y-3">
                                        <div>
                                            <div className="text-xs font-medium text-zinc-500 mb-1">Original Input</div>
                                            <p className="text-lg text-zinc-200">"{item.originalText}"</p>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm bg-zinc-950/50 p-3 rounded-lg border border-zinc-900/50">
                                            <AlertCircle size={14} className="text-orange-400" />
                                            <span className="text-zinc-400">AI Uncertainty: <span className="text-zinc-300">{item.projectMatch.confidence}% Confidence</span></span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-xs text-zinc-600 mb-0.5">Example Rewrite</div>
                                                <div className="text-sm text-zinc-300">{item.rewrittenText}</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-zinc-600 mb-0.5">Suggested Project</div>
                                                <div className="text-sm text-zinc-300">{item.projectMatch.name}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-row md:flex-col gap-2 justify-center min-w-[140px]">
                                        <button
                                            onClick={() => handleAccept(item)}
                                            className="flex-1 py-2 px-4 bg-green-600/10 hover:bg-green-600/20 text-green-400 border border-green-600/20 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                                        >
                                            <Check size={14} /> Accept
                                        </button>
                                        <button
                                            onClick={() => handleDiscard(item.id)}
                                            className="flex-1 py-2 px-4 bg-zinc-800/50 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-zinc-800 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                                        >
                                            <X size={14} /> Discard
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* 2. AI Processed Summary */}
                <section>
                    <h2 className="text-sm font-semibold text-zinc-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Sparkles size={14} />
                        Automatically Processed ({processedItems.length})
                    </h2>

                    {processedItems.length === 0 ? (
                        <p className="text-zinc-600 italic text-sm">No recent AI activity.</p>
                    ) : (
                        <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl overflow-hidden divide-y divide-zinc-900">
                            {processedItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-4 hover:bg-zinc-900/50 transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                                            <Check size={12} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm text-zinc-300 truncate">{item.rewrittenText}</p>
                                            <p className="text-xs text-zinc-600 truncate">
                                                From: "{item.originalText}" • <span className="text-zinc-500">{item.projectMatch.name}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-zinc-700 whitespace-nowrap ml-4">
                                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

            </div>
        </div>
    );
}
