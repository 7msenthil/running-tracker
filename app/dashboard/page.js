import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import DashboardClient from './DashboardClient'

export default async function Dashboard() {
  const cookieStore = await cookies()
  const athleteId = cookieStore.get('strava_athlete_id')?.value
  const accessToken = cookieStore.get('strava_access_token')?.value

  if (!athleteId || !accessToken) {
    redirect('/')
  }

  return <DashboardClient athleteId={athleteId} accessToken={accessToken} />
}
