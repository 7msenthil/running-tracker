'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { format, parseISO } from 'date-fns'

const fmtPace = (secsPerKm) => {
  if (!secsPerKm) return '--'
  return `${Math.floor(secsPerKm/60)}:${String(Math.round(secsPerKm%60)).padStart(2,'0')}`
}

const EFTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{background:'var(--bg-modal)',border:'1px solid var(--separator)',borderRadius:10,padding:'10px 14px',fontSize:'0.8rem',minWidth:160}}>
      <div style={{fontWeight:700,marginBottom:5}}>{d.name}</div>
      <div style={{color:'var(--text-2)',marginBottom:3}}>{d.displayDate}</div>
      <div style={{display:'flex',flexDirection:'column',gap:2,marginTop:8}}>
        <span><strong style={{color:'var(--green)'}}>{d.ef}</strong> Efficiency Score</span>
        <span><strong style={{color:'var(--text-1)'}}>{d.pace}</strong> avg pace</span>
        <span><strong style={{color:'var(--red)'}}>{d.hr} bpm</strong> avg HR</span>
      </div>
    </div>
  )
}

export default function EfficiencyFactorChart({ runs }) {
  // EF = (distance in meters / moving time in minutes) / average heart rate
  const data = runs
    .filter(r => r.distance > 3000 && r.moving_time > 600 && r.average_heartrate > 80 && r.average_heartrate < 155)
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .map(r => {
      const speedMetersPerMin = r.distance / (r.moving_time / 60)
      const ef = speedMetersPerMin / r.average_heartrate
      
      const paceSecs = r.moving_time / (r.distance / 1000)
      const pace = `${Math.floor(paceSecs / 60)}:${String(Math.round(paceSecs % 60)).padStart(2, '0')}/km`
      
      return {
        id: r.id,
        name: r.name,
        sortDate: new Date(r.start_date).getTime(),
        displayDate: format(parseISO(r.start_date), 'MMM d'),
        ef: parseFloat(ef.toFixed(2)),
        hr: Math.round(r.average_heartrate),
        pace: pace
      }
    })
    .filter(d => d.ef > 0.5 && d.ef < 3.0) // Filter out extreme GPS/HR anomalies

  if(data.length === 0) return (
    <div className="empty-txt" style={{padding:'40px 0', textAlign:'center'}}>
      Sync runs with heart rate data to see your Efficiency Factor.
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
        <defs>
          <linearGradient id="efGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--green)" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="var(--green)" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--separator)" />
        <XAxis 
          dataKey="displayDate" 
          stroke="transparent" 
          tick={{fill:'var(--text-3)', fontSize:11}} 
          tickMargin={10} 
          label={{value:'Date',position:'insideBottom',offset:-10,style:{fill:'var(--text-3)',fontSize:11}}}
        />
        <YAxis 
          domain={['dataMin - 0.1', 'dataMax + 0.1']} 
          stroke="transparent" 
          tick={{fill:'var(--text-3)', fontSize:11}}
          tickFormatter={v => v.toFixed(2)}
          width={45}
          label={{ value: 'Score', angle: -90, position: 'insideLeft', fill: 'var(--text-3)', fontSize: 11 }}
        />
        <Tooltip content={<EFTip />} cursor={{fill:'var(--fill-1)'}} />
        <Area type="monotone" dataKey="ef" stroke="var(--green)" strokeWidth={3} fillOpacity={1} fill="url(#efGradient)" activeDot={{r: 6}} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
