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

function FillBar({ current, min, max }: { current: number; min: number; max: number }) {
  const pct = Math.min(100, Math.round((current / (max || min)) * 100))
  const color = current < min ? 'bg-ember' : current >= max ? 'bg-sage' : 'bg-clay'
  return (
    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  if (status === 'warning') return <span className="inline-block w-2 h-2 rounded-full bg-ember animate-pulse" />
  if (status === 'full') return <span className="inline-block w-2 h-2 rounded-full bg-sage" />
  return <span className="inline-block w-2 h-2 rounded-full bg-clay" />
}

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
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [showSessionModal, setShowSessionModal] = useState(false)

  useEffect(() => {
    fetchSessions()
    fetchActions()
  }, [])

  const fetchActions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/agent/actions`)
      setActionLog(res.data.items || [])
      setApiOnline(true)
    } catch {
      setApiOnline(false)
    }
  }

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/sessions`)
      setWorkshops(res.data)
      setApiOnline(true)
    } catch {
      setApiOnline(false)
      setWorkshops(FALLBACK_WORKSHOPS)
    } finally {
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
      fetchSessions()
      setApiOnline(true)
      setApprovedMoves([])
      setCalledGuests([])
    } catch {
      setApiOnline(false)
      setAgentError('Backend offline. Showing last known sessions.')
    } finally {
      setAgentRunning(false)
    }
  }

  const handleApproveMove = (fromSessionId: string) => {
    const run = async () => {
      const planItem = agentPlan?.consolidation_plan.find(i => i.from_session_id === fromSessionId)
      try {
        await axios.post(`${API_BASE}/api/agent/actions/approve`, {
          from_session_id: fromSessionId,
          to_session_id: planItem?.to_session_id || null,
        })
        setApprovedMoves(prev => prev.includes(fromSessionId) ? prev.filter(id => id !== fromSessionId) : [...prev, fromSessionId])
        setActionMessage(`Move approved for session ${fromSessionId}.`)
        fetchActions()
      } catch {
        setApiOnline(false)
        setApprovedMoves(prev => prev.includes(fromSessionId) ? prev.filter(id => id !== fromSessionId) : [...prev, fromSessionId])
      }
    }
    run()
  }

  const handleCallGuest = (bookingId: string, guestName: string) => {
    const run = async () => {
      try {
        await axios.post(`${API_BASE}/api/agent/actions/call`, { booking_id: bookingId, guest_name: guestName })
        if (!calledGuests.includes(bookingId)) setCalledGuests(prev => [...prev, bookingId])
        setActionMessage(`Call logged for ${guestName}.`)
        fetchActions()
      } catch {
        if (!calledGuests.includes(bookingId)) setCalledGuests(prev => [...prev, bookingId])
      }
    }
    run()
  }

  const handleExecuteApprovedMoves = () => {
    if (!agentPlan || approvedMoves.length === 0) return
    setShowExecuteModal(true)
  }

  const executeApprovedMovesConfirmed = async () => {
    setShowExecuteModal(false)
    try {
      for (const fromSessionId of approvedMoves) {
        const planItem = agentPlan!.consolidation_plan.find(p => p.from_session_id === fromSessionId)
        if (!planItem?.to_session_id) continue
        await axios.post(`${API_BASE}/api/agent/actions/execute`, {
          from_session_id: planItem.from_session_id,
          to_session_id: planItem.to_session_id,
        })
      }
      await fetchSessions()
      await fetchActions()
      setActionMessage('Moves executed successfully.')
      setApprovedMoves([])
    } catch {
      setActionMessage('Failed to execute moves.')
    }
  }

  const handleUndo = async () => {
    try {
      const res = await axios.post(`${API_BASE}/api/agent/actions/undo`)
      setActionMessage(res.data.status === 'success' ? 'Last action undone.' : 'Nothing to undo.')
      await fetchSessions()
      await fetchActions()
    } catch {
      setActionMessage('Undo failed.')
    }
  }

  const openSessionModal = (s: Session) => { setSelectedSession(s); setShowSessionModal(true) }
  const closeSessionModal = () => { setSelectedSession(null); setShowSessionModal(false) }

  const totalSessions = workshops.reduce((a, w) => a + w.sessions.length, 0)
  const warningSessions = workshops.reduce((a, w) => a + w.sessions.filter(s => s.status === 'warning').length, 0)
  const fullSessions = workshops.reduce((a, w) => a + w.sessions.filter(s => s.status === 'full').length, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex gap-1">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-clay animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-muted text-sm uppercase tracking-widest mb-1">Dashboard</p>
          <h1 className="font-display text-4xl text-parchment">Workshop Sessions</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border ${
            apiOnline ? 'border-sage/40 text-sage bg-sage/10' : 'border-ember/40 text-ember bg-ember/10'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${apiOnline ? 'bg-sage' : 'bg-ember'}`} />
            {apiOnline ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Sessions', value: totalSessions, color: 'text-parchment' },
          { label: 'Need Attention', value: warningSessions, color: 'text-ember' },
          { label: 'Fully Booked', value: fullSessions, color: 'text-sage' },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-white/8 rounded-2xl p-5">
            <p className="text-muted text-xs uppercase tracking-wider mb-2">{s.label}</p>
            <p className={`font-display text-4xl ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Run Agent */}
      <div className="bg-surface border border-white/8 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-parchment mb-1">AI Consolidation Agent</h2>
          <p className="text-muted text-sm">Detects underbooked sessions and recommends rescheduling.</p>
          {agentError && <p className="text-ember text-sm mt-2">{agentError}</p>}
          {actionMessage && <p className="text-sage text-sm mt-2">{actionMessage}</p>}
        </div>
        <div className="flex gap-3 shrink-0">
          {approvedMoves.length > 0 && (
            <button onClick={handleExecuteApprovedMoves} className="px-5 py-2.5 bg-sage text-ink rounded-xl text-sm font-semibold hover:bg-sage/80 transition">
              Execute ({approvedMoves.length})
            </button>
          )}
          <button
            onClick={handleRunAgent}
            disabled={agentRunning}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
              agentRunning ? 'bg-white/10 text-muted cursor-not-allowed' : 'bg-clay text-ink hover:bg-clay/80'
            }`}
          >
            {agentRunning ? (
              <>
                <span className="w-3 h-3 border-2 border-muted border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : 'Run Agent'}
          </button>
        </div>
      </div>

      {/* Agent plan */}
      {agentPlan && (
        <div className="bg-surface border border-clay/20 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <h3 className="font-display text-lg text-parchment">Agent Recommendations</h3>
            <span className="text-xs text-muted">{agentPlan.message}</span>
          </div>

          <div className="p-6 grid sm:grid-cols-2 gap-6">
            {/* Underbooked */}
            {agentPlan.underbooked_sessions?.length > 0 && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wider mb-3">Underbooked</p>
                <div className="space-y-2">
                  {agentPlan.underbooked_sessions.map(item => (
                    <div key={item.session_id} className="bg-ember/10 border border-ember/20 rounded-xl p-3">
                      <p className="text-parchment text-sm font-medium">{item.workshop_name}</p>
                      <p className="text-ember text-xs mt-0.5">{item.time} · {item.current_pax}/{item.min_pax} pax · {item.pax_gap} short</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Consolidation */}
            {agentPlan.consolidation_plan?.length > 0 && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wider mb-3">Proposed Moves</p>
                <div className="space-y-2">
                  {agentPlan.consolidation_plan.map((item, i) => (
                    <div key={`${item.from_session_id}-${i}`} className="bg-clay/10 border border-clay/20 rounded-xl p-3">
                      <p className="text-parchment text-sm font-medium">{item.workshop_name}</p>
                      <p className="text-clay text-xs mt-0.5">{item.from_time} → {item.to_time || '?'}</p>
                      <button
                        onClick={() => handleApproveMove(item.from_session_id)}
                        className={`mt-2 text-xs px-3 py-1 rounded-lg font-medium transition ${
                          approvedMoves.includes(item.from_session_id)
                            ? 'bg-sage text-ink'
                            : 'bg-white/10 text-parchment hover:bg-white/15'
                        }`}
                      >
                        {approvedMoves.includes(item.from_session_id) ? '✓ Approved' : 'Approve'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Guests to contact */}
            {agentPlan.customers_to_contact?.length > 0 && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted uppercase tracking-wider mb-3">Guests to Contact</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {agentPlan.customers_to_contact.map(guest => (
                    <div key={guest.booking_id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="text-parchment text-sm font-medium">{guest.guest_name}</p>
                        <p className="text-muted text-xs">{guest.phone}</p>
                      </div>
                      <button
                        onClick={() => handleCallGuest(guest.booking_id, guest.guest_name)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                          calledGuests.includes(guest.booking_id)
                            ? 'bg-sage/20 text-sage'
                            : 'bg-clay/20 text-clay hover:bg-clay/30'
                        }`}
                      >
                        {calledGuests.includes(guest.booking_id) ? 'Called' : 'Call'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule grid */}
      <div className="bg-surface border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
          <h3 className="font-display text-lg text-parchment">Schedule</h3>
          <button onClick={fetchSessions} className="text-xs text-muted hover:text-parchment transition px-3 py-1 rounded-lg border border-white/10 hover:border-white/20">
            Refresh
          </button>
        </div>

        <div className="p-6 overflow-x-auto">
          {(() => {
            const startHour = 8
            const endHour = 20
            const hours: string[] = []
            for (let h = startHour; h <= endHour; h++) hours.push((h < 10 ? '0' + h : '' + h) + ':00')

            return (
              <div className="min-w-[640px]">
                <div className="flex mb-2">
                  <div className="w-16" />
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${workshops.length}, minmax(0,1fr))` }}>
                    {workshops.map(w => (
                      <div key={w.workshop_id} className="text-center text-xs text-muted font-medium uppercase tracking-wider pb-3 border-b border-white/8 px-2">
                        {w.workshop_name}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex">
                  <div className="w-16 shrink-0">
                    {hours.map(t => (
                      <div key={t} className="h-14 flex items-center justify-end pr-3">
                        <span className="text-xs text-muted/60">{t}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex-1 relative">
                    <div className="grid" style={{ gridTemplateColumns: `repeat(${workshops.length}, minmax(0,1fr))`, gridTemplateRows: `repeat(${hours.length}, 3.5rem)` }}>
                      {Array.from({ length: workshops.length * hours.length }).map((_, idx) => (
                        <div key={idx} className="border-b border-r border-white/5" />
                      ))}
                      {workshops.map((w, colIdx) =>
                        w.sessions.map(s => {
                          const hour = parseInt(s.time.split(':')[0] || '0', 10)
                          const row = Math.max(0, Math.min(hours.length - 1, hour - startHour))
                          const statusStyle = s.status === 'warning'
                            ? 'border-ember/40 bg-ember/10 hover:bg-ember/20'
                            : s.status === 'full'
                            ? 'border-sage/40 bg-sage/10 hover:bg-sage/20'
                            : 'border-clay/40 bg-clay/10 hover:bg-clay/20'
                          return (
                            <div
                              key={s.session_id}
                              onClick={() => openSessionModal(s)}
                              role="button"
                              className={`cursor-pointer m-1 rounded-xl border p-2 transition-all duration-150 ${statusStyle}`}
                              style={{ gridColumn: colIdx + 1, gridRow: row + 1 }}
                            >
                              <div className="flex items-center gap-1.5">
                                <StatusDot status={s.status} />
                                <span className="text-parchment text-xs font-semibold">{s.time}</span>
                              </div>
                              <FillBar current={s.current_pax} min={s.min_pax} max={s.min_pax + 2} />
                              <p className="text-muted text-xs mt-1">{s.current_pax}/{s.min_pax}</p>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Action log */}
      {actionLog.length > 0 && (
        <div className="bg-surface border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between">
            <h3 className="font-display text-lg text-parchment">Action Log</h3>
            <div className="flex gap-2">
              <button onClick={fetchActions} className="text-xs text-muted hover:text-parchment px-3 py-1 rounded-lg border border-white/10 hover:border-white/20 transition">Refresh</button>
              <button onClick={handleUndo} className="text-xs text-ember hover:text-ember/70 px-3 py-1 rounded-lg border border-ember/20 hover:border-ember/40 transition">Undo Last</button>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {actionLog.map((act, idx) => (
              <div key={idx} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-parchment text-sm">
                    {act.type === 'approve_reschedule' ? 'Reschedule approved' : act.type === 'call_guest' ? `Called ${act.guest_name}` : act.type}
                  </p>
                  <p className="text-muted text-xs">
                    {act.type === 'approve_reschedule' && `${act.from_session_id} → ${act.to_session_id || '?'}`}
                    {act.type === 'call_guest' && `Booking ${act.booking_id}`}
                  </p>
                </div>
                <span className="text-muted/40 text-xs">#{idx + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execute confirmation modal */}
      {showExecuteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowExecuteModal(false)} />
          <div className="bg-canvas border border-white/10 rounded-2xl p-6 z-10 w-full max-w-md shadow-2xl">
            <h4 className="font-display text-xl text-parchment mb-2">Confirm Execution</h4>
            <p className="text-muted text-sm mb-6">This will apply {approvedMoves.length} approved move(s) and update the booking database.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowExecuteModal(false)} className="px-4 py-2 rounded-xl border border-white/10 text-muted hover:text-parchment text-sm transition">Cancel</button>
              <button onClick={executeApprovedMovesConfirmed} className="px-5 py-2 bg-sage text-ink rounded-xl text-sm font-semibold hover:bg-sage/80 transition">Execute</button>
            </div>
          </div>
        </div>
      )}

      {/* Session detail modal */}
      {showSessionModal && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeSessionModal} />
          <div className="bg-canvas border border-white/10 rounded-2xl p-6 z-10 w-full max-w-md shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-display text-xl text-parchment">{selectedSession.time} Session</h4>
                <p className="text-muted text-sm">{selectedSession.session_id}</p>
              </div>
              <button onClick={closeSessionModal} className="text-muted hover:text-parchment transition text-lg">✕</button>
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted">Capacity</span>
                <span className="text-parchment">{selectedSession.current_pax} / {selectedSession.min_pax}</span>
              </div>
              <FillBar current={selectedSession.current_pax} min={selectedSession.min_pax} max={selectedSession.min_pax + 2} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { handleApproveMove(selectedSession.session_id); closeSessionModal() }} className="flex-1 px-4 py-2 bg-clay text-ink rounded-xl text-sm font-semibold hover:bg-clay/80 transition">
                Approve Reschedule
              </button>
              <button onClick={() => { handleUndo(); closeSessionModal() }} className="px-4 py-2 border border-ember/30 text-ember rounded-xl text-sm hover:bg-ember/10 transition">Undo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
