import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { format } from 'date-fns'

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background:'#12141a', border:'1px solid rgba(255,255,255,0.1)',
      borderRadius:12, padding:'12px 16px',
      boxShadow:'0 16px 40px rgba(0,0,0,0.7)', minWidth:160,
    }}>
      <p style={{color:'#7c7f96',fontSize:'0.78rem',marginBottom:8}}>{label}</p>
      {payload.map((p,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
          <div style={{width:8,height:8,borderRadius:2,background:p.color,flexShrink:0}}/>
          <span style={{color:'#e8eaf6',fontSize:'0.85rem',fontWeight:500}}>
            {p.name}: <strong>{typeof p.value==='number'?Math.round(p.value):p.value}</strong>
          </span>
        </div>
      ))}
    </div>
  )
}

export default function PMCChart({ data }) {
  if (!data?.length) return null
  const step = Math.max(1, Math.floor(data.length / 60))
  const pts = data
    .filter((_,i) => i % step === 0 || i === data.length-1)
    .map(d => ({
      date:    format(new Date(d.date), 'MMM d'),
      Fitness: Math.round(d.ctl * 10) / 10,
      Fatigue: Math.round(d.atl * 10) / 10,
      Form:    Math.round(d.tsb * 10) / 10,
    }))

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={pts} margin={{top:8,right:8,bottom:0,left:-16}}>
        <defs>
          <linearGradient id="gFit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#007aff" stopOpacity={0.18}/>
            <stop offset="95%" stopColor="#007aff" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="gForm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#ff9500" stopOpacity={0.15}/>
            <stop offset="95%" stopColor="#ff9500" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 6" stroke="rgba(120,120,128,0.15)" vertical={false}/>
        <XAxis dataKey="date" stroke="transparent"
          tick={{fill:'var(--text-3)',fontSize:11}} tickMargin={10} minTickGap={40}/>
        <YAxis stroke="transparent" tick={{fill:'var(--text-3)',fontSize:11}} width={36}/>
        <ReferenceLine y={0} stroke="var(--separator)" strokeDasharray="4 4"/>
        <Tooltip content={<Tip/>}/>
        <Area type="monotone" dataKey="Form"    stroke="#ff9500" strokeWidth={1.5} fill="url(#gForm)" dot={false} activeDot={{r:4}}/>
        <Line  type="monotone" dataKey="Fatigue" stroke="#ff3b30" strokeWidth={2}   dot={false} activeDot={{r:4}}/>
        <Area  type="monotone" dataKey="Fitness" stroke="#007aff" strokeWidth={2.5} fill="url(#gFit)"  dot={false} activeDot={{r:5}}/>
      </ComposedChart>
    </ResponsiveContainer>
  )
}
