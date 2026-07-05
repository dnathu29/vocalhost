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

interface UnderbookedSession {
  workshop_id: string
  workshop_name: string
  session_id: string
  time: string
  current_pax: number
  min_pax: number
  pax_gap: number
}

interface ConsolidationPlanItem {
  workshop_id: string
  workshop_name: string
  from_session_id: string
  from_time: string
  impacted_bookings_count: number
  to_session_id: string | null
  to_time: string | null
  action: 'propose_reschedule' | 'manual_review_required'
}

interface CustomerToContact {
  booking_id: string
  guest_name: string
  phone: string
  current_session_id: string
  proposed_session_id: string | null
}

interface AgentPlan {
  status: string
  underbooked_sessions: UnderbookedSession[]
  consolidation_plan: ConsolidationPlanItem[]
  customers_to_contact: CustomerToContact[]
  message: string
}

const FALLBACK_WORKSHOPS: Workshop[] = [
  {
    workshop_id: 'w1',
    workshop_name: 'Weekend Pottery Workshop',
    sessions: [
      { session_id: 's1', time: '14:00', current_pax: 2, min_pax: 4, status: 'warning' },
      { session_id: 's2', time: '16:00', current_pax: 4, min_pax: 4, status: 'confirmed' }
    ]
  },
  {
    workshop_id: 'w2',
    workshop_name: 'Advanced Sculpture Class',
    sessions: [
      { session_id: 's3', time: '10:00', current_pax: 1, min_pax: 3, status: 'warning' },
      { session_id: 's4', time: '15:00', current_pax: 5, min_pax: 3, status: 'full' }
    ]
  }
]

export default function HostDashboard() {
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(true)
  const [agentRunning, setAgentRunning] = useState(false)
  const [agentPlan, setAgentPlan] = useState<AgentPlan | null>(null)
  const [apiOnline, setApiOnline] = useState(true)
  const [agentError, setAgentError] = useState('')
  const [approvedMoves, setApprovedMoves] = useState<string[]>([])
  const [calledGuests, setCalledGuests] = useState<string[]>([])
  const [actionMessage, setActionMessage] = useState('')
  const [actionLog, setActionLog] = useState<any[]>([])
  const [showExecuteModal, setShowExecuteModal] = useState(false)

  useEffect(() => {
    fetchSessions()
    fetchActions()
  }, [])

  const fetchActions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/agent/actions`)
      setActionLog(res.data.items || [])
      setApiOnline(true)
    } catch (error) {
      console.warn('Could not fetch action log:', error)
      setApiOnline(false)
    }
  }

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/sessions`)
      setWorkshops(res.data)
      setApiOnline(true)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching sessions:', error)
      setApiOnline(false)
      setWorkshops(FALLBACK_WORKSHOPS)
      setLoading(false)
    }
  }

  const handleRunAgent = async () => {
    setAgentRunning(true)
    setAgentError('')
    setActionMessage('')
    try {
      const res = await axios.post(`${API_BASE}/api/run-agent`)
      setAgentPlan(res.data)
      // Refresh session view to reflect any recent changes
      fetchSessions()
      setApiOnline(true)
      setApprovedMoves([])
      setCalledGuests([])
    } catch (error) {
      console.error('Error running agent:', error)
      setApiOnline(false)
      setAgentError('Backend offline. Showing last known sessions only.')
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

  const handleApproveMove = (fromSessionId: string) => {
    const run = async () => {
      const planItem = agentPlan?.consolidation_plan.find(
        (item) => item.from_session_id === fromSessionId
      )

      try {
        await axios.post(`${API_BASE}/api/agent/actions/approve`, {
          from_session_id: fromSessionId,
          to_session_id: planItem?.to_session_id || null,
        })

        setApprovedMoves((prev) =>
          prev.includes(fromSessionId)
            ? prev.filter((id) => id !== fromSessionId)
            : [...prev, fromSessionId]
        )
        setApiOnline(true)
        setActionMessage(`Approval saved for session ${fromSessionId}.`)
        fetchActions()
      } catch (error) {
        console.error('Error saving approval:', error)
        setApiOnline(false)
        setActionMessage(`Backend offline. Approval for ${fromSessionId} kept locally.`)
        setApprovedMoves((prev) =>
          prev.includes(fromSessionId)
            ? prev.filter((id) => id !== fromSessionId)
            : [...prev, fromSessionId]
        )
      }
    }

    run()
  }

  const handleCallGuest = (bookingId: string, guestName: string) => {
    const run = async () => {
      try {
        await axios.post(`${API_BASE}/api/agent/actions/call`, {
          booking_id: bookingId,
          guest_name: guestName,
        })

        if (!calledGuests.includes(bookingId)) {
          setCalledGuests((prev) => [...prev, bookingId])
        }
        setApiOnline(true)
        setActionMessage(`Call logged for ${guestName}.`)
        fetchActions()
      } catch (error) {
        console.error('Error logging call:', error)
        setApiOnline(false)
        if (!calledGuests.includes(bookingId)) {
          setCalledGuests((prev) => [...prev, bookingId])
        }
        setActionMessage(`Backend offline. Call for ${guestName} kept locally.`)
      }
    }

    run()
  }

  const handleExecuteApprovedMoves = async () => {
    if (!agentPlan || approvedMoves.length === 0) return
    setShowExecuteModal(true)
  }

  const executeApprovedMovesConfirmed = async () => {
    setShowExecuteModal(false)
    setActionMessage('')
    try {
      for (const fromSessionId of approvedMoves) {
        const planItem = agentPlan.consolidation_plan.find((p) => p.from_session_id === fromSessionId)
        if (!planItem || !planItem.to_session_id) continue

        await axios.post(`${API_BASE}/api/agent/actions/execute`, {
          from_session_id: planItem.from_session_id,
          to_session_id: planItem.to_session_id,
        })
      }

      // Refresh UI state
      await fetchSessions()
      await fetchActions()
      setActionMessage('Executed approved moves and refreshed sessions.')
      setApprovedMoves([])
    } catch (error) {
      console.error('Error executing moves:', error)
      setApiOnline(false)
      setActionMessage('Failed to execute moves. See console for details.')
    }
  }

  const executeCancel = () => setShowExecuteModal(false)

  const handleUndo = async () => {
    try {
      const res = await axios.post(`${API_BASE}/api/agent/actions/undo`)
      if (res.data.status === 'success') {
        setActionMessage('Undo applied: ' + (res.data.restored || res.data.undone || ''))
      } else {
        setActionMessage('Nothing to undo.')
      }
      await fetchSessions()
      await fetchActions()
    } catch (error) {
      console.error('Undo failed:', error)
      setActionMessage('Undo failed. See console for details.')
    }
  }

  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [showSessionModal, setShowSessionModal] = useState(false)

  const openSessionModal = (s: Session) => {
    setSelectedSession(s)
    setShowSessionModal(true)
  }
  const closeSessionModal = () => { setSelectedSession(null); setShowSessionModal(false) }

  if (loading) {
    return <div className="text-center text-2xl">Loading sessions...</div>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-3xl font-bold mb-2">Workshop Sessions</h2>
        <p className="text-gray-600">Monitor bookings and run AI agent to optimize sessions</p>
        <div className={`mt-4 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${
          apiOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {apiOnline ? 'API: Connected' : 'API: Offline (fallback mode)'}
        </div>
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
        {agentError && <p className="mt-3 text-sm text-amber-700">{agentError}</p>}
        {actionMessage && <p className="mt-3 text-sm text-emerald-700">{actionMessage}</p>}
      </div>

      {/* Agent Plan Display */}
      {agentPlan && (
        <div className="bg-gradient-to-r from-white to-slate-50 rounded-lg shadow-md p-6 border-l-4 border-primary">
          <h3 className="text-2xl font-bold mb-4">Agent Plan</h3>
          <p className="text-gray-700 mb-4">{agentPlan.message || 'Planning complete.'}</p>
          {approvedMoves.length > 0 && (
            <div className="mb-4">
              <button
                onClick={handleExecuteApprovedMoves}
                className="px-4 py-2 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-500"
              >
                Execute Approved Moves
              </button>
            </div>
          )}

          {!!agentPlan.underbooked_sessions?.length && (
            <div className="mb-4">
              <h4 className="font-bold mb-2">Underbooked Sessions</h4>
              <div className="grid gap-2">
                {agentPlan.underbooked_sessions.map((item) => (
                  <div key={item.session_id} className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                    <span className="font-semibold">{item.workshop_name}</span> - {item.time} ({item.current_pax}/{item.min_pax})
                  </div>
                ))}
              </div>
            </div>
          )}

          {!!agentPlan.consolidation_plan?.length && (
            <div className="mb-4">
              <h4 className="font-bold mb-2">Consolidation Recommendations</h4>
              <div className="grid gap-2">
                {agentPlan.consolidation_plan.map((item, index) => (
                  <div key={`${item.from_session_id}-${index}`} className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                    <p className="mb-2">
                      Move {item.from_time} ({item.from_session_id}) to {item.to_time || 'N/A'} ({item.to_session_id || 'manual review'})
                    </p>
                    <button
                      onClick={() => handleApproveMove(item.from_session_id)}
                      className={`rounded px-3 py-1 text-xs font-bold transition ${
                        approvedMoves.includes(item.from_session_id)
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-white hover:bg-slate-700'
                      }`}
                    >
                      {approvedMoves.includes(item.from_session_id)
                        ? 'Approved'
                        : 'Approve Reschedule'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!!agentPlan.customers_to_contact?.length && (
            <div className="mb-4">
              <h4 className="font-bold mb-2">Customers To Contact</h4>
              <div className="grid gap-2">
                {agentPlan.customers_to_contact.map((guest) => (
                  <div key={guest.booking_id} className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
                    <p className="font-semibold">{guest.guest_name}</p>
                    <p className="text-gray-700 mb-2">{guest.phone} • Booking {guest.booking_id}</p>
                    <button
                      onClick={() => handleCallGuest(guest.booking_id, guest.guest_name)}
                      className={`rounded px-3 py-1 text-xs font-bold transition ${
                        calledGuests.includes(guest.booking_id)
                          ? 'bg-blue-600 text-white'
                          : 'bg-amber-600 text-white hover:bg-amber-500'
                      }`}
                    >
                      {calledGuests.includes(guest.booking_id)
                        ? 'Call Logged'
                        : 'Call Guest'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-sm text-gray-700 grid grid-cols-2 gap-4">
            <p>
              Customers to contact: <span className="font-bold">{agentPlan.customers_to_contact?.length || 0}</span>
            </p>
            <p>
              Approved moves: <span className="font-bold">{approvedMoves.length}</span>
            </p>
          </div>
        </div>
      )}

      {/* Action Log Panel */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold mb-2">Action Log</h3>
          <div className="flex gap-2">
            <button
              onClick={fetchActions}
              className="px-3 py-1 bg-slate-800 text-white rounded text-sm"
            >
              Refresh
            </button>
            <button
              onClick={handleUndo}
              className="px-3 py-1 bg-rose-600 text-white rounded text-sm"
            >
              Undo Last
            </button>
          </div>
        </div>

        {actionLog.length === 0 ? (
          <p className="text-sm text-gray-600 mt-3">No saved actions yet.</p>
        ) : (
          <div className="mt-3 grid gap-2">
            {actionLog.map((act, idx) => (
              <div key={idx} className="p-3 border rounded bg-white shadow-sm text-sm flex justify-between items-start">
                <div>
                  <div className="font-semibold mb-1">{act.type === 'approve_reschedule' ? 'Approve: Reschedule' : act.type === 'call_guest' ? 'Call: Guest' : act.type}</div>
                  <div className="text-xs text-gray-600">
                    {act.type === 'approve_reschedule' && (
                      <>
                        From <span className="font-medium">{act.from_session_id}</span> → To <span className="font-medium">{act.to_session_id || 'N/A'}</span>
                      </>
                    )}
                    {act.type === 'call_guest' && (
                      <>
                        Booking <span className="font-medium">{act.booking_id}</span> — <span className="font-medium">{act.guest_name}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400">#{idx + 1}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Execute confirmation modal */}
      {showExecuteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={executeCancel}></div>
          <div className="bg-white rounded-lg shadow-xl p-6 z-10 w-11/12 max-w-md">
            <h4 className="text-lg font-bold mb-2">Confirm Execute</h4>
            <p className="text-sm text-gray-700 mb-4">This will apply all approved moves and create a timestamped applied snapshot. This is non-destructive but can be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={executeCancel} className="px-4 py-2 rounded border">Cancel</button>
              <button onClick={executeApprovedMovesConfirmed} className="px-4 py-2 bg-emerald-600 text-white rounded">Execute</button>
            </div>
          </div>
        </div>
      )}

      {/* Session detail modal */}
      {showSessionModal && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeSessionModal}></div>
          <div className="bg-white rounded-xl shadow-2xl p-6 z-10 w-11/12 max-w-lg">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-xl font-bold">Session {selectedSession.session_id} • {selectedSession.time}</h4>
                <p className="text-sm text-gray-600">Attendees: <span className="font-semibold">{selectedSession.current_pax}</span> / {selectedSession.min_pax}</p>
              </div>
              <button onClick={closeSessionModal} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="flex gap-2">
                <button onClick={() => { handleApproveMove(selectedSession.session_id); closeSessionModal() }} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded">Approve Reschedule</button>
                <button onClick={() => { handleUndo(); closeSessionModal() }} className="px-4 py-2 bg-rose-500 text-white rounded">Undo</button>
              </div>
              <div className="text-sm text-gray-600">Actions are audited. Use <span className="font-semibold">Execute</span> to apply approved moves.</div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar-style Schedule */}
      <div className="bg-gradient-to-r from-sky-50 to-white rounded-lg shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold">Schedule</h3>
            <p className="text-sm text-gray-500">Workshops as columns • Times as rows (08:00–20:00)</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleRunAgent} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow">🤖 Run Agent</button>
            <button onClick={() => fetchSessions()} className="px-4 py-2 bg-white border rounded-md shadow-sm">Refresh</button>
          </div>
        </div>

        {/* build time slots */}
        {(() => {
          const startHour = 8
          const endHour = 20
          const hours: string[] = []
          for (let h = startHour; h <= endHour; h++) {
            hours.push((h < 10 ? '0' + h : '' + h) + ':00')
          }

          return (
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                {/* header row */}
                <div className="flex items-end mb-2">
                  <div className="w-28" />
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${workshops.length}, minmax(0,1fr))` }}>
                    {workshops.map((w) => (
                      <div key={w.workshop_id} className="text-center font-semibold text-sm p-2 border-b">{w.workshop_name}</div>
                    ))}
                  </div>
                </div>

                <div className="flex">
                  {/* time column */}
                  <div className="w-28">
                    {hours.map((t) => (
                      <div key={t} className="h-12 text-xs text-gray-500 border-b flex items-center justify-end pr-2">{t}</div>
                    ))}
                  </div>

                  {/* schedule grid */}
                  <div className="flex-1">
                    <div className="relative">
                      <div className="grid" style={{ gridTemplateColumns: `repeat(${workshops.length}, minmax(0,1fr))`, gridTemplateRows: `repeat(${hours.length}, 3rem)` }}>
                        {/* background cells */}
                        {Array.from({ length: workshops.length * hours.length }).map((_, idx) => (
                          <div key={idx} className="border-b border-r bg-white" />
                        ))}

                        {/* session blocks placed by grid row/column */}
                        {workshops.map((w, colIdx) => (
                          w.sessions.map((s) => {
                            const parts = s.time.split(':')
                            const hour = parseInt(parts[0] || '0', 10)
                            const rowIndex = Math.max(0, Math.min(hours.length - 1, hour - startHour))
                            return (
                              <div
                                key={s.session_id}
                                onClick={() => openSessionModal(s)}
                                role="button"
                                className={`cursor-pointer p-2 m-1 rounded-xl shadow-lg border transform hover:-translate-y-0.5 transition ${getStatusColor(s.status)}`} 
                                style={{ gridColumn: colIdx + 1, gridRow: rowIndex + 1 }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="text-sm font-semibold">{s.time} • {s.session_id}</div>
                                  <div className="text-xs text-gray-700">👥 {s.current_pax}/{s.min_pax}</div>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">Click for details</div>
                              </div>
                            )
                          })
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
