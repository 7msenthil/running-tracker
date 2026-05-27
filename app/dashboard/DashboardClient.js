'use client'

import { useEffect, useState, useCallback } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ScatterChart, Scatter, Cell, Legend } from 'recharts'
import Link from 'next/link'
import { db } from '@/lib/firebase'
import { collection, doc, setDoc, getDocs, query, orderBy, deleteDoc, writeBatch } from 'firebase/firestore'
import { calculateTSS, calculateDecoupling, calculatePMC, calculateHRZones, calculateTrimmedMetrics } from '@/lib/metrics'

import CollapsibleSection from '@/components/CollapsibleSection'
import ThisWeekWidget from '@/components/ThisWeekWidget'
import PersonalRecords from '@/components/PersonalRecords'
import TrainingIntensityMix from '@/components/TrainingIntensityMix'
import WeeklyZoneBar from '@/components/WeeklyZoneBar'
import EfficiencyFactorChart from '@/components/EfficiencyFactorChart'
import PaceAtFixedHRChart from '@/components/PaceAtFixedHRChart'
import CadenceScatter from '@/components/CadenceScatter'
import HeatTaxChart from '@/components/HeatTaxChart'
import AerobicDecouplingModalChart from '@/components/AerobicDecouplingModalChart'
import TrainingPlanClient from '@/app/training-plan/PlanClient'
import { fetchWeatherForRun } from '@/lib/weather'
import {
  ComposedChart, Line, Bar, BarChart, 
} from 'recharts'
import { format, subDays, parseISO, isAfter } from 'date-fns'

/* ── Helpers ─────────────────────────────────────────── */
const fmtPace = (mps) => {
  if (!mps) return '--'
  const s = 1000 / mps
  return `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`
}
const fmtDist    = (m) => (m/1000).toFixed(2)
const fmtDur     = (s) => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}h ${m}m`:`${m}m` }
const fmtDate    = (d) => new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'})
const fmtDateLong= (d) => new Date(d).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
const paceToSecs = (mps) => mps ? 1000/mps : 0   // secs per km
const fmtSecs    = (s) => `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`

const decClass = (d) => !d?'':d<5?'text-green':d<8?'text-yellow':'text-red'
const decBadge = (d) => {
  if (!d) return null
  if (d<5) return <span className="badge badge-green">Aerobic ✓</span>
  if (d<8) return <span className="badge badge-yellow">Moderate</span>
  return <span className="badge badge-red">Cardiac Drift</span>
}

const ZONE_COLORS = ['var(--z1)','var(--z2)','var(--z3)','var(--z4)','var(--z5)']
const ZONE_NAMES  = ['Recovery','Easy Target','Tempo Quality','Avoid','Max']
const ZONE_RANGES = ['< 135 bpm','135 - 148','149 - 162','163 - 172','> 172 bpm']
const ZONE_KEYS   = ['Z1','Z2','Z3','Z4','Z5']
const ZONE_HR     = ['< 135 bpm','135–147 bpm','148–155 bpm','156–168 bpm','> 168 bpm']

/* ── Zone colors as hex for recharts ────────────────── */
const Z_HEX = ['#65C4F6','#2CD864','#FFAD0B','#FF6D15','#F02D2D']

/* ── HR zone classifier ──────────────────────────────── */
function hrToZone(hr) {
  if (hr < 135) return 0   // Z1
  if (hr <= 147) return 1   // Z2
  if (hr <= 155) return 2   // Z3
  if (hr <= 168) return 3   // Z4
  return 4                  // Z5
}

/* ── Aggregation helpers ─────────────────────────────── */
function getWeekStart(date) {
  const d = new Date(date); d.setHours(0,0,0,0)
  const day = d.getDay()
  d.setDate(d.getDate() - (day===0?6:day-1))
  return d.toISOString().slice(0,10)
}
function getMonthKey(date) { return date.slice(0,7) }
function aggregatePeriods(runs, keyFn, n) {
  const map = {}
  runs.forEach(r => {
    const k = keyFn(r.start_date)
    if (!map[k]) map[k] = { distance:0, moving_time:0, runs:0, hrSum:0, hrCount:0, maxHR:0, zones:{Z1:0,Z2:0,Z3:0,Z4:0,Z5:0}, zoneCount:0, items:[] }
    const b = map[k]
    b.distance += r.distance; b.moving_time += r.moving_time; b.runs++; b.items.push(r)
    if (r.average_heartrate) { b.hrSum+=r.average_heartrate; b.hrCount++ }
    if (r.max_heartrate && r.max_heartrate>b.maxHR) b.maxHR=r.max_heartrate
    if (r.hrZones) { ZONE_KEYS.forEach(z=>b.zones[z]+=r.hrZones[z]); b.zoneCount++ }
  })
  return Object.entries(map).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,n).map(([key,v])=>({
    key,
    distance:v.distance, moving_time:v.moving_time, runs:v.runs, items:v.items,
    avgHR:v.hrCount?Math.round(v.hrSum/v.hrCount):null,
    maxHR:v.maxHR||null,
    zones:v.zoneCount?{Z1:v.zones.Z1/v.zoneCount,Z2:v.zones.Z2/v.zoneCount,Z3:v.zones.Z3/v.zoneCount,Z4:v.zones.Z4/v.zoneCount,Z5:v.zones.Z5/v.zoneCount}:null
  }))
}

/* ── Calendar helper ─────────────────────────────────── */
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
function buildCalGrid(runs) {
  const map = {}
  runs.forEach(r => { const k=r.start_date?.slice(0,10); if(k) map[k]=(map[k]||0)+r.distance/1000 })
  const today=new Date(); today.setHours(0,0,0,0)
  const dow=today.getDay()
  const mondayThisWeek=new Date(today); mondayThisWeek.setDate(today.getDate()-(dow===0?6:dow-1))
  const weeks=[]
  
  const toLocalKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

  for(let w=51;w>=0;w--){
    const ws=new Date(mondayThisWeek); ws.setDate(mondayThisWeek.getDate()-w*7)
    const week=[]
    for(let d=0;d<7;d++){
      const dt=new Date(ws); dt.setDate(ws.getDate()+d)
      if(dt>today){week.push(null);continue}
      const key=toLocalKey(dt)
      const km=map[key]||0
      week.push({key,km,lv:km===0?0:km<4?1:km<6?2:km<10?3:4})
    }
    weeks.push({weekStart:toLocalKey(ws),days:week})
  }
  return weeks
}

/* ── Aerobic Trend Data ──────────────────────────────── */
function buildAerobicTrend(runs) {
  return runs
    .filter(r => r.average_heartrate && r.average_speed && r.distance > 2000)
    .sort((a,b)=>a.start_date.localeCompare(b.start_date))
    .map(r => ({
      date:  format(new Date(r.start_date),'MMM d'),
      fullDate: r.start_date,
      hr:    Math.round(r.average_heartrate),
      pace:  parseFloat(paceToSecs(r.average_speed).toFixed(1)),  // secs/km
      paceLabel: fmtPace(r.average_speed),
      efficiency: parseFloat(((r.average_speed * 3.6) / r.average_heartrate * 100).toFixed(2)),  // km/h per 100bpm
      dist:  parseFloat(fmtDist(r.distance)),
      name:  r.name,
    }))
}

/* ── Components ──────────────────────────────────────── */

/* Mini zone bars */
function MiniZones({ zones }) {
  if (!zones) return <div style={{height:5,background:'var(--fill-1)',borderRadius:3,marginTop:6}}/>
  return (
    <div style={{display:'flex',height:5,borderRadius:3,overflow:'hidden',gap:1,marginTop:6}}>
      {ZONE_KEYS.map((z,i)=>zones[z]>0.5&&(
        <div key={z} style={{flex:zones[z],background:ZONE_COLORS[i]}} title={`${z}: ${zones[z].toFixed(0)}%`}/>
      ))}
    </div>
  )
}

/* Metric Ring */
function MetricRing({ value, max, color, label, sub, size=96 }) {
  const r=(size-16)/2, circ=2*Math.PI*r, pct=Math.min(1,Math.max(0,(value??0)/max))
  return (
    <div className="ring-card">
      <div style={{position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center'}}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{overflow:'visible'}}>
          <circle fill="none" cx={size/2} cy={size/2} r={r} strokeWidth={8} stroke="var(--fill-1)"/>
          <circle fill="none" cx={size/2} cy={size/2} r={r} strokeWidth={8}
            stroke={color} strokeDasharray={circ} strokeDashoffset={circ*(1-pct)}
            strokeLinecap="round"
            style={{transformOrigin:'center',transform:'rotate(-90deg)',transition:'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)'}}/>
        </svg>
        <div style={{position:'absolute',textAlign:'center'}}>
          <div className="ring-value" style={{color}}>{value!=null?Math.round(value):'--'}</div>
        </div>
      </div>
      <div><div className="ring-label">{label}</div>{sub&&<div className="ring-sub">{sub}</div>}</div>
    </div>
  )
}

/* ── Day Run Card (individual run widget) ────────────── */
function DayRunCard({ run, onClick }) {
  return (
    <div className="day-run-card" onClick={()=>onClick(run)}>
      <div className="day-run-date">{fmtDate(run.start_date)}</div>
      <div className="day-run-name">{run.name}</div>
      <div className="day-run-stats">
        <span className="day-run-dist">{fmtDist(run.distance)} <span>km</span></span>
        <span className="day-run-pace">{fmtPace(run.average_speed)} <span>/km</span></span>
      </div>
      {run.average_heartrate && (
        <div style={{fontSize:'0.76rem',color:'var(--red)',fontWeight:600,marginTop:4}}>
          ♥ {Math.round(run.average_heartrate)} bpm avg
        </div>
      )}
      <MiniZones zones={run.hrZones}/>
      <div className="day-run-arrow">→</div>
    </div>
  )
}

/* ── Period Summary Card ─────────────────────────────── */
function PeriodCard({ period, label, onClick }) {
  return (
    <div className="period-card" onClick={()=>onClick(period)} style={{cursor:'pointer'}}>
      <div className="period-label">{label}</div>
      <div className="period-head">
        <div className="period-dist">{fmtDist(period.distance)} <span style={{fontSize:'0.85rem',fontWeight:500,color:'var(--text-2)'}}>km</span></div>
        <div className="period-dur">{fmtDur(period.moving_time)}</div>
      </div>
      <div className="period-stats">
        <div className="period-row"><span className="period-row-label">Runs</span><span className="period-row-val">{period.runs}</span></div>
        <div className="period-row"><span className="period-row-label">Avg HR</span><span className="period-row-val">{period.avgHR?`${period.avgHR} bpm`:'—'}</span></div>
        <div className="period-row"><span className="period-row-label">Max HR</span><span className="period-row-val">{period.maxHR?`${period.maxHR} bpm`:'—'}</span></div>
        <div className="period-row"><span className="period-row-label">Avg Pace</span><span className="period-row-val">{fmtPace(period.distance/period.moving_time)}</span></div>
      </div>
      <MiniZones zones={period.zones}/>
      {period.zones && (
        <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:5}}>
          {ZONE_KEYS.map((z,i)=>period.zones[z]>0.5&&(
            <span key={z} style={{fontSize:'0.64rem',color:ZONE_COLORS[i],fontWeight:700}} title={ZONE_HR[i]}>{z} ({ZONE_HR[i].split(' ')[1]}): {period.zones[z].toFixed(0)}%</span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Period Detail Modal ─────────────────────────────── */
function PeriodModal({ period, label, onClose, onRunClick }) {
  useEffect(()=>{
    document.body.style.overflow='hidden'
    const esc=(e)=>{ if(e.key==='Escape') onClose() }
    window.addEventListener('keydown',esc)
    return ()=>{ document.body.style.overflow=''; window.removeEventListener('keydown',esc) }
  },[onClose])

  return (
    <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div className="modal-sheet">
        <div className="modal-handle"/>
        <div className="modal-header">
          <h2 className="modal-title">{label}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-stats-grid">
            <div className="modal-stat"><div className="modal-stat-val" style={{color:'var(--blue)'}}>{fmtDist(period.distance)}</div><div className="modal-stat-lbl">km</div></div>
            <div className="modal-stat"><div className="modal-stat-val">{fmtDur(period.moving_time)}</div><div className="modal-stat-lbl">Duration</div></div>
            <div className="modal-stat"><div className="modal-stat-val">{period.runs}</div><div className="modal-stat-lbl">Runs</div></div>
            <div className="modal-stat"><div className="modal-stat-val" style={{color:'var(--red)'}}>{period.avgHR||'—'}</div><div className="modal-stat-lbl">Avg HR</div></div>
            <div className="modal-stat"><div className="modal-stat-val" style={{color:'var(--red)'}}>{period.maxHR||'—'}</div><div className="modal-stat-lbl">Max HR</div></div>
            <div className="modal-stat"><div className="modal-stat-val">{fmtPace(period.distance/period.moving_time)}</div><div className="modal-stat-lbl">Avg Pace</div></div>
          </div>

          {period.zones && (
            <div>
              <div className="modal-section-title">HR Zone Breakdown</div>
              <div style={{background:'var(--bg-card2)',borderRadius:'var(--radius-md)',padding:'14px 16px'}}>
                <div className="zone-list">
                  {ZONE_KEYS.map((z,i)=>(
                    <div key={z} className="zone-row">
                      <span className="zone-lbl" style={{color:ZONE_COLORS[i]}} title={ZONE_HR[i]}>{z} <span style={{fontSize:'0.55rem', opacity:0.8}}>{ZONE_HR[i].replace(' bpm','')}</span></span>
                      <span className="zone-name">{ZONE_NAMES[i]}</span>
                      <div className="zone-track"><div className="zone-fill" style={{width:`${period.zones[z]}%`,background:ZONE_COLORS[i]}}/></div>
                      <span className="zone-pct">{period.zones[z].toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',height:10,borderRadius:5,overflow:'hidden',gap:1,marginTop:14}}>
                  {ZONE_KEYS.map((z,i)=>period.zones[z]>0.5&&(
                    <div key={z} style={{flex:period.zones[z],background:ZONE_COLORS[i]}}/>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="modal-section-title">Runs in this period</div>
            <div style={{background:'var(--bg-card2)',borderRadius:'var(--radius-md)',overflow:'hidden'}}>
              {period.items.map((r,i)=>(
                <div key={r.id} onClick={()=>{ onClose(); onRunClick(r) }}
                  style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'11px 16px',borderBottom:i<period.items.length-1?'1px solid var(--separator)':'none',cursor:'pointer',transition:'background 0.1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--fill-1)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >
                  <div>
                    <div style={{fontWeight:600,fontSize:'0.88rem'}}>{r.name}</div>
                    <div style={{fontSize:'0.75rem',color:'var(--text-2)',marginTop:2}}>{fmtDate(r.start_date)}</div>
                  </div>
                  <div style={{textAlign:'right',fontSize:'0.82rem'}}>
                    <div style={{fontWeight:700,color:'var(--blue)'}}>{fmtDist(r.distance)} km</div>
                    <div style={{color:'var(--text-2)'}}>{fmtPace(r.average_speed)} /km</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── HR Stream Chart (inside run modal) ──────────────── */
function HRStreamChart({ data }) {
  if (!data || !data.length) return null

  // Sample to max 200 points
  const step = Math.max(1, Math.floor(data.length/200))
  const pts = data.filter((_,i)=>i%step===0).map(d=>({
    ...d,
    fill: Z_HEX[d.zone]
  }))

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={pts} barSize={Math.max(1,600/pts.length)} margin={{top:4,right:0,bottom:15,left:10}}>
        <XAxis dataKey="timeLabel" stroke="transparent"
          tick={{fill:'var(--text-3)',fontSize:10}} minTickGap={60} tickMargin={4}
          label={{value:'Time',position:'insideBottom',offset:-10,style:{fill:'var(--text-3)',fontSize:10}}}/>
        <YAxis domain={['dataMin - 10','dataMax + 5']} stroke="transparent"
          tick={{fill:'var(--text-3)',fontSize:10}} width={45}
          label={{value:'HR (bpm)',angle:-90,position:'insideLeft',style:{fill:'var(--text-3)',fontSize:10}}}/>
        <Tooltip
          content={({active,payload})=>active&&payload?.length?(
            <div style={{background:'var(--bg-modal)',border:'1px solid var(--separator)',borderRadius:8,padding:'8px 12px',fontSize:'0.8rem'}}>
              <div style={{color:'var(--text-2)',marginBottom:3}}>{payload[0]?.payload.timeLabel}</div>
              <div style={{fontWeight:700,color:payload[0]?.payload.fill}}>{payload[0]?.value} bpm · Z{payload[0]?.payload.zone+1}</div>
            </div>
          ):null}
          cursor={false}
        />
        <Bar dataKey="hr" radius={[2,2,0,0]}>
          {pts.map((p,i)=><Cell key={i} fill={p.fill}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}


/* ── Run Detail Modal ────────────────────────────────── */
function RunModal({ run, accessToken, onClose }) {
  const [hrStream, setHrStream]     = useState(null)
  const [loadingStream, setLoadingStream] = useState(true)
  const [kmSplits, setKmSplits]     = useState(null)

  useEffect(()=>{
    document.body.style.overflow='hidden'
    const esc=(e)=>{ if(e.key==='Escape') onClose() }
    window.addEventListener('keydown',esc)
    return ()=>{ document.body.style.overflow=''; window.removeEventListener('keydown',esc) }
  },[onClose])

  // Fetch live HR stream from Strava
  useEffect(()=>{
    if (!accessToken || !run.id) return
    // eslint-disable-next-line
    setLoadingStream(true)
    fetch(`https://www.strava.com/api/v3/activities/${run.id}/streams?keys=time,heartrate,velocity_smooth&key_by_type=true`,
      {headers:{Authorization:`Bearer ${accessToken}`}})
      .then(r=>r.ok?r.json():null)
      .then(data=>{
        if (!data?.heartrate?.data) { setLoadingStream(false); return }
        const hrData = data.heartrate.data
        const timeData = data.time?.data || hrData.map((_,i)=>i)
        const velData  = data.velocity_smooth?.data || []
        // Build chart points
        const pts = hrData.map((hr,i)=>({
          hr,
          zone:   hrToZone(hr),
          time:   timeData[i],
          timeLabel: fmtDur(timeData[i]),
          pace:   velData[i] ? paceToSecs(velData[i]) : null,
        }))
        setHrStream(pts)
        setLoadingStream(false)
      })
      .catch(()=>setLoadingStream(false))
  },[run.id, accessToken])

  // Fetch per-km splits from Strava activity detail
  useEffect(()=>{
    if (!accessToken || !run.id) return
    fetch(`https://www.strava.com/api/v3/activities/${run.id}`,
      {headers:{Authorization:`Bearer ${accessToken}`}})
      .then(r=>r.ok?r.json():null)
      .then(data=>{ if (data?.splits_metric) setKmSplits(data.splits_metric) })
      .catch(()=>{})
  },[run.id, accessToken])


  const zoneSeconds = hrStream ? (() => {
    const t=[0,0,0,0,0]
    for(let i=1;i<hrStream.length;i++){
      const dt = (hrStream[i].time||i)-(hrStream[i-1].time||(i-1))
      t[hrStream[i-1].zone] += dt
    }
    return t
  })() : null

  const formStatus = run.decoupling
    ? (run.decoupling<5?{label:'Aerobic ✓',color:'var(--green)'}
       :run.decoupling<8?{label:'Moderate',color:'var(--orange)'}
       :{label:'Cardiac Drift ⚠',color:'var(--red)'})
    : null

  return (
    <div className="modal-overlay" onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div className="modal-sheet">
        <div className="modal-handle"/>
        <div className="modal-header">
          <h2 className="modal-title">{run.name}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* Date */}
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div className="run-dot" style={{width:8,height:8}}/>
            <span style={{color:'var(--text-2)',fontSize:'0.85rem'}}>{fmtDateLong(run.start_date)}</span>
          </div>

          {/* Primary stats */}
          <div className="modal-stats-grid">
            {[
              [fmtDist(run.distance),'km','var(--blue)'],
              [fmtPace(run.average_speed),'min/km',null],
              [fmtDur(run.moving_time),'Duration',null],
              [run.average_heartrate?Math.round(run.average_heartrate):'—','Avg HR','var(--red)'],
              [run.max_heartrate?Math.round(run.max_heartrate):'—','Max HR','var(--red)'],
              [run.total_elevation_gain?`${Math.round(run.total_elevation_gain)}m`:'—','Elevation','var(--orange)'],
            ].map(([v,l,c])=>(
              <div className="modal-stat" key={l}>
                <div className="modal-stat-val" style={c?{color:c}:{}}>{v}</div>
                <div className="modal-stat-lbl">{l}</div>
              </div>
            ))}
          </div>

          {/* ── HR Over Time Chart ── */}
          <div>
            <div className="modal-section-title" style={{marginBottom:4}}>
              Heart Rate Over Time
              {run.average_heartrate && <span style={{marginLeft:8,color:'var(--red)',fontSize:'0.85rem'}}>avg {Math.round(run.average_heartrate)} bpm</span>}
            </div>
            <div style={{fontSize:'0.75rem',color:'var(--text-2)',marginBottom:8}}>
              <strong style={{color:'var(--text-1)'}}>How to read:</strong> Your heart rate at each point in the run, colored by zone.
            </div>
            <div style={{background:'var(--bg-card2)',borderRadius:'var(--radius-md)',padding:'12px 4px 4px'}}>
              {loadingStream
                ? <div style={{textAlign:'center',padding:'20px',color:'var(--text-3)',fontSize:'0.82rem'}}>Loading HR stream…</div>
                : hrStream
                  ? <HRStreamChart data={hrStream}/>
                  : <div style={{textAlign:'center',padding:'20px',color:'var(--text-3)',fontSize:'0.82rem'}}>No HR stream available for this run</div>
              }
              {/* Zone legend */}
              <div style={{display:'flex',gap:12,flexWrap:'wrap',padding:'8px 12px',fontSize:'0.72rem'}}>
                {Z_HEX.map((c,i)=>(
                  <span key={i} style={{display:'flex',alignItems:'center',gap:4,color:c,fontWeight:700}}>
                    <span style={{width:8,height:8,borderRadius:2,background:c,display:'inline-block'}}/>Z{i+1} ({ZONE_HR[i]})
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Aerobic Decoupling ── */}
          {kmSplits && kmSplits.length > 1 && (
            <div>
              <div className="modal-section-title" style={{marginBottom:8}}>
                1. Aerobic Decoupling
                <span style={{marginLeft:8,fontSize:'0.78rem',color:'var(--text-3)',fontWeight:400}}>Indexed drift plus actual HR/pace context inside one steady run</span>
              </div>
              <div style={{background:'var(--bg-card2)',borderRadius:'var(--radius-md)',padding:'14px 8px 8px'}}>
                <AerobicDecouplingModalChart splits={kmSplits}/>
              </div>
            </div>
          )}


          {zoneSeconds && (
            <div>
              <div className="modal-section-title">Time in Each Zone</div>
              <div style={{background:'var(--bg-card2)',borderRadius:'var(--radius-md)',padding:'4px 0',overflow:'hidden'}}>
                {ZONE_KEYS.map((z,i)=>(
                  <div key={z} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',
                    borderBottom:i<4?'1px solid var(--separator)':'none'}}>
                    <div style={{width:10,height:10,borderRadius:3,background:Z_HEX[i],flexShrink:0,boxShadow:`0 0 6px ${Z_HEX[i]}80`}}/>
                    <span style={{width:32,fontWeight:800,fontSize:'0.82rem',color:Z_HEX[i]}}>{z}</span>
                    <span style={{flex:1,fontSize:'0.82rem',color:'var(--text-2)'}}>{ZONE_NAMES[i]}</span>
                    <span style={{fontSize:'0.82rem',color:'var(--text-1)',fontWeight:700,width:50,textAlign:'right'}}>
                      {fmtDur(zoneSeconds[i])}
                    </span>
                    <span style={{fontSize:'0.72rem',color:'var(--text-3)',width:60,textAlign:'right'}}>
                      {ZONE_HR[i]}
                    </span>
                  </div>
                ))}
                {/* stacked bar */}
                <div style={{display:'flex',height:8,margin:'0 16px 12px',borderRadius:4,overflow:'hidden',gap:1,marginTop:8}}>
                  {zoneSeconds.map((s,i)=>s>0&&(
                    <div key={i} style={{flex:s,background:Z_HEX[i]}}/>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* HR Zones from stored data (fallback) */}
          {!zoneSeconds && run.hrZones && (
            <div>
              <div className="modal-section-title">HR Zone Distribution</div>
              <div style={{background:'var(--bg-card2)',borderRadius:'var(--radius-md)',padding:'14px 16px'}}>
                <div className="zone-list">
                  {ZONE_KEYS.map((z,i)=>(
                    <div key={z} className="zone-row">
                      <span className="zone-lbl" style={{color:ZONE_COLORS[i]}}>{z}</span>
                      <span className="zone-name">{ZONE_NAMES[i]}</span>
                      <div className="zone-track"><div className="zone-fill" style={{width:`${run.hrZones[z]}%`,background:ZONE_COLORS[i]}}/></div>
                      <span className="zone-pct">{run.hrZones[z].toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Training Load */}
          <div style={{background:'var(--bg-card2)',borderRadius:'var(--radius-md)',padding:'14px 16px'}}>
            <div className="modal-section-title" style={{marginBottom:10}}>Training Load</div>
            <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
              <div>
                <div style={{fontSize:'1.4rem',fontWeight:800,color:'var(--purple)'}}>{run.rtss?Math.round(run.rtss):'—'}</div>
                <div style={{fontSize:'0.72rem',color:'var(--text-2)',marginTop:2}}>TSS Score</div>
              </div>
              {run.decoupling!=null&&(
                <div>
                  <div style={{fontSize:'1.4rem',fontWeight:800,color:formStatus?.color}}>{run.decoupling.toFixed(1)}%</div>
                  <div style={{fontSize:'0.72rem',color:'var(--text-2)',marginTop:2}}>Aerobic Decoupling</div>
                </div>
              )}
              {formStatus&&<div style={{display:'flex',alignItems:'center'}}>{decBadge(run.decoupling)}</div>}
            </div>
          </div>

          {/* All details */}
          <div>
            <div className="modal-section-title">All Details</div>
            <div style={{background:'var(--bg-card2)',borderRadius:'var(--radius-md)',padding:'4px 0',overflow:'hidden'}}>
              {[
                ['Distance',`${fmtDist(run.distance)} km`],
                ['Moving Time',fmtDur(run.moving_time)],
                ['Average Pace',`${fmtPace(run.average_speed)} /km`],
                ['Average Speed',run.average_speed?`${(run.average_speed*3.6).toFixed(1)} km/h`:'—'],
                ['Avg Heart Rate',run.average_heartrate?`${Math.round(run.average_heartrate)} bpm`:'—'],
                ['Max Heart Rate',run.max_heartrate?`${Math.round(run.max_heartrate)} bpm`:'—'],
                ['Elevation Gain',run.total_elevation_gain?`${Math.round(run.total_elevation_gain)} m`:'—'],
                ['TSS',run.rtss?Math.round(run.rtss):'—'],
                ['Aerobic Decoupling',run.decoupling!=null?`${run.decoupling.toFixed(1)}%`:'—'],
              ].map(([l,v],i,arr)=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                  padding:'11px 16px',borderBottom:i<arr.length-1?'1px solid var(--separator)':'none',fontSize:'0.88rem'}}>
                  <span style={{color:'var(--text-2)'}}>{l}</span>
                  <span style={{fontWeight:600}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const AerobicCustomTip = ({active,payload,label})=> {
  if(!active||!payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={{background:'var(--bg-modal)',border:'1px solid var(--separator)',borderRadius:10,padding:'12px 14px',minWidth:160}}>
      <div style={{fontWeight:700,marginBottom:6,fontSize:'0.85rem'}}>{d.name}</div>
      <div style={{fontSize:'0.78rem',color:'var(--text-2)',marginBottom:6}}>{d.date} · {d.dist} km</div>
      {payload.map((p,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:6,marginBottom:3,fontSize:'0.8rem'}}>
          <div style={{width:8,height:8,borderRadius:2,background:p.color,flexShrink:0}}/>
          <span style={{color:'var(--text-2)'}}>{p.name}:</span>
          <strong>{p.name==='Pace' ? fmtSecs(p.value)+' /km' : p.name==='Avg HR' ? p.value+' bpm' : p.value.toFixed(1)}</strong>
        </div>
      ))}
    </div>
  )
}

function AerobicTrendChart({ runs }) {
  const data = buildAerobicTrend(runs)
  if (data.length < 3) return (
    <div className="empty"><div className="empty-icon">📉</div><div className="empty-txt">Need at least 3 runs with HR data to show trend</div></div>
  )

  // For pace — lower is better, so we invert the axis
  const minPace = Math.min(...data.map(d=>d.pace))
  const maxPace = Math.max(...data.map(d=>d.pace))
  const paceBuffer = (maxPace-minPace)*0.15 || 10

  return (
    <div style={{display:'flex',flexDirection:'column',gap:24}}>
      {/* Main dual-axis HR vs Pace chart */}
      <div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:8,background:'var(--bg-card2)',padding:'10px 14px',borderRadius:8}}>
          <div style={{fontSize:'0.82rem',color:'var(--text-2)',lineHeight:1.5}}>
            <strong style={{color:'var(--text-1)'}}>How to read:</strong> Look for the gap between your Pace and Heart Rate. As you get fitter, your Heart Rate (red) should stay low even when your Pace (blue) gets faster.
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{top:10,right:48,bottom:15,left:10}}>
            <CartesianGrid strokeDasharray="2 6" stroke="var(--separator)" vertical={false}/>
            <XAxis dataKey="date" stroke="transparent"
              tick={{fill:'var(--text-3)',fontSize:10}} tickMargin={8} minTickGap={40}
              label={{value:'Date',position:'insideBottom',offset:-10,style:{fill:'var(--text-3)',fontSize:10}}}/>
            <YAxis yAxisId="hr" stroke="transparent"
              domain={[d=>Math.max(60,d-15), d=>d+10]}
              tick={{fill:'var(--text-3)',fontSize:10}} width={45} 
              label={{value:'HR (bpm)',angle:-90,position:'insideLeft',style:{fill:'var(--text-3)',fontSize:10}}}/>
            <YAxis yAxisId="pace" orientation="right" stroke="transparent"
              domain={[maxPace+paceBuffer, minPace-paceBuffer]}
              tick={{fill:'var(--text-3)',fontSize:10}} width={45}
              tickFormatter={v=>fmtSecs(v)}
              label={{value:'Pace',angle:90,position:'insideRight',style:{fill:'var(--text-3)',fontSize:10}}}/>
            <Tooltip content={<AerobicCustomTip/>}/>
            <Legend wrapperStyle={{fontSize:'0.78rem',paddingTop:12}}/>
            <Area yAxisId="hr" type="monotone" dataKey="hr" name="Avg HR"
              stroke="var(--red)" fill="var(--red-bg)" strokeWidth={2} dot={{r:3,fill:'var(--red)',strokeWidth:0}} activeDot={{r:5}}/>
            <Line yAxisId="pace" type="monotone" dataKey="pace" name="Pace"
              stroke="var(--blue)" strokeWidth={2} strokeDasharray="5 3" dot={{r:3,fill:'var(--blue)',strokeWidth:0}} activeDot={{r:5}}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Aerobic efficiency score over time */}
      <div>
        <div style={{fontWeight:700,fontSize:'0.95rem',marginBottom:6}}>Aerobic Efficiency Score</div>
        <div style={{fontSize:'0.78rem',color:'var(--text-2)',marginBottom:12,lineHeight:1.6,background:'var(--bg-card2)',padding:'10px 14px',borderRadius:8}}>
          <strong style={{color:'var(--text-1)'}}>How to read:</strong> A rising green line means your endurance is improving. (Score = Speed ÷ Heart Rate × 100).
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={data} margin={{top:10,right:8,bottom:15,left:10}}>
            <defs>
              <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--green)" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="var(--green)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 6" stroke="var(--separator)" vertical={false}/>
            <XAxis dataKey="date" stroke="transparent"
              tick={{fill:'var(--text-3)',fontSize:10}} minTickGap={40} tickMargin={8}
              label={{value:'Date',position:'insideBottom',offset:-10,style:{fill:'var(--text-3)',fontSize:10}}}/>
            <YAxis stroke="transparent" tick={{fill:'var(--text-3)',fontSize:10}} width={45}
              domain={[d=>Math.max(0,d-0.5), d=>d+0.5]}
              label={{value:'Score',angle:-90,position:'insideLeft',style:{fill:'var(--text-3)',fontSize:10}}}/>
            <Tooltip content={({active,payload})=>active&&payload?.[0]?(
              <div style={{background:'var(--bg-modal)',border:'1px solid var(--separator)',borderRadius:8,padding:'8px 12px',fontSize:'0.8rem'}}>
                <div style={{fontWeight:700,marginBottom:4}}>{payload[0].payload.name}</div>
                <div style={{color:'var(--green)'}}>Efficiency: <strong>{payload[0].value.toFixed(2)}</strong></div>
              </div>
            ):null}/>
            <Area type="monotone" dataKey="efficiency" name="Efficiency"
              stroke="var(--green)" strokeWidth={2.5} fill="url(#effGrad)"
              dot={{r:3,fill:'var(--green)',strokeWidth:0}} activeDot={{r:5}}/>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ── Training Calendar ───────────────────────────────── */
function TrainingCalendar({ runs }) {
  const weeks = buildCalGrid(runs)
  const monthLabels = []
  let lastMonth=''
  weeks.forEach((w,i)=>{ const m=w.weekStart.slice(0,7); if(m!==lastMonth){monthLabels.push({idx:i,label:new Date(w.weekStart).toLocaleDateString('en-IN',{month:'short'})}); lastMonth=m} else monthLabels.push({idx:i,label:''}) })
  return (
    <div className="cal-wrap">
      <div style={{display:'flex',alignItems:'flex-start'}}>
        <div style={{display:'flex',flexDirection:'column',gap:3,paddingTop:22,paddingRight:6,flexShrink:0}}>
          {DAY_LABELS.map((d,i)=>(
            <div key={d} style={{height:13,display:'flex',alignItems:'center',fontSize:'0.62rem',color:'var(--text-3)',fontWeight:500,whiteSpace:'nowrap'}}>
              {[0,2,4,6].includes(i)?d:''}
            </div>
          ))}
        </div>
        <div style={{flex:1,minWidth:0,overflowX:'auto'}}>
          <div style={{display:'flex',gap:3,marginBottom:4,paddingLeft:1}}>
            {monthLabels.map((ml,i)=>(
              <div key={i} style={{width:13,flexShrink:0,fontSize:'0.62rem',color:'var(--text-3)',fontWeight:600,overflow:'visible',whiteSpace:'nowrap'}}>
                {ml.label}
              </div>
            ))}
          </div>
          <div className="cal-grid">
            {weeks.map((w,wi)=>(
              <div key={wi} className="cal-week">
                {w.days.map((d,di)=>(
                  d===null?<div key={di} style={{width:13,height:13}}/>
                  :<div key={di} className={`cal-cell ${d.lv?`lv${d.lv}`:''}`} title={d.km?`${d.key}: ${d.km.toFixed(1)} km`:d.key}/>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="cal-legend" style={{marginTop:8}}>
        <span>Less</span>
        {[0,1,2,3,4].map(l=><div key={l} className={`cal-cell ${l?`lv${l}`:''}`} style={{width:11,height:11,flexShrink:0}}/>)}
        <span>More</span>
      </div>
    </div>
  )
}

/* ── Nav ─────────────────────────────────────────────── */

const COLOR_SCHEMES = [
  { id: 'strava', label: 'Default Theme' },
  { id: 'apple-dark', label: 'Apple Dark' },
  { id: 'hear-ai', label: 'Hear.ai Theme' },
  { id: 'apple', label: 'Apple Light' },
  { id: 'google', label: 'Google Material' }
]

const TAB_TITLES = {
  overview: 'Dashboard',
  plan: 'HM Plan',
}

const TimeFilter = ({ val, onChange }) => (
  <select value={val} onChange={e=>onChange(Number(e.target.value))} className="theme-toggle" style={{padding:'6px 10px', fontSize:'0.82rem', borderRadius:8, marginLeft:'auto', minWidth:110}}>
    <option value={7}>7 Days</option>
    <option value={14}>14 Days</option>
    <option value={30}>1 Month</option>
    <option value={90}>3 Months</option>
    <option value={180}>6 Months</option>
    <option value={0}>All Time</option>
  </select>
)

/* ══ Main Component ══════════════════════════════════ */
export default function DashboardClient({ athleteId, accessToken }) {
  const [runs,       setRuns]       = useState([])
  const [isSyncing,  setIsSyncing]  = useState(false)
  const [syncMsg,    setSyncMsg]    = useState('')
  const [pmc,        setPmc]        = useState(null)
  const [pmcData,    setPmcData]    = useState([])
  const [tab,        setTab]        = useState('overview')
  const [totalKm,    setTotalKm]    = useState(0)
  const [theme,      setTheme]      = useState(() => {
    if (typeof window === 'undefined') return 'strava'
    const saved = window.localStorage.getItem('tracker-color-scheme') || window.localStorage.getItem('tracker-theme')
    return saved === 'dark' ? 'strava' : saved || 'strava'
  })
  const [selectedRun, setSelectedRun]     = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState(null)
  const [periodLabel, setPeriodLabel]     = useState('')
  const [chartDays, setChartDays] = useState({ aerobic: 90, zones: 90, cadence: 90, heat: 90, consistency: 90, ef: 90, paceHR: 90 })

  const updateDays = (k, v) => setChartDays(p => ({...p, [k]: v}))
  const getRunsForDays = (days) => days === 0 ? runs : runs.filter(r => isAfter(parseISO(r.start_date), subDays(new Date(), days)))

  useEffect(()=>{ document.documentElement.setAttribute('data-theme',theme); localStorage.setItem('tracker-color-scheme',theme) },[theme])

  const load = useCallback(async () => {
    const snap=await getDocs(query(collection(db,'runs'),orderBy('start_date','desc')))
    const data=[]; snap.forEach(d=>data.push(d.data()))
    setRuns(data); setTotalKm(data.reduce((a,r)=>a+(r.distance||0)/1000,0))
    if(data.length){ const chart=calculatePMC(data); setPmcData(chart); setPmc(chart[chart.length-1]) }
  },[])
  // eslint-disable-next-line
  useEffect(()=>{ load() },[load])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      let page=1, all=[], more=true
      while (more) {
        setSyncMsg(`Fetching page ${page}…`)
        const r = await fetch(
          `https://www.strava.com/api/v3/athlete/activities?per_page=100&page=${page}`,
          { headers: { Authorization: `Bearer ${accessToken}` } })
        const acts = await r.json()
        if (!Array.isArray(acts) || !acts.length) { more=false; break }
        all = [...all, ...acts.filter(a => a.type === 'Run')]; page++
      }

      for (let i = 0; i < all.length; i++) {
        const run = all[i]
        setSyncMsg(`Processing ${i+1}/${all.length}: ${run.name}`)

        // HR + velocity streams
        let streams = null
        try {
          const sr = await fetch(
            `https://www.strava.com/api/v3/activities/${run.id}/streams?keys=time,heartrate,velocity_smooth&key_by_type=true`,
            { headers: { Authorization: `Bearer ${accessToken}` } })
          if (sr.ok) streams = await sr.json()
        } catch {}

        // Weather from Open-Meteo (free, no API key)
        let temperature = null, humidity = null
        if (run.start_latlng?.length === 2) {
          try {
            const wx = await fetchWeatherForRun(run.start_latlng[0], run.start_latlng[1], run.start_date)
            if (wx) { temperature = wx.temperature; humidity = wx.humidity }
          } catch {}
        }

        await setDoc(doc(db, 'runs', run.id.toString()), {
          id:                   run.id,
          name:                 run.name,
          distance:             run.distance,
          moving_time:          run.moving_time,
          start_date:           run.start_date,
          average_heartrate:    run.average_heartrate || null,
          max_heartrate:        run.max_heartrate || null,
          average_speed:        run.average_speed,
          total_elevation_gain: run.total_elevation_gain || 0,
          average_cadence:      run.average_cadence ? Math.round(run.average_cadence * 2) : null, // strides→SPM
          start_latlng:         run.start_latlng || null,
          workout_type:         run.workout_type || 0,
          sport_type:           run.sport_type || 'Run',
          temperature,
          humidity,
          rtss:       calculateTSS(run.moving_time, run.average_heartrate),
          decoupling: streams ? calculateDecoupling(streams) : null,
          hrZones:    streams ? calculateHRZones(streams) : null,
          trimmed:    streams ? calculateTrimmedMetrics(streams) : null,
        })
      }

      setSyncMsg(`Sync complete ✓ — ${all.length} runs`)
      await load()
    } catch(e) { console.error(e); setSyncMsg('Error — see console') }
    setIsSyncing(false)
  }


  // Aggregates
  const weeks  = aggregatePeriods(runs, getWeekStart, 4)
  const months = aggregatePeriods(runs, getMonthKey,  4)
  
  const aerobicRuns = getRunsForDays(chartDays.aerobic)
  const zonesRuns   = getRunsForDays(chartDays.zones)
  const cadenceRuns = getRunsForDays(chartDays.cadence)
  const heatRuns    = getRunsForDays(chartDays.heat)
  const consistencyRuns = getRunsForDays(chartDays.consistency)
  const efRuns      = getRunsForDays(chartDays.ef)
  const paceHRRuns  = getRunsForDays(chartDays.paceHR)

  const runsWithZones = zonesRuns.filter(r=>r.hrZones)
  const avgZones = runsWithZones.length?(() => {
    const t={Z1:0,Z2:0,Z3:0,Z4:0,Z5:0}
    runsWithZones.forEach(r=>ZONE_KEYS.forEach(z=>t[z]+=r.hrZones[z]))
    const n=runsWithZones.length
    return Object.fromEntries(ZONE_KEYS.map(z=>[z,t[z]/n]))
  })():null

  const openPeriod = (period, lbl) => { setSelectedPeriod(period); setPeriodLabel(lbl) }

  return (
    <>
      <div className="app-shell">
        <header className="top-shell">
          <div className="top-shell-main">
            <Link className="brand-lockup" href="/">
              <span>
                <span className="logo-text">Tracker</span>
                <span className="brand-sub">Running analytics</span>
              </span>
            </Link>
            <nav className="top-tabs">
              {[
                { id:'overview', icon:'📊', label:'Dashboard' },
                { id:'plan', icon:'📅', label:'HM Plan' },
              ].map(n=>(
                <button key={n.id} onClick={()=>setTab(n.id)} className={`top-tab ${tab===n.id?'active':''}`}>
                  <span>{n.icon}</span>{n.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="top-actions">
            <select
              value={theme}
              onChange={e=>setTheme(e.target.value)}
              className="scheme-select"
              aria-label="Color scheme"
            >
              {COLOR_SCHEMES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <button className="btn-primary" onClick={handleSync} disabled={isSyncing}>
              {isSyncing?<><span className="sync-dot"/>&nbsp;Syncing…</>:'⟳ Sync'}
            </button>
          </div>
        </header>

        <main className="main-content">
          <div className="page-header compact">
            <div>
              <h1 className="page-title">{TAB_TITLES[tab]}</h1>
              <p className="page-sub">{runs.length} runs · {totalKm.toFixed(0)} km · Athlete #{athleteId}</p>
            </div>
          </div>

          {syncMsg&&<div className="sync-bar"><div className="sync-dot"/><span className="sync-msg">{syncMsg}</span></div>}

          {/* ══ OVERVIEW ══ */}
          {tab==='overview' && <>
            {/* 1. Consistency Heatmap */}
            <CollapsibleSection title="Consistency Heatmap" subtitle="Github style training calendar">
              <div style={{ paddingTop: 16 }}>
                <div style={{display:'flex', justifyContent:'center'}}>
                  <TrainingCalendar runs={runs}/>
                </div>
              </div>
            </CollapsibleSection>

            {/* 2. Current Week Summary */}
            <ThisWeekWidget runs={runs} />

            {/* 3. Recent Runs */}
            {runs.length>0 && (
              <CollapsibleSection title="Recent Runs" subtitle="Your last 7 activities">
                <div className="day-runs-row" style={{ paddingTop: 16 }}>
                  {runs.slice(0, 7).map(r=>(
                    <div key={r.id} className="day-run-card" onClick={()=>{ setSelectedRun(r); setSelectedPeriod(null); setPeriodLabel('') }}>
                      <div className="day-run-date">{new Date(r.start_date).toLocaleDateString('en-US',{weekday:'short',day:'numeric'})}</div>
                      <div className="day-run-dist">{(r.distance/1000).toFixed(1)} km</div>
                      <div className="day-run-metrics" style={{ display:'flex', flexDirection:'column', gap: 6, marginTop: 8, fontSize: '0.75rem', textAlign:'left' }}>
                        <div>⏱ {r.moving_time?fmtDur(r.moving_time):'--'}</div>
                        <div>❤️ {r.average_heartrate?Math.round(r.average_heartrate):'--'} / {r.max_heartrate?Math.round(r.max_heartrate):'--'} bpm</div>
                        <div>👟 {r.average_cadence?Math.round(r.average_cadence):'--'} spm</div>
                      </div>
                      {r.hrZones && (
                        <div style={{display:'flex', width:'100%', height:6, borderRadius:3, overflow:'hidden', marginTop:12}}>
                          {ZONE_KEYS.map((z,i) => <div key={z} style={{width:`${r.hrZones[z]}%`, background:ZONE_COLORS[i]}} />)}
                        </div>
                      )}
                      <div className="day-run-name" style={{marginTop:12, fontWeight:600}}>{r.name}</div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Aerobic trend */}
            <CollapsibleSection title="Aerobic Fitness Trend" subtitle="Pace vs Heart Rate over time">
              <div style={{ paddingTop: 16 }}>
                <div style={{display:'flex', justifyContent:'flex-end', marginBottom: 16}}>
                  <TimeFilter val={chartDays.aerobic} onChange={v=>updateDays('aerobic',v)}/>
                </div>
                <AerobicTrendChart runs={aerobicRuns}/>
              </div>
            </CollapsibleSection>

            {/* 4. Weekly Progress */}
            <CollapsibleSection title="Weekly Progress" subtitle="Distance and time per week">
              <div style={{ paddingTop: 16 }}>
                {weeks.length===0
                  ? <div className="empty"><div className="empty-icon">📅</div><div className="empty-txt">Sync data to see weekly progress</div></div>
                  : <div className="period-grid">
                      {weeks.map((w,i)=><PeriodCard key={w.key} period={w}
                        label={i===0?`This week (${fmtDate(w.key)})`:`Week of ${fmtDate(w.key)}`}
                        onClick={p=>openPeriod(p,i===0?'This Week':`Week of ${fmtDate(w.key)}`)}/>)}
                    </div>
                }
              </div>
            </CollapsibleSection>

            {/* 5. Monthly Progress (Collapsed) */}
            <CollapsibleSection title="Monthly Progress" subtitle="Distance and time per month">
              <div style={{ paddingTop: 16 }}>
                {months.length===0
                  ? <div className="empty"><div className="empty-icon">📅</div><div className="empty-txt">Sync data to see monthly progress</div></div>
                  : <div className="period-grid">
                      {months.map(m=><PeriodCard key={m.key} period={m}
                        label={new Date(m.key+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'})}
                        onClick={p=>openPeriod(p,new Date(m.key+'-01').toLocaleDateString('en-IN',{month:'long',year:'numeric'}))}/>)}
                    </div>
                }
              </div>
            </CollapsibleSection>

            {/* 6. Aerobic Efficiency Score */}
            <CollapsibleSection title="Aerobic Efficiency Score" subtitle="Speed to Heart Rate ratio">
              <div style={{ paddingTop: 16 }}>
                <div style={{fontSize:'0.82rem',color:'var(--text-2)',lineHeight:1.5,marginBottom:16}}>
                  <strong style={{color:'var(--text-1)'}}>How to read:</strong> A rising line means your endurance is improving. (Score = Speed ÷ Heart Rate × 100).
                </div>
                <div style={{display:'flex', justifyContent:'flex-end', marginBottom: 16}}>
                  <TimeFilter val={chartDays.ef} onChange={v=>updateDays('ef',v)}/>
                </div>
                <EfficiencyFactorChart runs={efRuns} />
              </div>
            </CollapsibleSection>

            {/* 7. Pace at Fixed HR */}
            <CollapsibleSection title="Pace at Fixed HR" subtitle="Estimated pace at 140 bpm">
              <div style={{ paddingTop: 16 }}>
                <div style={{fontSize:'0.82rem',color:'var(--text-2)',lineHeight:1.5,marginBottom:16}}>
                  <strong style={{color:'var(--text-1)'}}>How to read:</strong> A downward trend means you are getting faster at the exact same heart rate (140 bpm).
                </div>
                <div style={{display:'flex', justifyContent:'flex-end', marginBottom: 16}}>
                  <TimeFilter val={chartDays.paceHR} onChange={v=>updateDays('paceHR',v)}/>
                </div>
                <PaceAtFixedHRChart runs={paceHRRuns} />
              </div>
            </CollapsibleSection>

            {/* 8. HR Analysis */}
            <CollapsibleSection title="Heart Rate Zones" subtitle="Distribution of time in zones">
              <div style={{ paddingTop: 16 }}>
                <div style={{display:'flex', justifyContent:'flex-end', marginBottom: 16}}>
                  <TimeFilter val={chartDays.zones} onChange={v=>updateDays('zones',v)}/>
                </div>
                <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap',marginBottom:24}}>
                  {ZONE_KEYS.map((z,i)=>(
                    <div key={z} style={{textAlign:'center',padding:'8px 16px',background:'var(--bg-card2)',borderRadius:12}}>
                      <div style={{color:ZONE_COLORS[i],fontWeight:800,fontSize:'1.1rem'}}>{avgZones ? avgZones[z].toFixed(1) : '--'}%</div>
                      <div style={{fontSize:'0.75rem',color:'var(--text-2)',marginTop:2,fontWeight:600}}>{ZONE_NAMES[i]}</div>
                      <div style={{fontSize:'0.65rem',color:'var(--text-3)',marginTop:4}}>{ZONE_HR[i]}</div>
                    </div>
                  ))}
                </div>
                <div style={{ paddingTop: 16 }}>
                  <WeeklyZoneBar runs={zonesRuns} days={chartDays.zones}/>
                </div>
              </div>
            </CollapsibleSection>



            {/* 9. Weather Impact / Heat Tax */}
            <CollapsibleSection title="Heat Tax Analysis" subtitle="Impact of temperature on EF">
              <div style={{ paddingTop: 16 }}>
                <div style={{fontSize:'0.82rem',color:'var(--text-2)',lineHeight:1.5,marginBottom:16}}>
                  <strong style={{color:'var(--text-1)'}}>How to read:</strong> Look for the green Efficiency line to dip when the orange temperature bars rise. This shows the "heat tax" lowering your performance.
                </div>
                <div style={{display:'flex', justifyContent:'flex-end', marginBottom: 16}}>
                  <TimeFilter val={chartDays.heat} onChange={v=>updateDays('heat',v)}/>
                </div>
                <HeatTaxChart runs={heatRuns}/>
              </div>
            </CollapsibleSection>

            {/* 9. Personal Records (Collapsed) */}
            <PersonalRecords runs={runs} />

            {/* 10. All Runs History (Collapsed) */}
            <CollapsibleSection title="All Runs History" subtitle={`Complete log of your ${runs.length} runs`}>
              <div style={{ paddingTop: 16 }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="runs-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-3)', borderBottom: '1px solid var(--separator)' }}>
                        <th style={{ padding: '10px 8px', fontWeight: 600 }}>Date</th>
                        <th style={{ padding: '10px 8px', fontWeight: 600 }}>Title</th>
                        <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>Dist</th>
                        <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>Duration</th>
                        <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>Pace</th>
                        <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>Avg HR</th>
                        <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>Cadence</th>
                        <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'center' }}>Zones</th>
                        <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>EF</th>
                        <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>Weather</th>
                        <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>TSS</th>
                        <th style={{ padding: '10px 8px', fontWeight: 600, textAlign: 'right' }}>Decoupling</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid var(--separator)', cursor: 'pointer' }} onClick={() => setSelectedRun(r)} className="run-row-hover">
                          <td style={{ padding: '12px 8px', color: 'var(--text-2)' }}>{new Date(r.start_date).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'})}</td>
                          <td style={{ padding: '12px 8px', fontWeight: 500 }}>{r.name}</td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>{(r.distance/1000).toFixed(2)} km</td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-2)' }}>{r.moving_time ? fmtDur(r.moving_time) : '--'}</td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-2)' }}>{r.moving_time ? fmtPace(r.distance/r.moving_time) : '--'}</td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--red)' }}>{r.average_heartrate ? Math.round(r.average_heartrate) : '--'}</td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-2)' }}>{r.average_cadence || '--'}</td>
                          <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                            {r.hrZones ? (
                              <div style={{display:'inline-flex', height: 6, width: 60, borderRadius: 3, overflow: 'hidden'}}>
                                {ZONE_KEYS.map((z, i) => (
                                  <div key={z} style={{width: `${r.hrZones[z]}%`, background: ZONE_COLORS[i]}}></div>
                                ))}
                              </div>
                            ) : '--'}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--green)' }}>
                            {(r.distance && r.moving_time && r.average_heartrate) ? ((r.distance/(r.moving_time/60))/r.average_heartrate).toFixed(2) : '--'}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--text-2)' }}>
                            {r.temperature != null ? `${Math.round(r.temperature)}°C` : '--'}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--orange)' }}>
                            {r.rtss ? Math.round(r.rtss) : '--'}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'right', color: r.decoupling < 5 ? 'var(--green)' : r.decoupling > 8 ? 'var(--red)' : 'var(--orange)' }}>
                            {r.decoupling != null ? `${r.decoupling.toFixed(1)}%` : '--'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                </table>
              </div>
              </div>
            </CollapsibleSection>
          </>}



          {/* ══ HISTORY ══ */}
          {tab==='history' && (
            <div className="card">
              <div className="card-head"><span className="card-title">Full Run History</span><span className="card-meta">{runs.length} runs · tap row for details</span></div>
              <div className="card-body-flush">
                {runs.length===0?<div className="empty"><div className="empty-icon">🏃</div><div className="empty-txt">No runs synced</div></div>
                :<div className="table-wrap"><table className="runs-table">
                  <thead><tr><th>Date</th><th>Name</th><th>Dist</th><th>Pace</th><th>Avg HR</th><th>Max HR</th><th>Time</th><th>Elev</th><th>TSS</th></tr></thead>
                  <tbody>{runs.map(r=>(
                    <tr key={r.id} onClick={()=>setSelectedRun(r)}>
                      <td style={{color:'var(--text-2)'}}>{new Date(r.start_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'})}</td>
                      <td><div className="run-name-wrap"><span className="run-dot"/>{r.name}</div></td>
                      <td><strong>{fmtDist(r.distance)}</strong> km</td>
                      <td>{fmtPace(r.average_speed)}</td>
                      <td>{r.average_heartrate?`${Math.round(r.average_heartrate)} bpm`:'—'}</td>
                      <td>{r.max_heartrate?`${Math.round(r.max_heartrate)} bpm`:'—'}</td>
                      <td>{fmtDur(r.moving_time)}</td>
                      <td>{r.total_elevation_gain?`${Math.round(r.total_elevation_gain)}m`:'—'}</td>
                      <td>{r.rtss?Math.round(r.rtss):'—'}</td>
                    </tr>
                  ))}</tbody>
                </table></div>}
              </div>
            </div>
          )}

          {/* ══ HM PLAN ══ */}
          {tab==='plan' && (
            <TrainingPlanClient runs={runs} />
          )}
        </main>
      </div>

      {selectedRun && <RunModal run={selectedRun} accessToken={accessToken} onClose={()=>setSelectedRun(null)}/>}
      {selectedPeriod && <PeriodModal period={selectedPeriod} label={periodLabel} onClose={()=>setSelectedPeriod(null)} onRunClick={setSelectedRun}/>}
    </>
  )
}
