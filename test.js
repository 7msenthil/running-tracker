const START_DATE = new Date('2026-03-30T00:00:00')

const TOTAL_WEEKS = 12
const MOCK_PLAN_WEEKS = {}

for (let w = 1; w <= 4; w++) {
  MOCK_PLAN_WEEKS[w] = [
    { dayIndex: 2, type: 'Easy',     targetKm: 4.0, notes: 'HR target: 135-140 bpm' },
    { dayIndex: 4, type: 'Easy',     targetKm: 4.0, notes: 'HR target: 135-140 bpm' },
    { dayIndex: 7, type: 'Long Run', targetKm: 6.0, notes: 'Peak 6.0 km. HR target: 135-140 bpm' },
  ]
}
console.log("Mock data built:", MOCK_PLAN_WEEKS[1])

function getWeekMonday(weekNum) {
  const d = new Date(START_DATE)
  d.setDate(d.getDate() + (weekNum - 1) * 7)
  return d
}

const today = new Date('2026-05-27T10:00:00')
const diffDays = Math.floor((today - START_DATE) / (1000*60*60*24))
const currentWk = Math.max(1, Math.min(TOTAL_WEEKS, Math.floor(diffDays / 7) + 1))
console.log("Current Week:", currentWk)
console.log("Monday of week 9:", getWeekMonday(9))

