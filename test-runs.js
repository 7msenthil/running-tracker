import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import fs from 'fs'

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json'))
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

async function main() {
  const runs = []
  const snap = await db.collection('runs').orderBy('start_date', 'desc').get()
  snap.forEach(d => runs.push(d.data()))

  const nineKmRuns = runs.filter(r => r.distance > 8000 && r.distance < 11000)
  console.log("Found", nineKmRuns.length, "runs between 8km and 11km:")
  nineKmRuns.forEach(r => {
    console.log(`- Date: ${r.start_date}, Distance: ${(r.distance/1000).toFixed(2)}km`)
  })
}
main()
