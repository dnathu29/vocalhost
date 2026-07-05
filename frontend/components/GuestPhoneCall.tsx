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

      mediaRecorder.ondataavailable = (event) => { audioChunksRef.current.push(event.data) }
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processAudio(audioBlob)
        stream.getTracks().forEach(t => t.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setPhase('recording')
      setStatusText('Listening...')
    } catch {
      alert('Please enable microphone access')
      setStatusText('Microphone permission required.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setPhase('processing')
      setStatusText('Transcribing...')
    }
  }

  const blobToBase64 = (audioBlob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const encoded = reader.result?.toString().split(',')[1]
        encoded ? resolve(encoded) : reject(new Error('Failed to encode audio'))
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(audioBlob)
    })

  const processAudio = async (audioBlob: Blob) => {
    try {
      setStatusText('Transcribing your voice...')
      const base64Audio = await blobToBase64(audioBlob)
      const res = await axios.post(`${API_BASE}/api/stt`, { audio_data: base64Audio })
      const text = res.data.text || ''
      setTranscript(text || 'Could not transcribe audio')
      if (text) {
        await generateAIResponse(text)
      } else {
        setStatusText('Could not hear you clearly. Try again.')
        setPhase('idle')
      }
    } catch {
      const fallback = 'Can I move to the 16:00 session instead?'
      setTranscript(fallback)
      setStatusText('Using demo transcript...')
      await generateAIResponse(fallback)
    }
  }

  const generateAIResponse = async (guestText?: string) => {
    const input = guestText ?? transcript
    if (!input) return
    try {
      setStatusText('Agent is thinking...')
      const agentRes = await axios.post(`${API_BASE}/api/run-agent`)
      const plan = agentRes.data
      let responseText: string
      const contact = plan.customers_to_contact?.[0]
      const planItem = plan.consolidation_plan?.[0]
      if (contact && planItem) {
        const proposed = planItem.to_time
          ? `We'd love to move you to the ${planItem.to_time} session for ${planItem.workshop_name}.`
          : `We need to reschedule your ${planItem.workshop_name} booking.`
        responseText = `Hi ${contact.guest_name}! ${proposed} Would that work for you?`
      } else {
        responseText = 'All sessions are confirmed — no changes needed. Have a great day!'
      }
      setAiResponse(responseText)
      setPhase('responded')
      await playTextToSpeech(responseText)
    } catch {
      setStatusText('Could not reach booking system.')
      setPhase('idle')
    }
  }

  const playTextToSpeech = async (text: string) => {
    setIsPlaying(true)
    setStatusText('Agent speaking...')
    try {
      const res = await axios.post(`${API_BASE}/api/tts`, { text })
      if (res.data.audio) {
        const format = res.data.format || 'wav'
        const audio = new Audio(`data:audio/${format};base64,${res.data.audio}`)
        audio.play()
        audio.onended = () => {
          setIsPlaying(false)
          setStatusText('Tap mic to respond')
        }
      } else {
        setIsPlaying(false)
        setStatusText('Tap mic to respond')
      }
    } catch {
      setIsPlaying(false)
      setStatusText('(Audio unavailable — text shown above)')
    }
  }

  const handleReset = () => {
    setTranscript('')
    setAiResponse('')
    setPhase('idle')
    setStatusText('Tap the mic to speak with the agent')
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">

      {/* Phone mockup */}
      <div className="flex justify-center lg:sticky lg:top-24">
        <div className="relative w-72">
          {/* Outer shell */}
          <div className="bg-gradient-to-b from-[#1c1c1e] to-[#111] rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden" style={{ height: '580px' }}>
            {/* Dynamic island */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-20 flex items-center justify-center gap-2">
              {isRecording && <span className="w-2 h-2 rounded-full bg-ember animate-pulse" />}
              {isPlaying && <span className="w-2 h-2 rounded-full bg-sage animate-pulse" />}
            </div>

            {/* Screen */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a1207] via-[#0f0e0d] to-[#0a0a0a] flex flex-col items-center justify-between p-6 pt-14 pb-8">

              {/* Caller info */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-clay to-ember mx-auto mb-3 flex items-center justify-center">
                  <span className="font-display text-ink text-xl font-bold">V</span>
                </div>
                <p className="text-parchment font-display text-xl">VocalHost Agent</p>
                <p className="text-muted text-xs mt-1">
                  {phase === 'idle' && 'Ready'}
                  {phase === 'recording' && 'Recording...'}
                  {phase === 'processing' && 'Processing...'}
                  {phase === 'responded' && 'Active call'}
                </p>
              </div>

              {/* Conversation bubble */}
              <div className="w-full space-y-3">
                {transcript && (
                  <div className="flex justify-end">
                    <div className="bg-clay/20 border border-clay/30 rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]">
                      <p className="text-parchment text-xs">{transcript}</p>
                    </div>
                  </div>
                )}
                {aiResponse && (
                  <div className="flex justify-start">
                    <div className="bg-surface border border-white/10 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%]">
                      <p className="text-parchment text-xs">{aiResponse}</p>
                    </div>
                  </div>
                )}
                {!transcript && !aiResponse && (
                  <div className="text-center">
                    <p className="text-muted text-xs">{statusText}</p>
                  </div>
                )}
                {(transcript || aiResponse) && (
                  <p className="text-muted text-xs text-center">{statusText}</p>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-5">
                {/* Reset / end call */}
                <button
                  onClick={handleReset}
                  className="w-12 h-12 rounded-full bg-ember/20 border border-ember/30 text-ember flex items-center justify-center hover:bg-ember/30 transition"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 9.6a19.79 19.79 0 0 1-3.07-8.68 2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L6.76 6.96" />
                    <line x1="23" y1="1" x2="1" y2="23" />
                  </svg>
                </button>

                {/* Mic — main CTA */}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={phase === 'processing' || isPlaying}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isRecording
                      ? 'bg-ember shadow-lg shadow-ember/30 scale-110'
                      : phase === 'processing' || isPlaying
                      ? 'bg-white/10 text-muted cursor-not-allowed'
                      : 'bg-clay shadow-lg shadow-clay/20 hover:scale-105'
                  }`}
                >
                  {isRecording ? (
                    <span className="w-4 h-4 rounded-sm bg-ink" />
                  ) : phase === 'processing' ? (
                    <span className="w-4 h-4 border-2 border-muted border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f0e0d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  )}
                </button>

                {/* Speaker replay */}
                <button
                  onClick={() => generateAIResponse()}
                  disabled={!aiResponse || isPlaying || isRecording}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition border ${
                    !aiResponse || isPlaying || isRecording
                      ? 'border-white/10 text-muted cursor-not-allowed'
                      : 'border-clay/40 text-clay hover:bg-clay/10'
                  }`}
                >
                  {isPlaying ? (
                    <span className="w-3 h-3 border-2 border-clay border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                    </svg>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Side buttons */}
          <div className="absolute right-0 top-24 w-1 h-10 bg-white/10 rounded-l-sm" />
          <div className="absolute left-0 top-20 w-1 h-8 bg-white/10 rounded-r-sm" />
          <div className="absolute left-0 top-32 w-1 h-8 bg-white/10 rounded-r-sm" />
        </div>
      </div>

      {/* Conversation log panel */}
      <div className="flex-1 max-w-lg space-y-4">
        <div>
          <p className="text-muted text-xs uppercase tracking-widest mb-1">Guest Call</p>
          <h1 className="font-display text-3xl text-parchment">Live Conversation</h1>
          <p className="text-muted text-sm mt-1">The AI agent handles rescheduling on behalf of the host.</p>
        </div>

        {/* How it works */}
        <div className="bg-surface border border-white/8 rounded-2xl p-5 space-y-3">
          {[
            { step: '1', label: 'Tap mic', desc: 'Record your message as a guest caller' },
            { step: '2', label: 'Transcribe', desc: 'Your speech is converted to text via Gradium STT' },
            { step: '3', label: 'Agent replies', desc: 'VocalHost checks bookings and responds via TTS' },
          ].map(s => (
            <div key={s.step} className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-clay/20 text-clay text-xs flex items-center justify-center shrink-0 mt-0.5">{s.step}</span>
              <div>
                <p className="text-parchment text-sm font-medium">{s.label}</p>
                <p className="text-muted text-xs">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Live transcript */}
        {(transcript || aiResponse) && (
          <div className="bg-surface border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/8">
              <p className="text-xs text-muted uppercase tracking-wider">Transcript</p>
            </div>
            <div className="p-5 space-y-3">
              {transcript && (
                <div>
                  <p className="text-xs text-muted mb-1">Guest</p>
                  <p className="text-parchment text-sm bg-clay/10 rounded-xl px-4 py-3">{transcript}</p>
                </div>
              )}
              {aiResponse && (
                <div>
                  <p className="text-xs text-muted mb-1">VocalHost Agent</p>
                  <p className="text-parchment text-sm bg-white/5 rounded-xl px-4 py-3">{aiResponse}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            phase === 'recording' ? 'bg-ember animate-pulse' :
            phase === 'processing' ? 'bg-clay animate-pulse' :
            phase === 'responded' ? 'bg-sage' : 'bg-muted'
          }`} />
          <p className="text-muted text-sm">{statusText}</p>
        </div>
      </div>
    </div>
  )
}
