export const START_DATE = new Date('2026-03-30T00:00:00')
export const TOTAL_WEEKS = 12

export const MOCK_PLAN_WEEKS = {}

// Month 1: W1-W4
for (let w = 1; w <= 4; w++) {
  MOCK_PLAN_WEEKS[w] = [
    { dayIndex: 2, type: 'Easy',     targetKm: 4.0, notes: 'HR target: 135–140 bpm' },
    { dayIndex: 4, type: 'Easy',     targetKm: 4.0, notes: 'HR target: 135–140 bpm' },
    { dayIndex: 7, type: 'Long Run', targetKm: 6.0, notes: 'Peak 6.0 km. HR target: 135–140 bpm' },
  ]
}

// Month 2: W5-W8
MOCK_PLAN_WEEKS[5] = [
  { dayIndex: 2, type: 'Easy',     targetKm: 4.6, notes: 'Easy: 135–140 bpm' },
  { dayIndex: 4, type: 'Easy',     targetKm: 4.6, notes: 'Easy: 135–140 bpm' },
  { dayIndex: 7, type: 'Long Run', targetKm: 6.0, notes: 'Long: Strictly < 150 bpm. Walk 30s if breached.' },
]
MOCK_PLAN_WEEKS[6] = [
  { dayIndex: 2, type: 'Easy',     targetKm: 5.0, notes: 'Easy: 135–140 bpm' },
  { dayIndex: 4, type: 'Easy',     targetKm: 5.0, notes: 'Easy: 135–140 bpm' },
  { dayIndex: 7, type: 'Long Run', targetKm: 7.5, notes: 'Long: Strictly < 150 bpm. Walk 30s if breached.' },
]
MOCK_PLAN_WEEKS[7] = [
  { dayIndex: 2, type: 'Easy',     targetKm: 5.5, notes: 'Easy: 135–140 bpm' },
  { dayIndex: 4, type: 'Easy',     targetKm: 5.5, notes: 'Easy: 135–140 bpm' },
  { dayIndex: 7, type: 'Long Run', targetKm: 9.0, notes: 'Long: Strictly < 150 bpm. Walk 30s if breached.' },
]
MOCK_PLAN_WEEKS[8] = [
  { dayIndex: 2, type: 'Easy',     targetKm: 4.0, notes: 'Recovery: Ceiling drops to 140 bpm' },
  { dayIndex: 4, type: 'Easy',     targetKm: 4.0, notes: 'Recovery: Ceiling drops to 140 bpm' },
  { dayIndex: 7, type: 'Long Run', targetKm: 6.0, notes: 'Recovery: Ceiling 145 bpm' },
]

// Month 3: W9-W12
MOCK_PLAN_WEEKS[9] = [
  { dayIndex: 2, type: 'Easy',     targetKm: 5.5, notes: 'Easy run' },
  { dayIndex: 4, type: 'Tempo',    targetKm: 5.0, notes: '1.5km + 2.0km + 1.5km' },
  { dayIndex: 7, type: 'Long Run', targetKm: 9.0, notes: 'Long Run' },
]
MOCK_PLAN_WEEKS[10] = [
  { dayIndex: 2, type: 'Easy',     targetKm: 5.5, notes: 'Easy run' },
  { dayIndex: 4, type: 'Tempo',    targetKm: 5.5, notes: '1.5km + 2.5km + 1.5km' },
  { dayIndex: 7, type: 'Long Run', targetKm: 11.0, notes: 'Long Run' },
]
MOCK_PLAN_WEEKS[11] = [
  { dayIndex: 2, type: 'Easy',     targetKm: 5.5, notes: 'Peak Week' },
  { dayIndex: 4, type: 'Tempo',    targetKm: 6.5, notes: '2.0km + 3.0km + 1.5km' },
  { dayIndex: 7, type: 'Long Run', targetKm: 13.0, notes: 'Peak Long Run' },
]
MOCK_PLAN_WEEKS[12] = [
  { dayIndex: 2, type: 'Easy',     targetKm: 4.0, notes: 'Recovery' },
  { dayIndex: 4, type: 'Easy',     targetKm: 4.0, notes: 'Recovery (No tempo)' },
  { dayIndex: 7, type: 'Long Run', targetKm: 8.0, notes: 'Taper Long Run' },
]
