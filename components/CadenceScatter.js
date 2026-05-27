'use client'

import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, CartesianAxis } from 'recharts'
import { format, parseISO } from 'date-fns'

const fmtPace = (mps) => {
  if (!mps) return '--'
  const s = 1000 / mps
  return `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`
}

const CadenceCustomTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{background:'var(--bg-modal)',border:'1px solid var(--separator)',borderRadius:10,padding:'10px 14px',fontSize:'0.8rem',minWidth:160}}>
      <div style={{fontWeight:700,marginBottom:5}}>{d.name}</div>
      <div style={{color:'var(--text-2)',marginBottom:3}}>{d.displayDate}</div>
      <div style={{display:'flex',flexDirection:'column',gap:2,marginTop:8}}>
        <span><strong style={{color:'var(--purple)'}}>{d.cadence} SPM</strong> cadence</span>
        <span><strong style={{color:'var(--blue)'}}>{fmtPace(d.speedMs)}/km</strong> pace</span>
      </div>
    </div>
  )
}

export default function CadenceScatter({ runs }) {
  const data = runs
    .filter(r => r.average_cadence && r.average_cadence > 130)
    .sort((a,b) => new Date(a.start_date) - new Date(b.start_date))
    .map(r => ({
      id: r.id,
      name: r.name,
      sortDate: new Date(r.start_date).getTime(),
      displayDate: format(parseISO(r.start_date), 'MMM d'),
      cadence: Math.round(r.average_cadence * 2), // SPM
      speedMs: r.distance / r.moving_time,
    }))

  if(data.length === 0) return null

  // We will plot Cadence on left Y-axis, Pace on right Y-axis (hidden or scaled)
  const paceMax = Math.max(...data.map(d => d.speedMs)) * 1.1

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--separator)" />
        <XAxis 
          dataKey="displayDate" 
          stroke="transparent" 
          tick={{fill:'var(--text-3)', fontSize:11}} 
          tickMargin={10} 
        />
        <YAxis 
          yAxisId="cadence"
          domain={['dataMin - 5', 'dataMax + 5']} 
          stroke="transparent" 
          tick={{fill:'var(--text-3)', fontSize:11}}
          tickFormatter={v => `${v}`}
        />
        <YAxis 
          yAxisId="pace"
          orientation="right"
          domain={[0, paceMax]} 
          hide={true}
        />
        <Tooltip content={<CadenceCustomTip />} cursor={{stroke:'var(--text-3)', strokeWidth:1, strokeDasharray:'3 3'}} />
        
        {/* Pace as a subtle background area */}
        <Area yAxisId="pace" type="monotone" dataKey="speedMs" fill="var(--blue-bg)" stroke="none" />
        
        {/* Cadence as the primary line */}
        <Line yAxisId="cadence" type="monotone" dataKey="cadence" stroke="var(--purple)" strokeWidth={3} dot={{r: 4, fill: 'var(--purple)', stroke:'var(--bg)'}} activeDot={{r: 6}} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
