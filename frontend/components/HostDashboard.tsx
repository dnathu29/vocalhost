'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'

interface Session {
  session_id: string
  time: string
  current_pax: number
  min_pax: number
  status: 'warning' | 'confirmed' | 'full'
}

interface Workshop {
  workshop_id: string
  workshop_name: string
  sessions: Session[]
}

export default function HostDashboard() {
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(true)
  const [agentRunning, setAgentRunning] = useState(false)
  const [agentPlan, setAgentPlan] = useState<any>(null)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/sessions`)
      setWorkshops(res.data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching sessions:', error)
      setLoading(false)
    }
  }

  const handleRunAgent = async () => {
    setAgentRunning(true)
    try {
      const res = await axios.post(`${API_BASE}/api/run-agent`)
      setAgentPlan(res.data)
    } catch (error) {
      console.error('Error running agent:', error)
    } finally {
      setAgentRunning(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'warning':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'full':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'warning':
        return '⚠️ NEEDS BOOKING'
      case 'full':
        return '✅ FULL'
      default:
        return '📌 CONFIRMED'
    }
  }

  if (loading) {
    return <div className="text-center text-2xl">Loading sessions...</div>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-3xl font-bold mb-2">Workshop Sessions</h2>
        <p className="text-gray-600">Monitor bookings and run AI agent to optimize sessions</p>
      </div>

      {/* Run Agent Button */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <button
          onClick={handleRunAgent}
          disabled={agentRunning}
          className={`px-6 py-3 rounded-lg font-bold text-white text-lg transition ${
            agentRunning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-primary hover:bg-indigo-700'
          }`}
        >
          {agentRunning ? '⏳ Running Agent...' : '🤖 Run AI Agent'}
        </button>
      </div>

      {/* Agent Plan Display */}
      {agentPlan && (
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-primary">
          <h3 className="text-2xl font-bold mb-4">Agent Plan</h3>
          <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto max-h-48">
            {JSON.stringify(agentPlan, null, 2)}
          </pre>
        </div>
      )}

      {/* Workshops Grid */}
      <div className="grid gap-6">
        {workshops.map((workshop) => (
          <div key={workshop.workshop_id} className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-2xl font-bold mb-4">{workshop.workshop_name}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workshop.sessions.map((session) => (
                <div
                  key={session.session_id}
                  className={`p-4 rounded-lg border-2 ${getStatusColor(session.status)}`}
                >
                  <div className="text-sm font-semibold mb-1">
                    {getStatusBadge(session.status)}
                  </div>
                  <div className="text-3xl font-bold mb-2">⏰ {session.time}</div>
                  <div className="text-lg mb-2">
                    👥 {session.current_pax}/{session.min_pax} pax
                  </div>
                  <div className="text-xs opacity-75">
                    Session ID: {session.session_id}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
