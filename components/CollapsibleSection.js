'use client'

import { useState } from 'react'

export default function CollapsibleSection({ title, defaultOpen = true, children, rightAction, subtitle }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
      <div 
        className="card-head" 
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '16px 20px', userSelect: 'none' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.8rem', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-3)' }}>
            ▶
          </span>
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>{title}</h2>
            {subtitle && <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', display: 'block', marginTop: 2 }}>{subtitle}</span>}
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          {rightAction}
        </div>
      </div>
      
      {isOpen && (
        <div className="card-body" style={{ padding: '0 20px 20px', borderTop: '1px solid var(--separator)' }}>
          {children}
        </div>
      )}
    </div>
  )
}
