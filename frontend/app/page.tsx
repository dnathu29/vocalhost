'use client'

import { useState } from 'react'
import HostDashboard from '@/components/HostDashboard'
import GuestPhoneCall from '@/components/GuestPhoneCall'

export default function Home() {
  const [view, setView] = useState<'host' | 'guest'>('host')

  return (
    <main className="min-h-screen bg-ink">
      <nav className="border-b border-white/10 bg-canvas/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-clay to-ember flex items-center justify-center text-ink text-sm font-bold">V</div>
            <span className="font-display text-xl text-parchment tracking-wide">VocalHost</span>
            <span className="text-muted text-xs ml-1 hidden sm:block">/ workshop intelligence</span>
          </div>

          <div className="flex items-center gap-1 bg-surface rounded-full p-1">
            <button
              onClick={() => setView('host')}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                view === 'host'
                  ? 'bg-clay text-ink shadow-sm'
                  : 'text-muted hover:text-parchment'
              }`}
            >
              Host
            </button>
            <button
              onClick={() => setView('guest')}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                view === 'guest'
                  ? 'bg-clay text-ink shadow-sm'
                  : 'text-muted hover:text-parchment'
              }`}
            >
              Guest Call
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {view === 'host' ? <HostDashboard /> : <GuestPhoneCall />}
      </div>
    </main>
  )
}
