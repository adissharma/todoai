'use client';

import { useSecondBrain } from './lib/store';
import { Dropbox } from './components/Dropbox';
import { AIChat } from './components/AIChat';
import { ReviewDashboard } from './components/ReviewDashboard';
import { ActivityFeed } from './components/ActivityFeed';
import { Brain, LayoutGrid, Calendar as CalendarIcon, History } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { tasks, logs, addLog } = useSecondBrain();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Quick Capture via URL (?capture=...)
  useEffect(() => {
    const captureText = searchParams.get('capture');
    if (captureText) {
      addLog(captureText);
      // Clean URL without refresh
      router.replace('/');
    }
  }, [searchParams, addLog, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden text-white">

      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(99,102,241,0.1),transparent_70%)] pointer-events-none" />

      <div className="w-full max-w-2xl z-10 space-y-16">

        {/* Hero / Capture */}
        <div className="space-y-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500 tracking-tighter">
            Clear your mind.
          </h1>
          <Dropbox />
        </div>

        {/* Action Dashboard for Unresolved Items */}
        <ReviewDashboard />

        {/* Activity Feed */}
        <ActivityFeed />

      </div>
    </main>
  );
}
