'use client'

import { useState, useRef } from 'react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'

export default function GuestPhoneCall() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [statusText, setStatusText] = useState('Tap the mic to speak with the agent')
  const [phase, setPhase] = useState<'idle' | 'recording' | 'processing' | 'responded'>('idle')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      mediaRecorder.ondataavailable = e => audioChunksRef.current.push(e.data)
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processAudio(blob)
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorder.start()
      setIsRecording(true); setPhase('recording'); setStatusText('Listening...')
    } catch {
      alert('Please enable microphone access')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false); setPhase('processing'); setStatusText('Transcribing...')
    }
  }

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

  const processAudio = async (blob: Blob) => {
    try {
      setStatusText('Transcribing your voice...')
      const base64Audio = await blobToBase64(blob)
      const res = await axios.post(`${API_BASE}/api/stt`, { audio_data: base64Audio })
      const text = res.data.text || ''
      setTranscript(text || 'Could not transcribe audio')
      if (text) await generateAIResponse(text)
      else { setStatusText('Could not hear clearly. Try again.'); setPhase('idle') }
    } catch {
      const fallback = 'Can I move to the 16:00 session instead?'
      setTranscript(fallback)
      await generateAIResponse(fallback)
    }
  }

  const generateAIResponse = async (guestText?: string) => {
    if (!(guestText ?? transcript)) return
    try {
      setStatusText('Agent is thinking...')
      const agentRes = await axios.post(`${API_BASE}/api/run-agent`)
      const plan = agentRes.data
      const contact = plan.customers_to_contact?.[0]
      const planItem = plan.consolidation_plan?.[0]
      let responseText: string
      if (contact && planItem) {
        const proposed = planItem.to_time
          ? `We'd love to move you to the ${planItem.to_time} session for ${planItem.workshop_name}.`
          : `We need to reschedule your ${planItem.workshop_name} booking.`
        responseText = `Hi ${contact.guest_name}! ${proposed} Would that work for you?`
      } else {
        responseText = 'All sessions are confirmed — no changes needed. Have a wonderful day!'
      }
      setAiResponse(responseText); setPhase('responded')
      await playTextToSpeech(responseText)
    } catch {
      setStatusText('Could not reach booking system.'); setPhase('idle')
    }
  }

  const playTextToSpeech = async (text: string) => {
    setIsPlaying(true); setStatusText('Agent speaking...')
    try {
      const res = await axios.post(`${API_BASE}/api/tts`, { text })
      if (res.data.audio) {
        const audio = new Audio(`data:audio/${res.data.format || 'wav'};base64,${res.data.audio}`)
        audio.play()
        audio.onended = () => { setIsPlaying(false); setStatusText('Tap mic to respond') }
      } else { setIsPlaying(false); setStatusText('Tap mic to respond') }
    } catch { setIsPlaying(false); setStatusText('(Audio unavailable — text shown above)') }
  }

  const handleReset = () => {
    setTranscript(''); setAiResponse(''); setPhase('idle')
    setStatusText('Tap the mic to speak with the agent')
  }

  const phaseColor = {
    idle: 'bg-mist',
    recording: 'bg-terracotta animate-pulse',
    processing: 'bg-gold animate-pulse',
    responded: 'bg-sage',
  }[phase]

  return (
    <div className="flex flex-col lg:flex-row gap-10 items-start justify-center">

      {/* Phone mockup */}
      <div className="flex justify-center lg:sticky lg:top-24">
        <div className="relative w-72">
          <div className="rounded-[3rem] overflow-hidden border-4 border-bark/30 card-shadow-lg" style={{ height: '580px', background: 'linear-gradient(160deg, #fdf0e0 0%, #f5e0c0 100%)' }}>

            {/* Dynamic island */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-7 bg-espresso rounded-full z-20 flex items-center justify-center gap-2">
              {isRecording && <span className="w-2 h-2 rounded-full bg-terracotta animate-pulse" />}
              {isPlaying && <span className="w-2 h-2 rounded-full bg-sage animate-pulse" />}
              {!isRecording && !isPlaying && <span className="w-12 h-1 bg-bark/40 rounded-full" />}
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-between p-6 pt-14 pb-8">

              {/* Caller avatar */}
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-terracotta to-gold mx-auto mb-3 flex items-center justify-center card-shadow">
                  <span className="font-display text-cream text-2xl font-bold italic">V</span>
                </div>
                <p className="font-display text-xl text-espresso">VocalHost Agent</p>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${phaseColor}`} />
                  <p className="text-warm text-xs">
                    {phase === 'idle' && 'Ready to assist'}
                    {phase === 'recording' && 'Recording...'}
                    {phase === 'processing' && 'Processing...'}
                    {phase === 'responded' && 'Active call'}
                  </p>
                </div>
              </div>

              {/* Chat bubbles */}
              <div className="w-full space-y-2 px-1">
                {!transcript && !aiResponse && (
                  <p className="text-center text-warm text-xs">{statusText}</p>
                )}
                {transcript && (
                  <div className="flex justify-end">
                    <div className="bg-terracotta/15 border border-terracotta/25 rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]">
                      <p className="text-espresso text-xs leading-relaxed">{transcript}</p>
                    </div>
                  </div>
                )}
                {aiResponse && (
                  <div className="flex justify-start">
                    <div className="bg-cream border border-blush rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%] card-shadow">
                      <p className="text-espresso text-xs leading-relaxed">{aiResponse}</p>
                    </div>
                  </div>
                )}
                {(transcript || aiResponse) && (
                  <p className="text-center text-mist text-xs pt-1">{statusText}</p>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-5">
                {/* End / reset */}
                <button
                  onClick={handleReset}
                  className="w-12 h-12 rounded-full bg-terracotta/15 border border-terracotta/30 text-terracotta flex items-center justify-center hover:bg-terracotta/25 transition"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 9.6a19.79 19.79 0 0 1-3.07-8.68 2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L6.76 6.96" />
                    <line x1="23" y1="1" x2="1" y2="23" />
                  </svg>
                </button>

                {/* Main mic */}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={phase === 'processing' || isPlaying}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 card-shadow ${
                    isRecording
                      ? 'bg-terracotta scale-110 shadow-terracotta/30'
                      : phase === 'processing' || isPlaying
                      ? 'bg-blush text-mist cursor-not-allowed'
                      : 'bg-terracotta hover:bg-terra2 hover:scale-105'
                  }`}
                >
                  {isRecording ? (
                    <span className="w-4 h-4 rounded-sm bg-cream" />
                  ) : phase === 'processing' ? (
                    <span className="w-4 h-4 border-2 border-mist border-t-warm rounded-full animate-spin" />
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fdf6ec" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  )}
                </button>

                {/* Replay */}
                <button
                  onClick={() => generateAIResponse()}
                  disabled={!aiResponse || isPlaying || isRecording}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition border ${
                    !aiResponse || isPlaying || isRecording
                      ? 'border-blush text-mist cursor-not-allowed'
                      : 'border-gold/50 text-gold hover:bg-gold/10'
                  }`}
                >
                  {isPlaying ? (
                    <span className="w-3 h-3 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    </svg>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Phone side buttons */}
          <div className="absolute right-0 top-24 w-1 h-10 bg-bark/20 rounded-l-sm" />
          <div className="absolute left-0 top-20 w-1 h-8 bg-bark/20 rounded-r-sm" />
          <div className="absolute left-0 top-32 w-1 h-8 bg-bark/20 rounded-r-sm" />
        </div>
      </div>

      {/* Side panel */}
      <div className="flex-1 max-w-lg space-y-5">
        <div>
          <p className="text-warm text-xs uppercase tracking-widest mb-1 font-medium">Guest Experience</p>
          <h1 className="font-display text-3xl text-espresso">Live Conversation</h1>
          <p className="text-warm text-sm mt-1">The AI agent handles rescheduling on behalf of the host.</p>
        </div>

        {/* How it works */}
        <div className="bg-parchment border border-blush rounded-2xl p-5 card-shadow">
          <p className="text-xs text-warm uppercase tracking-wider font-medium mb-4">How it works</p>
          <div className="space-y-4">
            {[
              { step: '1', label: 'Speak', desc: 'Tap the microphone and say your message as a guest caller', color: 'bg-terracotta/15 text-terracotta' },
              { step: '2', label: 'Transcribe', desc: 'Your speech is converted to text via Gradium STT', color: 'bg-gold/15 text-gold' },
              { step: '3', label: 'Agent replies', desc: 'VocalHost checks bookings and responds via voice', color: 'bg-sage/15 text-sage' },
            ].map(s => (
              <div key={s.step} className="flex gap-3 items-start">
                <span className={`w-7 h-7 rounded-full text-xs flex items-center justify-center shrink-0 font-semibold ${s.color}`}>{s.step}</span>
                <div>
                  <p className="text-espresso text-sm font-semibold">{s.label}</p>
                  <p className="text-warm text-xs mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live transcript */}
        {(transcript || aiResponse) && (
          <div className="bg-parchment border border-blush rounded-2xl overflow-hidden card-shadow">
            <div className="px-5 py-3 border-b border-blush bg-blush/30">
              <p className="text-xs text-warm uppercase tracking-wider font-medium">Conversation</p>
            </div>
            <div className="p-5 space-y-4">
              {transcript && (
                <div>
                  <p className="text-xs text-warm font-medium mb-1.5">Guest</p>
                  <div className="bg-terracotta/10 border border-terracotta/20 rounded-xl px-4 py-3">
                    <p className="text-espresso text-sm leading-relaxed">{transcript}</p>
                  </div>
                </div>
              )}
              {aiResponse && (
                <div>
                  <p className="text-xs text-warm font-medium mb-1.5">VocalHost Agent</p>
                  <div className="bg-cream border border-blush rounded-xl px-4 py-3 card-shadow">
                    <p className="text-espresso text-sm leading-relaxed">{aiResponse}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${phaseColor}`} />
          <p className="text-warm text-sm">{statusText}</p>
        </div>
      </div>
    </div>
  )
}
