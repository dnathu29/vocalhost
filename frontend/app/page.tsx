'use client'

import { useState } from 'react'
import HostDashboard from '@/components/HostDashboard'
import GuestPhoneCall from '@/components/GuestPhoneCall'

export default function Home() {
  const [view, setView] = useState<'host' | 'guest'>('host')

  return (
    <main className="min-h-screen bg-cream">
      <nav className="bg-parchment border-b border-blush/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-terracotta flex items-center justify-center shadow-sm">
              <span className="font-display text-cream text-sm font-bold italic">V</span>
            </div>
            <div>
              <span className="font-display text-espresso text-xl">VocalHost</span>
              <span className="text-warm text-xs ml-2 hidden sm:inline">workshop intelligence</span>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-cream border border-blush rounded-full p-1 card-shadow">
            <button
              onClick={() => setView('host')}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                view === 'host'
                  ? 'bg-terracotta text-cream shadow-sm'
                  : 'text-warm hover:text-espresso'
              }`}
            >
              Host
            </button>
            <button
              onClick={() => setView('guest')}
              className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                view === 'guest'
                  ? 'bg-terracotta text-cream shadow-sm'
                  : 'text-warm hover:text-espresso'
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
