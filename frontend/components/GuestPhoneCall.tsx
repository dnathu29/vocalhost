'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'

export interface CallContext {
  booking_id: string
  guest_name: string
  from_session_id: string
  from_time: string
  to_session_id: string
  to_time: string
  workshop_name: string
  incentive?: string
}

interface Message {
  role: 'guest' | 'agent'
  text: string
}

type Phase = 'connecting' | 'agent-speaking' | 'listening' | 'processing' | 'ended'

interface Props {
  context: CallContext
  onClose: () => void
}

export default function GuestPhoneCall({ context, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('connecting')
  const [messages, setMessages] = useState<Message[]>([])
  const [statusText, setStatusText] = useState('Connecting...')
  const [callDuration, setCallDuration] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const endedRef = useRef(false)
  const startedRef = useRef(false) // prevents Strict Mode double-fire

  // --- helpers ---

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const encoded = reader.result?.toString().split(',')[1]
        encoded ? resolve(encoded) : reject(new Error('encode failed'))
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })

  const playTTS = (text: string): Promise<void> =>
    new Promise(async (resolve) => {
      try {
        const res = await axios.post(`${API_BASE}/api/tts`, { text })
        if (res.data.audio) {
          const audio = new Audio(`data:audio/${res.data.format || 'wav'};base64,${res.data.audio}`)
          audio.onended = () => resolve()
          audio.onerror = () => resolve()
          audio.play()
          return
        }
      } catch {}
      // If TTS fails, wait a beat so the text is visible before continuing
      setTimeout(resolve, 2000)
    })

  const endCall = useCallback(async () => {
    if (endedRef.current) return
    endedRef.current = true
    if (timerRef.current) clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    setPhase('ended')
    setStatusText('Call ended')
    await axios.post(`${API_BASE}/api/negotiate/${context.booking_id}/reset`).catch(() => {})
  }, [context.booking_id])

  // One full turn: call /api/negotiate, speak reply, then start listening
  const agentTurn = useCallback(async (guestMessage: string | null) => {
    if (endedRef.current) return
    setPhase('processing')
    setStatusText('Agent thinking...')
    try {
      const payload: Record<string, unknown> = {
        booking_id: context.booking_id,
        guest_message: guestMessage,
        guest_name: context.guest_name,
        from_session_id: context.from_session_id,
        from_time: context.from_time,
        to_session_id: context.to_session_id,
        to_time: context.to_time,
        workshop_name: context.workshop_name,
        incentive: context.incentive ?? 'a complimentary drink voucher',
      }
      const res = await axios.post(`${API_BASE}/api/negotiate`, payload)
      const { agent_message, call_ended } = res.data as { agent_message: string; tool_results: unknown[]; call_ended: boolean }

      setMessages(prev => [...prev, { role: 'agent', text: agent_message }])
      setPhase('agent-speaking')
      setStatusText('Agent speaking...')
      await playTTS(agent_message)

      if (call_ended) { await endCall(); return }

      if (!endedRef.current) startListening()
    } catch {
      setStatusText('Connection error — ending call.')
      await endCall()
    }
  }, [context, endCall])

  const startListening = useCallback(() => {
    if (endedRef.current) return
    setPhase('listening')
    setStatusText('Listening — speak now...')

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = e => audioChunksRef.current.push(e.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (endedRef.current) return
        setPhase('processing')
        setStatusText('Transcribing...')
        try {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          const base64 = await blobToBase64(blob)
          const sttRes = await axios.post(`${API_BASE}/api/stt`, { audio_data: base64 })
          const text: string = sttRes.data.text || ''
          if (text) {
            setMessages(prev => [...prev, { role: 'guest', text }])
            await agentTurn(text)
          } else {
            // Nothing heard — listen again
            startListening()
          }
        } catch {
          // STT failed — listen again
          startListening()
        }
      }

      recorder.start()

      // Auto-stop after 6 seconds of listening
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, 6000)
    }).catch(() => {
      setStatusText('Microphone unavailable — tap End to close.')
    })
  }, [agentTurn])

  const handleManualStop = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }

  // Kick off: agent speaks first
  useEffect(() => {
    // Guard against React 18 Strict Mode double-invoke
    if (startedRef.current) return
    startedRef.current = true
    endedRef.current = false
    timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)
    agentTurn(null)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formatDuration = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const phaseColor: Record<Phase, string> = {
    connecting: 'bg-mist animate-pulse',
    'agent-speaking': 'bg-sage animate-pulse',
    listening: 'bg-terracotta animate-pulse',
    processing: 'bg-gold animate-pulse',
    ended: 'bg-mist',
  }

  const phaseLabel: Record<Phase, string> = {
    connecting: 'Connecting...',
    'agent-speaking': 'Agent speaking',
    listening: 'Listening...',
    processing: 'Processing...',
    ended: 'Call ended',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso/50 backdrop-blur-sm">
      <div className="bg-cream border border-blush rounded-3xl card-shadow-lg w-full max-w-sm overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="bg-gradient-to-r from-terracotta to-terra2 px-6 py-5 text-cream">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${phaseColor[phase]}`} />
              <span className="text-xs font-medium text-cream/80">{phaseLabel[phase]}</span>
            </div>
            <span className="text-xs font-mono text-cream/70">{formatDuration(callDuration)}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-cream/20 flex items-center justify-center">
              <span className="font-display text-cream text-xl font-bold italic">V</span>
            </div>
            <div>
              <p className="font-display text-lg leading-tight">VocalHost Agent</p>
              <p className="text-cream/70 text-xs">calling {context.guest_name}</p>
            </div>
          </div>
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.length === 0 && (
            <div className="flex justify-center items-center h-24">
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-terracotta animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'guest' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.role === 'guest'
                  ? 'bg-terracotta/15 border border-terracotta/25 text-espresso rounded-tr-sm'
                  : 'bg-parchment border border-blush text-espresso rounded-tl-sm card-shadow'
              }`}>
                <p className={`text-xs font-medium mb-1 ${m.role === 'guest' ? 'text-terracotta' : 'text-warm'}`}>
                  {m.role === 'guest' ? context.guest_name : 'VocalHost Agent'}
                </p>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Status + controls */}
        <div className="border-t border-blush px-4 py-4 bg-parchment/50">
          <p className="text-center text-warm text-xs mb-4">{statusText}</p>
          <div className="flex items-center justify-center gap-6">

            {/* Manual stop recording */}
            <button
              onClick={handleManualStop}
              disabled={phase !== 'listening'}
              className={`w-12 h-12 rounded-full border flex items-center justify-center transition ${
                phase === 'listening'
                  ? 'border-terracotta/50 text-terracotta hover:bg-terracotta/10'
                  : 'border-blush text-mist cursor-not-allowed'
              }`}
              title="Send now"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>

            {/* Mic indicator (not interactive — auto-managed) */}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center card-shadow ${
              phase === 'listening' ? 'bg-terracotta' : phase === 'agent-speaking' ? 'bg-sage' : 'bg-blush'
            }`}>
              {phase === 'listening' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fdf6ec" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              ) : phase === 'agent-speaking' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fdf6ec" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                </svg>
              ) : phase === 'ended' ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8a6545" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 9.6a19.79 19.79 0 0 1-3.07-8.68 2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L6.76 6.96"/><line x1="23" y1="1" x2="1" y2="23"/>
                </svg>
              ) : (
                <span className="w-5 h-5 border-2 border-mist border-t-warm rounded-full animate-spin" />
              )}
            </div>

            {/* End call */}
            <button
              onClick={() => endCall().then(onClose)}
              className="w-12 h-12 rounded-full bg-terracotta/15 border border-terracotta/30 text-terracotta flex items-center justify-center hover:bg-terracotta/25 transition"
              title="End call"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 9.6a19.79 19.79 0 0 1-3.07-8.68 2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L6.76 6.96"/>
                <line x1="23" y1="1" x2="1" y2="23"/>
              </svg>
            </button>
          </div>

          {phase === 'ended' && (
            <button
              onClick={onClose}
              className="mt-4 w-full py-2.5 bg-terracotta text-cream rounded-xl text-sm font-semibold hover:bg-terra2 transition"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
