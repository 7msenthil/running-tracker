'use client'

import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO } from 'date-fns'

const HeatTaxTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{background:'var(--bg-modal)',border:'1px solid var(--separator)',borderRadius:10,padding:'10px 14px',fontSize:'0.8rem',minWidth:160}}>
      <div style={{fontWeight:700,marginBottom:5}}>{d.name}</div>
      <div style={{color:'var(--text-2)',marginBottom:3}}>{d.displayDate}</div>
      <div style={{display:'flex',flexDirection:'column',gap:2,marginTop:8}}>
        <span><strong style={{color:'var(--orange)'}}>{d.temp}°C</strong> temperature</span>
        <span><strong style={{color:'var(--green)'}}>{d.ef}</strong> Efficiency Score</span>
      </div>
    </div>
  )
}

export default function HeatTaxChart({ runs }) {
  const data = runs
    .filter(r => r.temperature !== undefined && r.temperature !== null && r.average_heartrate)
    .sort((a,b) => new Date(a.start_date) - new Date(b.start_date))
    .map(r => {
      const speedMetersPerMin = r.distance / (r.moving_time / 60)
      const ef = speedMetersPerMin / r.average_heartrate
      return {
        id: r.id,
        name: r.name,
        sortDate: new Date(r.start_date).getTime(),
        displayDate: format(parseISO(r.start_date), 'MMM d'),
        temp: Math.round(r.temperature),
        ef: parseFloat(ef.toFixed(2)),
      }
    })

  if(data.length === 0) return (
    <div className="empty-txt" style={{padding:'40px 0', textAlign:'center'}}>
      Sync some runs with weather data to see heat impact.
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--separator)" />
        <XAxis 
          dataKey="displayDate" 
          stroke="transparent" 
          tick={{fill:'var(--text-3)', fontSize:11}} 
          tickMargin={10}
          label={{value:'Date',position:'insideBottom',offset:-10,style:{fill:'var(--text-3)',fontSize:11}}} 
        />
        <YAxis 
          yAxisId="ef"
          domain={['dataMin - 0.1', 'dataMax + 0.1']} 
          stroke="transparent" 
          tick={{fill:'var(--text-3)', fontSize:11}}
          tickFormatter={v => v.toFixed(2)}
          width={55}
          label={{ value: 'EF Score', angle: -90, position: 'insideLeft', fill: 'var(--text-3)', fontSize: 11 }}
        />
        <YAxis 
          yAxisId="temp"
          orientation="right"
          domain={[0, 'dataMax + 10']} 
          hide={true}
        />
        <Tooltip content={<HeatTaxTip />} cursor={{fill:'var(--fill-1)'}} />
        
        {/* Temperature as bars */}
        <Bar yAxisId="temp" dataKey="temp" fill="var(--orange-bg)" radius={[4,4,0,0]} />
        
        {/* EF as line */}
        <Line yAxisId="ef" type="monotone" dataKey="ef" stroke="var(--green)" strokeWidth={3} dot={{r: 4, fill: 'var(--green)', stroke:'var(--bg)'}} activeDot={{r: 6}} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
