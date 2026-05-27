'use client'

import CollapsibleSection from './CollapsibleSection'

const fmtPace = (mps) => {
  if (!mps) return '--'
  const s = 1000 / mps
  return `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`
}

const RecordCard = ({ title, value, unit, run }) => (
  <div style={{ background: 'var(--bg-card2)', padding: '16px 20px', borderRadius: 16, flex: '1 0 160px', minWidth: 160 }}>
    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{title}</div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
      <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>{unit}</span>
    </div>
    <div style={{ fontSize: '0.8rem', color: 'var(--blue)', marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {run?.name}
    </div>
    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 2 }}>
      {new Date(run?.start_date).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'})}
    </div>
  </div>
)

export default function PersonalRecords({ runs }) {
  if (!runs || runs.length === 0) return null

  // Find longest run
  const longestRun = runs.reduce((prev, current) => (prev && prev.distance > current.distance) ? prev : current, null)

  // Find best pace (for runs over 3km to filter out sprints/glitches)
  const validPaceRuns = runs.filter(r => r.distance > 3000 && r.moving_time)
  const bestPaceRun = validPaceRuns.reduce((prev, current) => {
    const prevPace = prev.distance / prev.moving_time
    const currPace = current.distance / current.moving_time
    return (prevPace > currPace) ? prev : current // Higher m/s = faster pace
  }, validPaceRuns[0])

  // Find longest duration
  const longestDuration = runs.reduce((prev, current) => (prev && prev.moving_time > current.moving_time) ? prev : current, null)

  // Find highest elevation gain
  const highestElevation = runs.reduce((prev, current) => (prev && prev.total_elevation_gain > current.total_elevation_gain) ? prev : current, null)

  // Find highest cadence
  const highestCadence = runs.reduce((prev, current) => (prev && (prev.average_cadence||0) > (current.average_cadence||0)) ? prev : current, null)

  // Find highest Max HR
  const highestMaxHr = runs.reduce((prev, current) => (prev && (prev.max_heartrate||0) > (current.max_heartrate||0)) ? prev : current, null)

  // Find highest TSS
  const highestTSS = runs.reduce((prev, current) => (prev && (prev.rtss||0) > (current.rtss||0)) ? prev : current, null)

  const fmtDur = (s) => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}h ${m}m`:`${m}m` }

  return (
    <CollapsibleSection title="Personal Records" subtitle="All-time best efforts">
      <div style={{ display: 'flex', overflowX: 'auto', gap: 16, paddingTop: 16, paddingBottom: 8 }}>
        {longestRun && <RecordCard title="Longest Distance" value={(longestRun.distance/1000).toFixed(2)} unit="km" run={longestRun} />}
        {longestDuration && <RecordCard title="Longest Duration" value={fmtDur(longestDuration.moving_time)} unit="" run={longestDuration} />}
        {bestPaceRun && <RecordCard title="Best Pace (>3km)" value={fmtPace(bestPaceRun.distance / bestPaceRun.moving_time)} unit="/km" run={bestPaceRun} />}
        {highestElevation && <RecordCard title="Highest Elevation" value={highestElevation.total_elevation_gain.toFixed(0)} unit="m" run={highestElevation} />}
        {highestCadence && highestCadence.average_cadence && <RecordCard title="Highest Cadence" value={Math.round(highestCadence.average_cadence)} unit="spm" run={highestCadence} />}
        {highestMaxHr && highestMaxHr.max_heartrate && <RecordCard title="Highest Max HR" value={Math.round(highestMaxHr.max_heartrate)} unit="bpm" run={highestMaxHr} />}
        {highestTSS && highestTSS.rtss && <RecordCard title="Highest TSS" value={Math.round(highestTSS.rtss)} unit="" run={highestTSS} />}
      </div>
    </CollapsibleSection>
  )
}
