'use client'
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'

const fmtPace = (mps) => {
  if (!mps) return '--'
  const s = 1000 / mps
  return `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`
}

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{background:'var(--bg-modal)',border:'1px solid var(--separator)',borderRadius:10,padding:'10px 14px',fontSize:'0.8rem',minWidth:150}}>
      <div style={{fontWeight:700,marginBottom:5}}>Km {d.km}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:2}}>
          <span style={{color:p.color}}>{p.name}</span>
          <strong>{p.name==='Pace' ? fmtPace(p.payload.speedMs)+' /km' : Math.round(p.value)+' bpm'}</strong>
        </div>
      ))}
      {d.elevation!=null && <div style={{color:'var(--text-3)',marginTop:3}}>Elev Δ {d.elevation>0?'+':''}{d.elevation}m</div>}
    </div>
  )
}

export default function KmSplitsChart({ splits }) {
  if (!splits?.length) return null
  const data = splits.map((s, i) => ({
    km:        i + 1,
    hr:        s.average_heartrate ? Math.round(s.average_heartrate) : null,
    paceDisp:  fmtPace(s.average_speed),
    speedMs:   s.average_speed,
    paceSecs:  s.average_speed ? 1000 / s.average_speed : null,
    elevation: s.elevation_difference ? Math.round(s.elevation_difference) : null,
  })).filter(d => d.hr || d.paceSecs)

  if (!data.length) return null

  const minPace = Math.min(...data.filter(d=>d.paceSecs).map(d=>d.paceSecs))
  const maxPace = Math.max(...data.filter(d=>d.paceSecs).map(d=>d.paceSecs))
  const padP = (maxPace - minPace) * 0.2 || 15

  // Average HR for reference line
  const avgHR = Math.round(data.filter(d=>d.hr).reduce((a,d)=>a+d.hr,0) / data.filter(d=>d.hr).length)

  return (
    <div>
      <div style={{fontSize:'0.78rem',color:'var(--text-2)',marginBottom:12,lineHeight:1.6,background:'var(--bg-modal)',padding:'10px 14px',borderRadius:8,border:'1px solid var(--separator)'}}>
        <strong style={{color:'var(--text-1)'}}>How to read:</strong> A perfect endurance run has a flat pace line and a flat heart rate line. If your pace stays flat but your heart rate keeps climbing (called &apos;cardiac drift&apos;), it means you were getting tired. Under 5% drift is excellent.
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{top:8,right:48,bottom:0,left:-10}}>
          <CartesianGrid strokeDasharray="2 6" stroke="var(--separator)" vertical={false}/>
          <XAxis dataKey="km" stroke="transparent"
            tick={{fill:'var(--text-3)',fontSize:11}} label={{value:'Km',position:'insideBottomRight',offset:-8,style:{fill:'var(--text-3)',fontSize:10}}}/>
          <YAxis yAxisId="hr" stroke="transparent"
            domain={[d=>Math.max(60,d-15), d=>d+10]}
            tick={{fill:'var(--text-3)',fontSize:10}} width={36}/>
          <YAxis yAxisId="pace" orientation="right" stroke="transparent"
            domain={[maxPace+padP, minPace-padP]}
            tick={{fill:'var(--text-3)',fontSize:10}} width={40}
            tickFormatter={v=>{const s=1000/v; return `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`}}/>
          <ReferenceLine yAxisId="hr" y={avgHR} stroke="rgba(255,59,48,0.3)" strokeDasharray="4 3" label={{value:`avg ${avgHR}`,position:'right',style:{fill:'var(--red)',fontSize:9}}}/>
          <Tooltip content={<Tip/>}/>
          <Legend wrapperStyle={{fontSize:'0.75rem',paddingTop:10}}/>
          <Line yAxisId="hr" type="monotone" dataKey="hr" name="Heart Rate"
            stroke="var(--red)" strokeWidth={2.5} dot={{r:4,fill:'var(--red)',strokeWidth:0}} activeDot={{r:6}}/>
          <Line yAxisId="pace" type="monotone" dataKey="paceSecs" name="Pace"
            stroke="var(--blue)" strokeWidth={2} strokeDasharray="5 3"
            dot={{r:4,fill:'var(--blue)',strokeWidth:0}} activeDot={{r:6}}/>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
