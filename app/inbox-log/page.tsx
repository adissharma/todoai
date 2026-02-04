'use client';

import { useSecondBrain } from '../lib/store';
import { History, ArrowRight } from 'lucide-react';

export default function InboxLogPage() {
    const { logs } = useSecondBrain();

    // Show all items, including processed
    const allItems = [...logs].sort((a, b) => b.timestamp - a.timestamp);

    return (
        <div className="p-12">
            <h1 className="text-3xl font-bold mb-8">System Logs (Receipts)</h1>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="text-xs uppercase bg-zinc-900 text-zinc-500">
                        <tr>
                            <th className="px-6 py-4 rounded-tl-xl">Timestamp</th>
                            <th className="px-6 py-4">Original Input</th>
                            <th className="px-6 py-4">Rewritten Task</th>
                            <th className="px-6 py-4">Applied Tags</th>
                            <th className="px-6 py-4">Project Match</th>
                            <th className="px-6 py-4 rounded-tr-xl">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {allItems.map(item => (
                            <tr key={item.id} className="hover:bg-zinc-900/30 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {new Date(item.timestamp).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 font-medium text-zinc-300">
                                    {item.originalText}
                                </td>
                                <td className="px-6 py-4 text-zinc-200">
                                    {item.rewrittenText || '-'}
                                </td>
                                <td className="px-6 py-4">
                                    {item.tagsApplied.energy !== 'Neutral' && (
                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                            <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700">{item.tagsApplied.energy}</span>
                                            <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700">{item.tagsApplied.time}</span>
                                            {item.tagsApplied.contexts.map(c => (
                                                <span key={c} className="text-[10px] px-1.5 py-0.5 bg-indigo-900/30 text-indigo-400 rounded border border-indigo-500/20">{c}</span>
                                            ))}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {item.projectMatch.name ? (
                                        <div className="flex flex-col">
                                            <span className="font-medium text-zinc-300">{item.projectMatch.name}</span>
                                            <span className="text-xs text-zinc-500">
                                                {item.projectMatch.isNew ? '(New Project)' : '(Existing)'} • {item.projectMatch.confidence}% Match
                                            </span>
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded-md text-xs border ${item.status === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                        item.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                            'bg-red-500/10 border-red-500/20 text-red-400'
                                        }`}>
                                        {item.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
