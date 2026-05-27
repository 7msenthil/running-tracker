import './globals.css'

export const metadata = {
  title: 'Tracker — Running Analytics',
  description: 'Premium Strava running dashboard with PMC, HR Zones, Aerobic Decoupling and more.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="strava">
      <body>
        {children}
      </body>
    </html>
  )
}
