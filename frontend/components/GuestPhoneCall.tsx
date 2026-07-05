'use client'

import { useState, useRef } from 'react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'

export default function GuestPhoneCall() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [statusText, setStatusText] = useState('Start by clicking the microphone button...')
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processAudio(audioBlob)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setStatusText('Recording... click stop when done.')
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Please enable microphone access')
      setStatusText('Microphone permission is required to continue.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setStatusText('Processing your audio...')
    }
  }

  const blobToBase64 = async (audioBlob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result?.toString() || ''
        const encoded = result.split(',')[1]
        if (!encoded) {
          reject(new Error('Failed to encode audio'))
          return
        }
        resolve(encoded)
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(audioBlob)
    })
  }

  const processAudio = async (audioBlob: Blob) => {
    try {
      setStatusText('Uploading audio for transcription...')
      const base64Audio = await blobToBase64(audioBlob)

      const res = await axios.post(
        `${API_BASE}/api/stt`,
        { audio_data: base64Audio },
        { headers: { 'Content-Type': 'application/json' } }
      )

      const text = res.data.text || 'No response from STT'
      setTranscript(text)
      setStatusText('Transcript ready. Press speaker for AI reply.')
    } catch (error) {
      console.error('Error processing audio:', error)
      const fallback = 'Can I move to the 16:00 session instead?'
      setTranscript(fallback)
      setStatusText('Backend unavailable. Using demo transcript.')
    }
  }

  const generateAIResponse = async () => {
    if (!transcript) return

    try {
      setStatusText('Agent is thinking...')
      const agentRes = await axios.post(`${API_BASE}/api/run-agent`)
      const plan = agentRes.data

      let responseText: string
      if (plan.customers_to_contact?.length > 0) {
        const c = plan.customers_to_contact[0]
        const proposed = c.proposed_time
          ? `We'd love to move you to the ${c.proposed_time} session for ${c.workshop_name}.`
          : `We need to reschedule your ${c.workshop_name} booking.`
        responseText = `Hi ${c.guest_name}! ${proposed} Would that work for you?`
      } else {
        responseText = 'All sessions are confirmed — no changes needed. Have a great day!'
      }

      setAiResponse(responseText)
      setStatusText('Agent response generated. Playing audio...')
      await playTextToSpeech(responseText)
    } catch (error) {
      console.error('Error generating response:', error)
      setStatusText('Could not reach booking system. Try again.')
    }
  }

  const playTextToSpeech = async (text: string) => {
    setIsPlaying(true)
    try {
      const res = await axios.post(
        `${API_BASE}/api/tts`,
        { text },
        { headers: { 'Content-Type': 'application/json' } }
      )
      
      if (res.data.audio) {
        const format = res.data.format || 'wav'
        const audio = new Audio(`data:audio/${format};base64,${res.data.audio}`)
        audio.play()
        audio.onended = () => {
          setIsPlaying(false)
          setStatusText('Call step complete. Record another message to continue.')
        }
      } else {
        setIsPlaying(false)
        setStatusText('TTS returned no audio.')
      }
    } catch (error) {
      console.error('Error playing TTS:', error)
      setIsPlaying(false)
      setStatusText('TTS service unavailable. Displaying text only.')
    }
  }

  return (
    <div className="space-y-8">
      {/* Phone Frame */}
      <div className="flex justify-center">
        <div className="w-96 h-screen max-h-96 bg-black rounded-3xl shadow-2xl p-3 relative">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-black rounded-b-3xl w-40 h-7 z-10"></div>
          
          {/* Phone Content */}
          <div className="w-full h-full bg-gradient-to-b from-blue-500 to-blue-600 rounded-2xl flex flex-col items-center justify-center p-6 text-white">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Incoming Call</h2>
              <p className="text-xl">VocalHost Agent</p>
              <p className="text-sm opacity-75 mt-2">00:45</p>
            </div>

            {/* Call Status */}
            <div className="bg-white bg-opacity-20 rounded-lg p-4 w-full mb-8 min-h-24">
              {transcript && (
                <div className="mb-4">
                  <p className="text-sm opacity-75">You said:</p>
                  <p className="text-lg font-semibold">{transcript}</p>
                </div>
              )}
              {aiResponse && (
                <div>
                  <p className="text-sm opacity-75">Agent says:</p>
                  <p className="text-lg font-semibold">{aiResponse}</p>
                </div>
              )}
              {!transcript && !aiResponse && (
                <p className="text-center opacity-75">{statusText}</p>
              )}
              {(transcript || aiResponse) && (
                <p className="text-xs opacity-70 mt-4">{statusText}</p>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition transform hover:scale-110 ${
                  isRecording
                    ? 'bg-red-500 shadow-lg shadow-red-400'
                    : 'bg-green-500 shadow-lg shadow-green-400'
                }`}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isRecording ? '⏹️' : '🎤'}
              </button>

              <button
                onClick={generateAIResponse}
                disabled={!transcript || isPlaying}
                className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition transform hover:scale-110 ${
                  isPlaying || !transcript
                    ? 'bg-gray-400'
                    : 'bg-purple-500 shadow-lg shadow-purple-400'
                }`}
                aria-label="Play AI response"
              >
                {isPlaying ? '⏳' : '🔊'}
              </button>

              <button
                onClick={() => { setTranscript(''); setAiResponse(''); setStatusText('Ready.') }}
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl bg-red-600 shadow-lg shadow-red-400 hover:scale-110 transition transform"
                aria-label="Clear"
              >
                ❌
              </button>
            </div>

            {/* Accept Call Info */}
            <p className="text-xs opacity-50 mt-8">Slide up to answer</p>
          </div>
        </div>
      </div>

      {/* Debug Panel */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-2xl font-bold mb-4">Debug Panel</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-100 p-4 rounded">
            <p className="text-sm text-gray-600">Recording Status:</p>
            <p className="font-bold">{isRecording ? '🔴 RECORDING' : '⚫ IDLE'}</p>
          </div>
          <div className="bg-gray-100 p-4 rounded">
            <p className="text-sm text-gray-600">Playing Audio:</p>
            <p className="font-bold">{isPlaying ? '🔊 YES' : '🔇 NO'}</p>
          </div>
          <div className="bg-gray-100 p-4 rounded col-span-2">
            <p className="text-sm text-gray-600">Transcript:</p>
            <p className="font-mono text-sm">{transcript || '(empty)'}</p>
          </div>
          <div className="bg-gray-100 p-4 rounded col-span-2">
            <p className="text-sm text-gray-600">AI Response:</p>
            <p className="font-mono text-sm">{aiResponse || '(empty)'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
