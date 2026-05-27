'use client'

import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const fmtPace = (secs) => `${Math.floor(secs/60)}:${String(Math.round(secs%60)).padStart(2,'0')}`

const DecouplingTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{background:'var(--bg-modal)',border:'1px solid var(--separator)',borderRadius:10,padding:'10px 14px',fontSize:'0.8rem',minWidth:160}}>
      <div style={{fontWeight:700,marginBottom:5}}>Km {d.km}</div>
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{color:'var(--red)'}}>Avg HR:</span>
          <strong>{d.hr} bpm</strong>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{color:'var(--blue)'}}>Pace:</span>
          <strong>{fmtPace(d.paceSecs)} /km</strong>
        </div>
      </div>
      <div style={{marginTop:8, paddingTop:8, borderTop:'1px solid var(--separator)', color:'var(--text-3)', fontSize:'0.75rem'}}>
        Decoupling at this split: {d.hrDrift > 0 ? '+' : ''}{d.hrDrift.toFixed(1)}%
      </div>
    </div>
  )
}

export default function AerobicDecouplingModalChart({ splits }) {
  if (!splits || splits.length < 2) return (
    <div className="empty-txt" style={{padding:'20px 0', textAlign:'center', fontSize:'0.85rem'}}>
      Not enough splits to calculate aerobic decoupling.
    </div>
  )

  const baseline = splits[0]
  if (!baseline || !baseline.average_heartrate || !baseline.moving_time) return null

  const baselineHR = baseline.average_heartrate
  const baselinePaceSecs = baseline.moving_time / (baseline.distance / 1000)

  const data = splits.map((s, i) => {
    const hr = Math.round(s.average_heartrate || 0)
    const paceSecs = s.moving_time / (s.distance / 1000)
    
    // Using HR drift to represent decoupling at this split
    const hrDrift = hr ? ((hr - baselineHR) / baselineHR) * 100 : 0

    return {
      km: i + 1,
      hr,
      paceSecs,
      hrDrift
    }
  })

  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 16, padding: '0 8px', lineHeight: 1.5 }}>
        <strong>How to read:</strong> The chart plots your actual Heart Rate (red) against your Pace (blue). As you tire, your HR naturally climbs even if your pace stays the same—this divergence is called &quot;decoupling&quot;. A tighter grouping means better aerobic endurance!
      </div>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--separator)" />
          <XAxis 
            dataKey="km" 
            stroke="transparent" 
            tick={{fill:'var(--text-3)', fontSize:11}} 
            tickMargin={10}
            tickFormatter={(v) => `${v}k`}
            label={{value:'Distance (Km)',position:'insideBottom',offset:-10,style:{fill:'var(--text-3)',fontSize:11}}}
          />
          <YAxis 
            yAxisId="hr"
            domain={['dataMin - 5', 'dataMax + 5']} 
            stroke="transparent" 
            tick={{fill:'var(--text-3)', fontSize:11}}
            width={45}
            label={{ value: 'HR (bpm)', angle: -90, position: 'insideLeft', fill: 'var(--text-3)', fontSize: 11 }}
          />
          <YAxis 
            yAxisId="pace"
            orientation="right"
            domain={['dataMin - 15', 'dataMax + 15']} 
            stroke="transparent" 
            tick={{fill:'var(--text-3)', fontSize:11}}
            tickFormatter={fmtPace}
            reversed={true} // Faster pace = higher on graph
            width={55}
            label={{ value: 'Pace', angle: 90, position: 'insideRight', fill: 'var(--text-3)', fontSize: 11 }}
          />
          <Tooltip content={<DecouplingTip />} cursor={{fill:'var(--fill-1)'}} />
          <Line yAxisId="hr" type="monotone" dataKey="hr" stroke="var(--red)" strokeWidth={3} dot={{r: 4, fill: 'var(--red)', stroke:'var(--bg)'}} activeDot={{r: 6}} />
          <Line yAxisId="pace" type="monotone" dataKey="paceSecs" stroke="var(--blue)" strokeWidth={3} dot={{r: 4, fill: 'var(--blue)', stroke:'var(--bg)'}} activeDot={{r: 6}} />
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{display:'flex', justifyContent:'center', gap: 20, marginTop: 12, fontSize: '0.75rem', fontWeight: 700}}>
        <div style={{color:'var(--red)', display:'flex', alignItems:'center', gap:6}}><span style={{width:10, height:3, background:'var(--red)', display:'inline-block'}}></span> Avg HR</div>
        <div style={{color:'var(--blue)', display:'flex', alignItems:'center', gap:6}}><span style={{width:10, height:3, background:'var(--blue)', display:'inline-block'}}></span> Avg Pace</div>
      </div>
    </div>
  )
}
