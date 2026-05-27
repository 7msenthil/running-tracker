'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'

const fmtPace = (secsPerKm) => {
  if (!secsPerKm) return '--'
  return `${Math.floor(secsPerKm/60)}:${String(Math.round(secsPerKm%60)).padStart(2,'0')}`
}

const PaceTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{background:'var(--bg-modal)',border:'1px solid var(--separator)',borderRadius:10,padding:'10px 14px',fontSize:'0.8rem',minWidth:160}}>
      <div style={{fontWeight:700,marginBottom:5}}>{d.name}</div>
      <div style={{color:'var(--text-2)',marginBottom:3}}>{d.displayDate}</div>
      <div style={{display:'flex',flexDirection:'column',gap:2,marginTop:8}}>
        <span><strong style={{color:'var(--green)'}}>{fmtPace(d.paceAt140)}/km</strong> est @140bpm</span>
        <span style={{color:'var(--text-3)'}}>(Actual: {fmtPace(d.actualPace)} @ {d.hr} bpm)</span>
      </div>
    </div>
  )
}

export default function PaceAtFixedHRChart({ runs }) {
  const data = runs
    .filter(r => r.distance > 3000 && r.moving_time > 600 && r.average_heartrate >= 125 && r.average_heartrate <= 148)
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .map(r => {
      const actualPaceSecs = r.moving_time / (r.distance / 1000)
      const hr = Math.round(r.average_heartrate)
      
      // Est Pace at 140 bpm = Actual Pace * (Actual HR / 140)
      const paceAt140Secs = actualPaceSecs * (hr / 140)
      
      return {
        id: r.id,
        name: r.name,
        sortDate: new Date(r.start_date).getTime(),
        displayDate: format(parseISO(r.start_date), 'MMM d'),
        paceAt140: paceAt140Secs,
        actualPace: actualPaceSecs,
        hr: hr
      }
    })
    .filter(d => d.paceAt140 > 180 && d.paceAt140 < 900) // Filter out pace anomalies (<3:00/km or >15:00/km)

  if(data.length === 0) return (
    <div className="empty-txt" style={{padding:'40px 0', textAlign:'center'}}>
      Sync runs with heart rate data to see Pace at Fixed HR.
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--separator)" />
        <XAxis 
          dataKey="displayDate" 
          stroke="transparent" 
          tick={{fill:'var(--text-3)', fontSize:11}} 
          tickMargin={10}
          label={{value:'Date',position:'insideBottom',offset:-10,style:{fill:'var(--text-3)',fontSize:11}}} 
        />
        <YAxis 
          domain={['dataMin - 15', 'dataMax + 15']} 
          stroke="transparent" 
          tick={{fill:'var(--text-3)', fontSize:11}}
          tickFormatter={(val) => fmtPace(val)}
          reversed={true} // lower pace (faster) at the top
          width={55}
          label={{ value: 'Pace', angle: -90, position: 'insideLeft', fill: 'var(--text-3)', fontSize: 11 }}
        />
        <Tooltip content={<PaceTip />} cursor={{fill:'var(--fill-1)'}} />
        <Line type="monotone" dataKey="paceAt140" stroke="var(--green)" strokeWidth={3} dot={{r: 4, fill: 'var(--green)', stroke:'var(--bg)'}} activeDot={{r: 6}} />
      </LineChart>
    </ResponsiveContainer>
  )
}
