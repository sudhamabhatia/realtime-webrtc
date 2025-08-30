export const metadata = {
  title: 'Realtime WebRTC Demo',
  description: 'Next.js + OpenAI Realtime WebRTC',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}

