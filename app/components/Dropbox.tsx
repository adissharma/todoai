'use client';

import { useState } from 'react';
import { useSecondBrain } from '../lib/store';
import { ArrowUp, Play } from 'lucide-react';
import { cn } from '../lib/utils'; // Assuming you have a utils file

export function Dropbox() {
    const { addLog } = useSecondBrain();
    const [input, setInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        addLog(input.trim());
        setInput('');
    };

    return (
        <div className="w-full max-w-2xl mx-auto mb-12">
            <form
                onSubmit={handleSubmit}
                className={cn(
                    "relative group transition-all duration-300 ease-out",
                    isFocused ? "scale-[1.02]" : "scale-100"
                )}
            >
                <div className={cn(
                    "absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur",
                    isFocused && "opacity-60 group-hover:opacity-60"
                )} />

                <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-2xl p-2 shadow-xl">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="Capture a thought..."
                        className="flex-1 bg-transparent border-none text-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-0"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowUp size={20} />
                    </button>
                </div>
            </form>
            <div className="mt-4 text-center">
                <p className="text-zinc-500 text-sm">Press <kbd className="font-sans px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-xs">Enter</kbd> to capture</p>
            </div>
        </div>
    );
}
