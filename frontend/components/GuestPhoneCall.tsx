'use client'

import { useState, useRef } from 'react'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'

export default function GuestPhoneCall() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        await processAudio(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (error) {
      console.error('Error accessing microphone:', error)
      alert('Please enable microphone access')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const processAudio = async (audioBlob: Blob) => {
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(',')[1]
        
        // Send to STT endpoint
        const res = await axios.post(
          `${API_BASE}/api/stt`,
          { audio_data: base64Audio },
          { headers: { 'Content-Type': 'application/json' } }
        )
        
        setTranscript(res.data.text || 'No response from STT')
      }
      reader.readAsDataURL(audioBlob)
    } catch (error) {
      console.error('Error processing audio:', error)
      setTranscript('Error processing audio')
    }
  }

  const generateAIResponse = async () => {
    if (!transcript) return

    try {
      // Mock AI response for demo (replace with actual LLM later)
      const mockResponse = 'What time does the 16:00 session end?'
      setAiResponse(mockResponse)
      
      // Play TTS
      await playTextToSpeech(mockResponse)
    } catch (error) {
      console.error('Error generating response:', error)
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
        // Gradium TTS returns WAV bytes (see backend /api/tts, format: "wav")
        const format = res.data.format || 'wav'
        const audio = new Audio(`data:audio/${format};base64,${res.data.audio}`)
        audio.play()
        audio.onended = () => setIsPlaying(false)
      }
    } catch (error) {
      console.error('Error playing TTS:', error)
      setIsPlaying(false)
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
                <p className="text-center opacity-75">Start by clicking the microphone button...</p>
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
              >
                {isPlaying ? '⏳' : '🔊'}
              </button>

              <button className="w-16 h-16 rounded-full flex items-center justify-center text-2xl bg-red-600 shadow-lg shadow-red-400 hover:scale-110 transition transform">
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
