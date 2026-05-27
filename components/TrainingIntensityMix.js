'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns'
import CollapsibleSection from './CollapsibleSection'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--bg-modal)', border: '1px solid var(--separator)', borderRadius: 8, padding: '10px 14px' }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Week of {label}</div>
        {payload.map((entry, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-1)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }}></span>
            <span style={{ color: 'var(--text-2)' }}>{entry.name}:</span> {entry.value.toFixed(1)} km
          </div>
        ))}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--separator)', fontSize: '0.8rem', fontWeight: 700 }}>
          Total: {payload.reduce((sum, entry) => sum + entry.value, 0).toFixed(1)} km
        </div>
      </div>
    )
  }
  return null
}

export default function TrainingIntensityMix({ runs }) {
  if (!runs || runs.length === 0) return null

  // Group runs by week
  // Calculate Z1/Z2 (Easy), Z3 (Moderate), Z4/Z5 (Hard) distances
  
  const weeklyData = {}

  runs.forEach(run => {
    if (!run.hrZones || !run.distance) return
    
    const d = parseISO(run.start_date)
    const weekStart = startOfWeek(d, { weekStartsOn: 1 }) // Monday start
    const weekKey = format(weekStart, 'MMM d')
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = {
        name: weekKey,
        sortDate: weekStart.getTime(),
        easy: 0,
        moderate: 0,
        hard: 0,
      }
    }
    
    // hrZones is percentages (e.g. Z1: 45.5, Z2: 50.0). We need to apportion distance.
    const dist = run.distance / 1000
    
    const easyPct = ((run.hrZones.Z1 || 0) + (run.hrZones.Z2 || 0)) / 100
    const modPct  = (run.hrZones.Z3 || 0) / 100
    const hardPct = ((run.hrZones.Z4 || 0) + (run.hrZones.Z5 || 0)) / 100
    
    weeklyData[weekKey].easy += (dist * easyPct)
    weeklyData[weekKey].moderate += (dist * modPct)
    weeklyData[weekKey].hard += (dist * hardPct)
  })

  const data = Object.values(weeklyData)
    .sort((a, b) => a.sortDate - b.sortDate)
    .slice(-12) // Last 12 weeks

  if (data.length === 0) return null

  return (
    <CollapsibleSection title="Training Intensity Mix" subtitle="Distance by HR zones (Last 12 Weeks)">
      <div style={{ paddingTop: 16 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--separator)" vertical={false} />
            <XAxis dataKey="name" stroke="transparent" tick={{ fill: 'var(--text-3)', fontSize: 11 }} />
            <YAxis stroke="transparent" tick={{ fill: 'var(--text-3)', fontSize: 11 }} tickFormatter={(val) => `${val}k`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--fill-1)' }} />
            <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: 10 }} />
            <Bar dataKey="easy" name="Easy (Z1-Z2)" stackId="a" fill="var(--z2)" radius={[0, 0, 4, 4]} />
            <Bar dataKey="moderate" name="Tempo (Z3)" stackId="a" fill="var(--blue)" />
            <Bar dataKey="hard" name="Hard (Z4-Z5)" stackId="a" fill="var(--red)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CollapsibleSection>
  )
}
