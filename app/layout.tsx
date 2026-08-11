import type { Metadata, Viewport } from 'next'
import { Toaster } from "@/components/ui/toast"
import './globals.css'

export const metadata: Metadata = {
  title: 'UNET Connect',
  description: 'Connect, share, and explore content on Muro',
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f7ff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1419' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="bg-background">
      <body className="antialiased flex min-h-screen flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  )
}