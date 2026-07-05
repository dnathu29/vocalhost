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
  const color = current < min ? 'bg-terracotta' : current >= max ? 'bg-sage' : 'bg-gold'
  return (
    <div className="w-full h-2 bg-blush/50 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  if (status === 'warning') return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-terracotta/15 text-terracotta font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-terracotta animate-pulse" />
      Needs attention
    </span>
  )
  if (status === 'full') return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-sage/15 text-sage font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-sage" />
      Full
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gold/15 text-gold font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-gold" />
      Confirmed
    </span>
  )
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

  useEffect(() => { fetchSessions(); fetchActions() }, [])

  const fetchActions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/agent/actions`)
      setActionLog(res.data.items || [])
      setApiOnline(true)
    } catch { setApiOnline(false) }
  }

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/sessions`)
      setWorkshops(res.data)
      setApiOnline(true)
    } catch {
      setApiOnline(false)
      setWorkshops(FALLBACK_WORKSHOPS)
    } finally { setLoading(false) }
  }

  const handleRunAgent = async () => {
    setAgentRunning(true); setAgentError(''); setActionMessage('')
    try {
      const res = await axios.post(`${API_BASE}/api/run-agent`)
      setAgentPlan(res.data); fetchSessions(); setApiOnline(true)
      setApprovedMoves([]); setCalledGuests([])
    } catch (error: any) {
      setApiOnline(false)
      setAgentError(error.response?.data?.detail || 'Backend offline. Showing last known sessions.')
    } finally { setAgentRunning(false) }
  }

  const handleApproveMove = (fromSessionId: string) => {
    const run = async () => {
      const planItem = agentPlan?.consolidation_plan.find(i => i.from_session_id === fromSessionId)
      try {
        await axios.post(`${API_BASE}/api/agent/actions/approve`, { from_session_id: fromSessionId, to_session_id: planItem?.to_session_id || null })
        setApprovedMoves(prev => prev.includes(fromSessionId) ? prev.filter(id => id !== fromSessionId) : [...prev, fromSessionId])
        setActionMessage(`Move approved for session ${fromSessionId}.`)
        fetchActions()
      } catch {
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

  const executeApprovedMovesConfirmed = async () => {
    setShowExecuteModal(false)
    try {
      for (const fromSessionId of approvedMoves) {
        const planItem = agentPlan!.consolidation_plan.find(p => p.from_session_id === fromSessionId)
        if (!planItem?.to_session_id) continue
        await axios.post(`${API_BASE}/api/agent/actions/execute`, { from_session_id: planItem.from_session_id, to_session_id: planItem.to_session_id })
      }
      await fetchSessions(); await fetchActions()
      setActionMessage('Moves executed successfully.'); setApprovedMoves([])
    } catch { setActionMessage('Failed to execute moves.') }
  }

  const handleUndo = async () => {
    try {
      const res = await axios.post(`${API_BASE}/api/agent/actions/undo`)
      setActionMessage(res.data.status === 'success' ? 'Last action undone.' : 'Nothing to undo.')
      await fetchSessions(); await fetchActions()
    } catch { setActionMessage('Undo failed.') }
  }

  const openSessionModal = (s: Session) => { setSelectedSession(s); setShowSessionModal(true) }
  const closeSessionModal = () => { setSelectedSession(null); setShowSessionModal(false) }

  const totalSessions = workshops.reduce((a, w) => a + w.sessions.length, 0)
  const warningSessions = workshops.reduce((a, w) => a + w.sessions.filter(s => s.status === 'warning').length, 0)
  const fullSessions = workshops.reduce((a, w) => a + w.sessions.filter(s => s.status === 'full').length, 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2.5 h-2.5 rounded-full bg-terracotta animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-warm text-xs uppercase tracking-widest mb-1 font-medium">Host Dashboard</p>
          <h1 className="font-display text-4xl text-espresso">Workshop Sessions</h1>
          <p className="text-warm text-sm mt-1">Monitor bookings and let your AI agent handle the rest.</p>
        </div>
        <span className={`self-start sm:self-auto inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium ${apiOnline ? 'border-sage/40 text-sage bg-sage/10' : 'border-terracotta/40 text-terracotta bg-terracotta/10'
          }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${apiOnline ? 'bg-sage animate-pulse' : 'bg-terracotta'}`} />
          {apiOnline ? 'Connected' : 'Offline'}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Sessions', value: totalSessions, bg: 'bg-parchment', accent: 'text-espresso', border: 'border-blush' },
          { label: 'Need Attention', value: warningSessions, bg: 'bg-terracotta/10', accent: 'text-terracotta', border: 'border-terracotta/20' },
          { label: 'Fully Booked', value: fullSessions, bg: 'bg-sage/10', accent: 'text-sage', border: 'border-sage/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-5 card-shadow`}>
            <p className="text-warm text-xs uppercase tracking-wider font-medium mb-2">{s.label}</p>
            <p className={`font-display text-4xl ${s.accent}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Agent CTA */}
      <div className="bg-gradient-to-r from-terracotta to-terra2 rounded-2xl p-6 card-shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-cream mb-1">AI Consolidation Agent</h2>
          <p className="text-cream/80 text-sm">Detects underbooked sessions and proposes smart rescheduling.</p>
          {agentError && <p className="text-cream/70 text-xs mt-2 bg-white/10 rounded-lg px-3 py-1.5">{agentError}</p>}
          {actionMessage && <p className="text-cream text-xs mt-2 bg-white/20 rounded-lg px-3 py-1.5 font-medium">{actionMessage}</p>}
        </div>
        <div className="flex gap-3 shrink-0">
          {approvedMoves.length > 0 && (
            <button onClick={() => setShowExecuteModal(true)} className="px-5 py-2.5 bg-cream text-terracotta rounded-xl text-sm font-semibold hover:bg-parchment transition card-shadow">
              Execute ({approvedMoves.length})
            </button>
          )}
          <button
            onClick={handleRunAgent}
            disabled={agentRunning}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${agentRunning ? 'bg-white/20 text-cream/60 cursor-not-allowed' : 'bg-espresso text-cream hover:bg-bark'
              }`}
          >
            {agentRunning ? (
              <><span className="w-3.5 h-3.5 border-2 border-cream/40 border-t-cream rounded-full animate-spin" /> Analyzing...</>
            ) : 'Run Agent'}
          </button>
        </div>
      </div>

      {/* Agent plan results */}
      {agentPlan && (
        <div className="bg-parchment border border-blush rounded-2xl overflow-hidden card-shadow">
          <div className="px-6 py-4 border-b border-blush flex items-center justify-between bg-blush/30">
            <h3 className="font-display text-xl text-espresso">Agent Recommendations</h3>
            <span className="text-xs text-warm">{agentPlan.message}</span>
          </div>
          <div className="p-6 grid sm:grid-cols-2 gap-6">

            {agentPlan.underbooked_sessions?.length > 0 && (
              <div>
                <p className="text-xs text-warm uppercase tracking-wider font-medium mb-3">Underbooked Sessions</p>
                <div className="space-y-2">
                  {agentPlan.underbooked_sessions.map(item => (
                    <div key={item.session_id} className="bg-terracotta/10 border border-terracotta/25 rounded-xl p-3">
                      <p className="text-espresso text-sm font-semibold">{item.workshop_name}</p>
                      <p className="text-terracotta text-xs mt-0.5">{item.time} · {item.current_pax}/{item.min_pax} guests · {item.pax_gap} short</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {agentPlan.consolidation_plan?.length > 0 && (
              <div>
                <p className="text-xs text-warm uppercase tracking-wider font-medium mb-3">Proposed Moves</p>
                <div className="space-y-2">
                  {agentPlan.consolidation_plan.map((item, i) => (
                    <div key={`${item.from_session_id}-${i}`} className="bg-gold/10 border border-gold/25 rounded-xl p-3">
                      <p className="text-espresso text-sm font-semibold">{item.workshop_name}</p>
                      <p className="text-gold text-xs mt-0.5">{item.from_time} → {item.to_time || '?'}</p>
                      <button
                        onClick={() => handleApproveMove(item.from_session_id)}
                        className={`mt-2 text-xs px-3 py-1 rounded-lg font-medium transition ${approvedMoves.includes(item.from_session_id)
                            ? 'bg-sage text-cream'
                            : 'bg-espresso text-cream hover:bg-bark'
                          }`}
                      >
                        {approvedMoves.includes(item.from_session_id) ? '✓ Approved' : 'Approve'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {agentPlan.customers_to_contact?.length > 0 && (
              <div className="sm:col-span-2">
                <p className="text-xs text-warm uppercase tracking-wider font-medium mb-3">Guests to Contact</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {agentPlan.customers_to_contact.map(guest => (
                    <div key={guest.booking_id} className="bg-cream border border-blush rounded-xl p-3 flex items-center justify-between card-shadow">
                      <div>
                        <p className="text-espresso text-sm font-semibold">{guest.guest_name}</p>
                        <p className="text-warm text-xs">{guest.phone}</p>
                      </div>
                      <button
                        onClick={() => handleCallGuest(guest.booking_id, guest.guest_name)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${calledGuests.includes(guest.booking_id)
                            ? 'bg-sage/20 text-sage'
                            : 'bg-terracotta text-cream hover:bg-terra2'
                          }`}
                      >
                        {calledGuests.includes(guest.booking_id) ? 'Called ✓' : 'Call'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule */}
      <div className="bg-parchment border border-blush rounded-2xl overflow-hidden card-shadow">
        <div className="px-6 py-4 border-b border-blush bg-blush/30 flex items-center justify-between">
          <h3 className="font-display text-xl text-espresso">Schedule</h3>
          <div className="flex gap-2">
            <button onClick={handleRunAgent} className="text-xs px-3 py-1.5 bg-terracotta text-cream rounded-lg font-medium hover:bg-terra2 transition">Run Agent</button>
            <button onClick={fetchSessions} className="text-xs px-3 py-1.5 bg-cream border border-blush rounded-lg text-warm hover:text-espresso transition">Refresh</button>
          </div>
        </div>

        <div className="p-6 overflow-x-auto">
          {(() => {
            const startHour = 8, endHour = 20
            const hours: string[] = []
            for (let h = startHour; h <= endHour; h++) hours.push((h < 10 ? '0' + h : '' + h) + ':00')

            const sessionBg = (s: Session) => {
              if (s.status === 'warning') return 'border-terracotta/40 bg-terracotta/10 hover:bg-terracotta/18'
              if (s.status === 'full') return 'border-sage/40 bg-sage/10 hover:bg-sage/18'
              return 'border-gold/40 bg-gold/10 hover:bg-gold/18'
            }

            return (
              <div className="min-w-[640px]">
                <div className="flex mb-3">
                  <div className="w-16" />
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${workshops.length}, minmax(0,1fr))` }}>
                    {workshops.map(w => (
                      <div key={w.workshop_id} className="text-center text-xs text-warm font-semibold uppercase tracking-wider pb-3 border-b border-blush px-2">
                        {w.workshop_name}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex">
                  <div className="w-16 shrink-0">
                    {hours.map(t => (
                      <div key={t} className="h-14 flex items-center justify-end pr-3">
                        <span className="text-xs text-mist">{t}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 relative">
                    <div className="grid" style={{ gridTemplateColumns: `repeat(${workshops.length}, minmax(0,1fr))`, gridTemplateRows: `repeat(${hours.length}, 3.5rem)` }}>
                      {Array.from({ length: workshops.length * hours.length }).map((_, idx) => (
                        <div key={idx} className="border-b border-r border-blush/40" />
                      ))}
                      {workshops.map((w, colIdx) =>
                        w.sessions.map(s => {
                          const row = Math.max(0, Math.min(hours.length - 1, parseInt(s.time.split(':')[0] || '0', 10) - startHour))
                          return (
                            <div
                              key={s.session_id}
                              onClick={() => openSessionModal(s)}
                              role="button"
                              className={`cursor-pointer m-1 rounded-xl border p-2 transition-all duration-150 card-shadow ${sessionBg(s)}`}
                              style={{ gridColumn: colIdx + 1, gridRow: row + 1 }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-espresso text-xs font-semibold">{s.time}</span>
                                <StatusPill status={s.status} />
                              </div>
                              <FillBar current={s.current_pax} min={s.min_pax} max={s.min_pax + 2} />
                              <p className="text-warm text-xs mt-1">{s.current_pax}/{s.min_pax} guests</p>
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
        <div className="bg-parchment border border-blush rounded-2xl overflow-hidden card-shadow">
          <div className="px-6 py-4 border-b border-blush bg-blush/30 flex items-center justify-between">
            <h3 className="font-display text-xl text-espresso">Action Log</h3>
            <div className="flex gap-2">
              <button onClick={fetchActions} className="text-xs px-3 py-1.5 bg-cream border border-blush rounded-lg text-warm hover:text-espresso transition">Refresh</button>
              <button onClick={handleUndo} className="text-xs px-3 py-1.5 border border-terracotta/30 text-terracotta rounded-lg hover:bg-terracotta/10 transition">Undo Last</button>
            </div>
          </div>
          <div className="divide-y divide-blush/50">
            {actionLog.map((act, idx) => (
              <div key={idx} className="px-6 py-3 flex items-center justify-between hover:bg-blush/20 transition">
                <div>
                  <p className="text-espresso text-sm font-medium">
                    {act.type === 'approve_reschedule' ? 'Reschedule approved' : act.type === 'call_guest' ? `Called ${act.guest_name}` : act.type}
                  </p>
                  <p className="text-warm text-xs">
                    {act.type === 'approve_reschedule' && `${act.from_session_id} → ${act.to_session_id || '?'}`}
                    {act.type === 'call_guest' && `Booking ${act.booking_id}`}
                  </p>
                </div>
                <span className="text-mist text-xs">#{idx + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execute modal */}
      {showExecuteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-espresso/40 backdrop-blur-sm" onClick={() => setShowExecuteModal(false)} />
          <div className="bg-cream border border-blush rounded-2xl p-6 z-10 w-full max-w-md card-shadow-lg">
            <h4 className="font-display text-xl text-espresso mb-2">Confirm Execution</h4>
            <p className="text-warm text-sm mb-6">This will apply {approvedMoves.length} approved move(s) and update the booking database.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowExecuteModal(false)} className="px-4 py-2 rounded-xl border border-blush text-warm hover:text-espresso text-sm transition">Cancel</button>
              <button onClick={executeApprovedMovesConfirmed} className="px-5 py-2 bg-sage text-cream rounded-xl text-sm font-semibold hover:bg-sage/80 transition">Execute</button>
            </div>
          </div>
        </div>
      )}

      {/* Session modal */}
      {showSessionModal && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-espresso/40 backdrop-blur-sm" onClick={closeSessionModal} />
          <div className="bg-cream border border-blush rounded-2xl p-6 z-10 w-full max-w-md card-shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-display text-xl text-espresso">{selectedSession.time} Session</h4>
                <p className="text-warm text-sm">{selectedSession.session_id}</p>
              </div>
              <button onClick={closeSessionModal} className="text-warm hover:text-espresso transition text-lg leading-none">✕</button>
            </div>
            <div className="mb-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-warm">Occupancy</span>
                <span className="text-espresso font-medium">{selectedSession.current_pax} / {selectedSession.min_pax} guests</span>
              </div>
              <FillBar current={selectedSession.current_pax} min={selectedSession.min_pax} max={selectedSession.min_pax + 2} />
              <div className="mt-2"><StatusPill status={selectedSession.status} /></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { handleApproveMove(selectedSession.session_id); closeSessionModal() }} className="flex-1 px-4 py-2 bg-terracotta text-cream rounded-xl text-sm font-semibold hover:bg-terra2 transition">
                Approve Reschedule
              </button>
              <button onClick={() => { handleUndo(); closeSessionModal() }} className="px-4 py-2 border border-terracotta/30 text-terracotta rounded-xl text-sm hover:bg-terracotta/10 transition">Undo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
