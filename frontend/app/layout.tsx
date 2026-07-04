import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VocalHost - AI Workshop Booking',
  description: 'AI-powered workshop booking platform with voice negotiation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
