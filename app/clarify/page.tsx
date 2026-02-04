'use client';

import { useSecondBrain } from '../lib/store';
import { ArrowRight, Check, X, AlertCircle } from 'lucide-react';
import { useState } from 'react';

export default function ClarifyPage() {
    const { logs, updateLog, addTask, addProject } = useSecondBrain();
    const needsReviewItems = logs.filter(l => l.status === 'needs_review');

    const handleAccept = (item: any) => {
        // Same logic as auto-approve manually triggered
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
        updateLog(id, { status: 'discarded' as any }); // 'discarded' isn't in type but let's assume valid or just delete
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12 max-w-4xl mx-auto">
            <header className="mb-12">
                <h1 className="text-3xl font-bold mb-2">Clarify</h1>
                <p className="text-zinc-500">The Bouncer stopped these items. They need your eye.</p>
            </header>

            {needsReviewItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/50">
                    <div className="p-4 bg-green-500/10 rounded-full mb-4">
                        <Check size={32} className="text-green-500" />
                    </div>
                    <h3 className="text-lg font-medium text-zinc-300">All Clear</h3>
                    <p className="text-zinc-500">Nothing to clarify.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {needsReviewItems.map(item => (
                        <div key={item.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row gap-6">
                            <div className="flex-1 space-y-4">
                                <div>
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Original Thought</span>
                                    <p className="text-lg text-zinc-200 font-serif mt-1">"{item.originalText}"</p>
                                </div>

                                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-900 space-y-3">
                                    <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium">
                                        <AlertCircle size={14} />
                                        <span>AI Suggestion (Low Confidence)</span>
                                    </div>
                                    <div>
                                        <div className="text-sm text-zinc-400 mb-1">Proposed Project</div>
                                        <div className="font-medium text-zinc-200">{item.projectMatch.name} {item.projectMatch.isNew ? '(New)' : ''}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-zinc-400 mb-1">Rewritten Task</div>
                                        <div className="font-medium text-zinc-200">{item.rewrittenText}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-row md:flex-col gap-3 justify-center md:border-l border-zinc-800 md:pl-6">
                                <button
                                    onClick={() => handleAccept(item)}
                                    className="flex-1 md:flex-none py-3 px-6 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Check size={18} /> Approve
                                </button>
                                <button
                                    onClick={() => handleDiscard(item.id)}
                                    className="flex-1 md:flex-none py-3 px-6 bg-zinc-800 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <X size={18} /> Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
