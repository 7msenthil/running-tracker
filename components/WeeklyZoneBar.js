'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { format, subWeeks, startOfWeek } from 'date-fns'

const ZONE_COLORS = ['var(--z1)','var(--z2)','var(--z3)','var(--z4)','var(--z5)']
const Z_HEX = ['#5ac8fa','#34c759','#ff9500','#ff6b00','#ff3b30']
const ZONE_KEYS = ['Z1','Z2','Z3','Z4','Z5']
const ZONE_NAMES = ['Z1 Recovery','Z2 Base','Z3 Tempo','Z4 Threshold','Z5 VO₂Max']

function buildWeeklyZoneData(runs, days) {
  const result = []
  const now = new Date()
  let numWeeks = 12
  
  if (days) {
    numWeeks = Math.max(4, Math.ceil(days / 7))
  } else if (runs.length) {
    // All time
    const oldestRun = runs.reduce((min, r) => {
      const d = new Date(r.start_date).getTime()
      return d < min ? d : min
    }, now.getTime())
    numWeeks = Math.max(4, Math.ceil((now.getTime() - oldestRun) / (7*24*60*60*1000)))
  }
  for (let w = numWeeks - 1; w >= 0; w--) {
    const weekStart = startOfWeek(subWeeks(now, w), { weekStartsOn: 1 }) // Monday
    const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7)
    const label = format(weekStart, 'MMM d')
    const weekRuns = runs.filter(r => {
      const d = new Date(r.start_date)
      return d >= weekStart && d < weekEnd
    })
    if (!weekRuns.length) { result.push({ week: label, totalMins: 0, Z1:0,Z2:0,Z3:0,Z4:0,Z5:0 }); continue }
    const totalSecs = weekRuns.reduce((a,r) => a + r.moving_time, 0)
    const totalMins = totalSecs / 60
    // Sum zone mins from each run
    const zoneMins = { Z1:0,Z2:0,Z3:0,Z4:0,Z5:0 }
    weekRuns.forEach(r => {
      if (r.hrZones) {
        ZONE_KEYS.forEach(z => { zoneMins[z] += (r.hrZones[z] / 100) * (r.moving_time / 60) })
      } else {
        // No zone data — put all in Z2 estimate
        zoneMins.Z2 += totalMins
      }
    })
    result.push({ week: label, totalMins: Math.round(totalMins), ...Object.fromEntries(ZONE_KEYS.map(z=>[z,Math.round(zoneMins[z])])) })
  }
  return result
}

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const total = payload.reduce((a,p)=>a+p.value,0)
  return (
    <div style={{background:'var(--bg-modal)',border:'1px solid var(--separator)',borderRadius:10,padding:'10px 14px',fontSize:'0.8rem',minWidth:170}}>
      <div style={{fontWeight:700,marginBottom:6}}>Week of {label}</div>
      {[...payload].reverse().map((p,i)=>(
        <div key={i} style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:3,alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <div style={{width:8,height:8,borderRadius:2,background:p.fill}}/>
            <span style={{color:'var(--text-2)'}}>{p.name}</span>
          </div>
          <strong>{p.value}m · {total?Math.round(p.value/total*100):0}%</strong>
        </div>
      ))}
      <div style={{borderTop:'1px solid var(--separator)',marginTop:6,paddingTop:6,display:'flex',justifyContent:'space-between'}}>
        <span style={{color:'var(--text-3)'}}>Total</span>
        <strong>{total}m ({(total/60).toFixed(1)}h)</strong>
      </div>
    </div>
  )
}

export default function WeeklyZoneBar({ runs, days }) {
  const data = buildWeeklyZoneData(runs, days)
  const hasAnyData = data.some(d => d.totalMins > 0)
  if (!hasAnyData) return (
    <div className="empty"><div className="empty-icon">📊</div><div className="empty-txt">Sync data to see weekly zone breakdown</div></div>
  )

  // 80/20 check for most recent week with data
  const latestWeek = [...data].reverse().find(d=>d.totalMins>0)
  const z45Pct = latestWeek ? Math.round((latestWeek.Z4+latestWeek.Z5)/latestWeek.totalMins*100) : 0

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:'0.82rem',color:'var(--text-2)',lineHeight:1.5}}>
          <strong style={{color:'var(--text-1)'}}>80/20 Rule:</strong> 80% of training time should be in Z1–Z2, 20% in Z3–Z5. Higher Z4/Z5 = too hard on easy days.
        </div>
        {latestWeek?.totalMins>0 && (
          <div style={{background:z45Pct>25?'var(--red-bg)':'var(--green-bg)',border:`1px solid ${z45Pct>25?'var(--red)':'var(--green)'}`,borderRadius:8,padding:'4px 10px',fontSize:'0.78rem',fontWeight:700,color:z45Pct>25?'var(--red)':'var(--green)',whiteSpace:'nowrap'}}>
            {z45Pct}% hard {z45Pct<=20?'✓ On track':z45Pct<=30?'Slightly high':'⚠ Too much'}
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{top:4,right:8,bottom:0,left:0}}>
          <CartesianGrid strokeDasharray="2 6" stroke="var(--separator)" vertical={false}/>
          <XAxis dataKey="week" stroke="transparent" tick={{fill:'var(--text-3)',fontSize:10}} tickMargin={8}/>
          <YAxis stroke="transparent" tick={{fill:'var(--text-3)',fontSize:10}} width={36} tickFormatter={v=>`${v}m`}/>
          <Tooltip content={<Tip/>}/>
          {ZONE_KEYS.map((z,i)=>(
            <Bar key={z} dataKey={z} name={ZONE_NAMES[i]} stackId="zones" fill={Z_HEX[i]}
              radius={i===4?[3,3,0,0]:[0,0,0,0]}/>
          ))}
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:12,fontSize:'0.75rem'}}>
        {ZONE_KEYS.map((z,i)=>(
          <span key={z} style={{display:'flex',alignItems:'center',gap:4,color:Z_HEX[i],fontWeight:700}}>
            <span style={{width:10,height:10,borderRadius:3,background:Z_HEX[i],display:'inline-block'}}/>
            {z} — {ZONE_NAMES[i].split(' ')[1]}
          </span>
        ))}
      </div>
    </div>
  )
}
