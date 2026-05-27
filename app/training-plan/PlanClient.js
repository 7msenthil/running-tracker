'use client'

import { useState } from 'react'
import { START_DATE, TOTAL_WEEKS, MOCK_PLAN_WEEKS } from '@/lib/planData'

const getWeekMonday = (weekNum) => {
  const d = new Date(START_DATE)
  d.setDate(d.getDate() + (weekNum - 1) * 7)
  return d
}

const getWeekSunday = (weekMonday) => {
  const d = new Date(weekMonday)
  d.setDate(d.getDate() + 6)
  return d
}

const fmtDateRange = (mon, sun) => {
  return `${mon.toLocaleDateString('en-US', {month:'short', day:'numeric'})} – ${sun.toLocaleDateString('en-US', {month:'short', day:'numeric'})}`
}

const WEEK_THEMES = {
  1: 'Base Building', 2: 'Base Building', 3: 'Base Building', 4: 'Base Building',
  5: 'Endurance', 6: 'Endurance', 7: 'Endurance', 8: 'Recovery',
  9: 'Tempo Intro', 10: 'Building Rhythm', 11: 'Peak Week', 12: 'Recovery'
}

export default function PlanClient({ runs }) {
  const [month, setMonth] = useState(3) // Default to Month 3 (W9-W12)

  const monthWeeks = {
    1: [1, 2, 3, 4],
    2: [5, 6, 7, 8],
    3: [9, 10, 11, 12]
  }[month]

  const monthStart = getWeekMonday(monthWeeks[0])
  const monthEnd = getWeekSunday(getWeekMonday(monthWeeks[3]))
  const monthRuns = (runs || []).filter(r => {
    const d = new Date(r.start_date)
    return d >= monthStart && d <= monthEnd
  }).sort((a,b) => new Date(b.start_date) - new Date(a.start_date))

  // Group by week for chronological mapping
  const runsByWeek = {}
  monthRuns.forEach(r => {
    const d = new Date(r.start_date)
    const daysDiff = Math.floor((d - new Date(START_DATE)) / (1000 * 60 * 60 * 24))
    const weekNum = Math.floor(daysDiff / 7) + 1
    if (!runsByWeek[weekNum]) runsByWeek[weekNum] = []
    runsByWeek[weekNum].push(r)
  })
  Object.keys(runsByWeek).forEach(w => {
    runsByWeek[w].sort((a,b) => new Date(a.start_date) - new Date(b.start_date)) // ascending
  })

  return (
    <div style={{maxWidth: 1000, margin: '0 auto'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:20}}>
        <div>
          <h1 style={{fontSize:'1.8rem',fontWeight:800,letterSpacing:'-0.03em'}}>HM Training Plan</h1>
          <p style={{color:'var(--text-2)',fontSize:'0.85rem',marginTop:3}}>
            12-Week Base & Tempo Program
          </p>
        </div>
      </div>

      <div style={{display:'flex',gap:10,marginBottom:20}}>
        {[1, 2, 3].map(m => (
          <button key={m} onClick={() => setMonth(m)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
              background: m === month ? 'var(--blue)' : 'var(--bg-card)',
              color: m === month ? 'var(--bg)' : 'var(--text-2)',
              border: m === month ? 'none' : '1px solid var(--separator)'
            }}>
            Month {m}
          </button>
        ))}
      </div>

      <div style={{background:'var(--bg-card)',borderRadius:'var(--radius-lg)',overflow:'hidden',boxShadow:'var(--shadow)'}}>
        <div style={{padding:'16px 20px',background:'var(--bg-card2)',borderBottom:'1px solid var(--separator)',fontSize:'0.8rem',fontWeight:800,letterSpacing:'0.05em',textTransform:'uppercase',color:'var(--text-2)'}}>
          Weekly Plan Overview
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',textAlign:'left',fontSize:'0.85rem',tableLayout:'fixed'}}>
            <thead>
              <tr style={{background:'var(--bg-card)',color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.05em',fontSize:'0.75rem'}}>
                <th style={{padding:'14px 16px',fontWeight:700,borderBottom:'1px solid var(--separator)',width:'8%'}}>Wk</th>
                <th style={{padding:'14px 16px',fontWeight:700,borderBottom:'1px solid var(--separator)',width:'17%'}}>Dates</th>
                <th style={{padding:'14px 16px',fontWeight:700,borderBottom:'1px solid var(--separator)',width:'15%'}}>Theme</th>
                <th style={{padding:'14px 16px',fontWeight:700,borderBottom:'1px solid var(--separator)',width:'12%'}}>Easy Run</th>
                <th style={{padding:'14px 16px',fontWeight:700,borderBottom:'1px solid var(--separator)',width:'28%'}}>Tempo Session</th>
                <th style={{padding:'14px 16px',fontWeight:700,borderBottom:'1px solid var(--separator)',width:'10%'}}>Long Run</th>
                <th style={{padding:'14px 16px',fontWeight:700,borderBottom:'1px solid var(--separator)',textAlign:'right',width:'10%'}}>Total</th>
              </tr>
            </thead>
            <tbody>
              {monthWeeks.map((wk, idx) => {
                const planSlots = MOCK_PLAN_WEEKS[wk] || []
                const mon = getWeekMonday(wk)
                const sun = getWeekSunday(mon)
                
                // Extract runs
                const easyRuns = planSlots.filter(s => s.type === 'Easy')
                const tempoRun = planSlots.find(s => s.type === 'Tempo')
                const longRun = planSlots.find(s => s.type === 'Long Run')

                const easyText = easyRuns.length > 1 
                  ? <>{easyRuns[0].targetKm} km x{easyRuns.length}<br/><span style={{fontSize:'0.75rem',color:'var(--text-3)'}}>{easyRuns[0].notes}</span></>
                  : (easyRuns[0] ? <>{easyRuns[0].targetKm} km<br/><span style={{fontSize:'0.75rem',color:'var(--text-3)'}}>{easyRuns[0].notes}</span></> : '--')
                
                const tempoText = tempoRun 
                  ? <>{tempoRun.targetKm} km<br/><span style={{fontSize:'0.75rem',color:'var(--text-3)'}}>{tempoRun.notes}</span></> 
                  : 'No tempo'
                
                const longText = longRun 
                  ? <>{longRun.targetKm} km<br/><span style={{fontSize:'0.75rem',color:'var(--text-3)'}}>{longRun.notes}</span></> 
                  : '--'
                const totalKm = planSlots.reduce((a, s) => a + (s.targetKm || 0), 0)

                // Alternate row background or highlight peak week
                const isPeak = WEEK_THEMES[wk] === 'Peak Week'
                const bg = isPeak ? 'var(--blue-bg)' : (idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-card2)')
                
                return (
                  <tr key={wk} style={{background: bg, borderBottom: '1px solid var(--separator)'}}>
                    <td style={{padding:'16px',fontWeight:800,color:'var(--text-1)'}}>W{wk}</td>
                    <td style={{padding:'16px',color:'var(--text-2)'}}>{fmtDateRange(mon, sun)}</td>
                    <td style={{padding:'16px',color:'var(--text-1)',fontWeight:isPeak?700:500}}>{WEEK_THEMES[wk]}</td>
                    <td style={{padding:'16px',color:'var(--text-2)'}}>{easyText}</td>
                    <td style={{padding:'16px',color:'var(--text-2)'}}>{tempoText}</td>
                    <td style={{padding:'16px',color:'var(--text-2)',fontWeight:600}}>{longText}</td>
                    <td style={{padding:'16px',textAlign:'right',fontWeight:700,color:'var(--blue)'}}>~{totalKm.toFixed(0)} km</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{marginTop: 32}}>
        <h2 style={{fontSize: '1.2rem', fontWeight: 800, marginBottom: 16}}>Runs this month</h2>
        <div style={{display:'flex', flexDirection:'column', gap: 12}}>
          {monthRuns.length === 0 ? (
            <div style={{padding:'20px', textAlign:'center', color:'var(--text-3)'}}>No runs logged in this period.</div>
          ) : (
            monthRuns.map(r => (
              <div key={r.id} style={{background:'var(--bg-card)', borderRadius:'var(--radius-md)', padding:'16px', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'var(--shadow)'}}>
                <div>
                  <div style={{fontWeight: 700, fontSize: '1rem', color:'var(--text-1)'}}>{r.name}</div>
                  <div style={{fontSize: '0.8rem', color:'var(--text-2)', marginTop: 4}}>
                    {new Date(r.start_date).toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'})}
                  </div>
                  {(() => {
                    const d = new Date(r.start_date)
                    const daysDiff = Math.floor((d - new Date(START_DATE)) / (1000 * 60 * 60 * 24))
                    const weekNum = Math.floor(daysDiff / 7) + 1
                    
                    const weekRuns = runsByWeek[weekNum] || []
                    const runIndex = weekRuns.findIndex(wr => wr.id === r.id)
                    const planSlots = MOCK_PLAN_WEEKS[weekNum] || []
                    const plannedSlot = planSlots[runIndex]
                    
                    if (plannedSlot) {
                      return (
                        <div style={{fontSize: '0.78rem', color:'var(--blue)', marginTop: 8, background: 'var(--blue-bg)', padding: '4px 8px', borderRadius: 4, display: 'inline-block'}}>
                          <strong style={{marginRight: 4}}>{plannedSlot.type} Target:</strong> 
                          {plannedSlot.targetKm} km &middot; {plannedSlot.notes}
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
                <div style={{display:'flex', gap: 24, textAlign:'right'}}>
                  <div>
                    <div style={{fontWeight: 800, fontSize: '1.1rem', color:'var(--blue)'}}>{(r.distance/1000).toFixed(2)} <span style={{fontSize:'0.75rem', fontWeight:500, color:'var(--text-2)'}}>km</span></div>
                  </div>
                  <div>
                    <div style={{fontWeight: 700, fontSize: '1.1rem', color:'var(--text-1)'}}>{r.moving_time ? `${Math.floor(r.moving_time/60)}:${String(r.moving_time%60).padStart(2,'0')}` : '--'} <span style={{fontSize:'0.75rem', fontWeight:500, color:'var(--text-2)'}}>min</span></div>
                  </div>
                  <div>
                    <div style={{fontWeight: 700, fontSize: '1.1rem', color:'var(--red)'}}>{r.average_heartrate ? Math.round(r.average_heartrate) : '--'} <span style={{fontSize:'0.75rem', fontWeight:500, color:'var(--text-2)'}}>bpm</span></div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
