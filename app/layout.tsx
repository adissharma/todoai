import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SecondBrainProvider } from './lib/store';
import { ProcessorRunner } from './components/ProcessorRunner';
import { Sidebar } from './components/Sidebar';
import { AIChat } from './components/AIChat';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Second Brain OS',
  description: 'Your external cognitive architecture.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SecondBrainProvider>
          <ProcessorRunner />
          <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-white/20 flex">
            {/* Left Navigation */}
            <Sidebar />

            {/* Main Content */}
            <div className="flex-1 md:ml-64 lg:mr-80 min-h-screen transition-all duration-300">
              {children}
            </div>

            {/* Right Chat Sidebar */}
            <aside className="fixed right-0 top-0 bottom-0 w-80 bg-zinc-950 border-l border-zinc-900 z-50 hidden lg:flex flex-col">
              <div className="flex-1 overflow-hidden h-full">
                <AIChat variant="sidebar" />
              </div>
            </aside>
          </div>
        </SecondBrainProvider>
      </body>
    </html>
  );
}
