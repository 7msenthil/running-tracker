import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import PlanClient from './PlanClient'
import { db as adminDb } from '@/lib/firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'

export const metadata = { title: 'HM Training Plan — Tracker' }

export default async function TrainingPlanPage() {
  const cookieStore = await cookies()
  const athleteId   = cookieStore.get('strava_athlete_id')?.value
  const accessToken = cookieStore.get('strava_access_token')?.value
  if (!athleteId || !accessToken) redirect('/')

  // Load runs from Firestore
  const snap = await getDocs(query(collection(adminDb, 'runs'), orderBy('start_date', 'desc')))
  const runs = []
  snap.forEach(d => runs.push(d.data()))

  return (
    <div style={{ position: 'relative', zIndex: 1, padding: '28px 28px 40px', maxWidth: 1000, margin: '0 auto' }}>
      <PlanClient runs={runs} />
    </div>
  )
}
