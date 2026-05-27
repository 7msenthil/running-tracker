'use client'

import { START_DATE, TOTAL_WEEKS, MOCK_PLAN_WEEKS } from '@/lib/planData'
import CollapsibleSection from './CollapsibleSection'

const fmtDur  = (s) => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}h ${m}m`:`${m}m` }

export default function ThisWeekWidget({ runs }) {
  const today = new Date()
  const diffDays = Math.floor((today - START_DATE) / (1000*60*60*24))
  const week = Math.max(1, Math.min(TOTAL_WEEKS, Math.floor(diffDays / 7) + 1))
  
  const weekMonday = new Date(today)
  const dayOfWeek = today.getDay() || 7
  weekMonday.setDate(today.getDate() - dayOfWeek + 1)
  weekMonday.setHours(0,0,0,0)
  const weekSunday = new Date(weekMonday)
  weekSunday.setDate(weekMonday.getDate() + 6)
  weekSunday.setHours(23,59,59,999)

  const thisWeekRuns = runs.filter(r => {
    const d = new Date(r.start_date)
    return d >= weekMonday && d <= weekSunday
  })
  
  const wkKm = thisWeekRuns.reduce((a,r) => a + (r.distance||0)/1000, 0)
  const wkTime = thisWeekRuns.reduce((a,r) => a + (r.moving_time||0), 0)
  const wkHr = thisWeekRuns.length ? Math.round(thisWeekRuns.reduce((a,r) => a + (r.average_heartrate||0), 0) / thisWeekRuns.length) : '--'
  const wkPaceSecs = wkKm > 0 ? (wkTime / wkKm) : null
  const wkPace = wkPaceSecs ? `${Math.floor(wkPaceSecs/60)}:${String(Math.round(wkPaceSecs%60)).padStart(2,'0')}` : '--'
  
  const planSlots = MOCK_PLAN_WEEKS[week] || []
  const plannedKm = planSlots.reduce((a, s) => a + (s.targetKm || 0), 0)

  // Find next run: check how many significant runs have been completed this week
  const completedRunsCount = thisWeekRuns.filter(r => r.distance > 2000).length
  const nextRun = planSlots[completedRunsCount] || null
  
  const progressPercent = plannedKm > 0 ? Math.min(100, Math.round((wkKm / plannedKm) * 100)) : 100

  return (
    <CollapsibleSection title={`Week ${week} Summary`} subtitle="Half Marathon Plan">
      <div style={{ display: 'flex', overflowX: 'auto', gap: 16, paddingTop: 16, paddingBottom: 8 }}>
        
        {/* Distance Progress */}
        <div style={{ background: 'var(--bg-card2)', padding: 20, borderRadius: 16, flex: '1 0 200px', minWidth: 200 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Distance</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--blue)', lineHeight: 1 }}>{wkKm.toFixed(1)}</span>
            <span style={{ fontSize: '1rem', color: 'var(--text-2)' }}>/ {plannedKm.toFixed(1)} km</span>
          </div>
          <div style={{ height: 6, background: 'var(--fill-2)', borderRadius: 3, marginTop: 16, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPercent}%`, background: 'var(--blue)', borderRadius: 3, transition: 'width 0.5s' }} />
          </div>
        </div>

        {/* Duration */}
        <div style={{ background: 'var(--bg-card2)', padding: 20, borderRadius: 16, flex: '1 0 140px', minWidth: 140 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Duration</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-1)' }}>{wkTime > 0 ? fmtDur(wkTime) : '--'}</div>
        </div>

        {/* Runs */}
        <div style={{ background: 'var(--bg-card2)', padding: 20, borderRadius: 16, flex: '1 0 100px', minWidth: 100 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Runs</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-1)' }}>{thisWeekRuns.length}</div>
        </div>

        {/* Avg HR */}
        <div style={{ background: 'var(--bg-card2)', padding: 20, borderRadius: 16, flex: '1 0 140px', minWidth: 140 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Avg Heart Rate</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--red)' }}>{wkHr} <span style={{fontSize:'0.8rem', color:'var(--text-2)', fontWeight:500}}>bpm</span></div>
        </div>

        {/* Avg Pace */}
        <div style={{ background: 'var(--bg-card2)', padding: 20, borderRadius: 16, flex: '1 0 140px', minWidth: 140 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Avg Pace</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-1)' }}>{wkPace} <span style={{fontSize:'0.8rem', color:'var(--text-2)', fontWeight:500}}>/km</span></div>
        </div>

        {/* Next Run */}
        <div style={{ background: 'var(--bg-card2)', padding: 20, borderRadius: 16, flex: '1 0 200px', minWidth: 200 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Next Run</div>
          {nextRun ? (
            <div>
              <div style={{ display: 'inline-block', padding: '4px 10px', background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, marginBottom: 10 }}>
                {nextRun.type}
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
                {nextRun.targetKm} km
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.4 }}>
                {nextRun.notes}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-3)', fontSize: '0.9rem', marginTop: 10 }}>
              All planned runs completed for this week!
            </div>
          )}
        </div>

      </div>
    </CollapsibleSection>
  )
}
