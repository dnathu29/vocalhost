'use client'

import { useState } from 'react'
import HostDashboard from '@/components/HostDashboard'
import GuestPhoneCall from '@/components/GuestPhoneCall'

export default function Home() {
  const [view, setView] = useState<'host' | 'guest'>('host')

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-md p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">🎤 VocalHost</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setView('host')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                view === 'host'
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Host Dashboard
            </button>
            <button
              onClick={() => setView('guest')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                view === 'guest'
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Guest Call
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8">
        {view === 'host' ? <HostDashboard /> : <GuestPhoneCall />}
      </div>
    </main>
  )
}
