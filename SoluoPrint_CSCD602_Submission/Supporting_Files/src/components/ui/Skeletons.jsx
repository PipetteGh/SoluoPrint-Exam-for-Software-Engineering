export function TableSkeleton({ columns = 5, rows = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="skeleton-row">
          {Array.from({ length: columns }).map((_, j) => (
            <td key={j}>
              <div className={`skeleton ${j === 0 ? 'skeleton-w-70' : j === columns - 1 ? 'skeleton-w-30' : 'skeleton-w-100'}`}></div>
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function CardSkeleton() {
  return (
    <div className="card" style={{ padding: '20px' }}>
      <div className="skeleton skeleton-title"></div>
      <div className="skeleton skeleton-text" style={{ marginBottom: '12px' }}></div>
      <div className="skeleton skeleton-text" style={{ marginBottom: '12px', width: '80%' }}></div>
      <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
    </div>
  )
}

export function StatSkeleton() {
  return (
    <div className="stat-card" style={{ padding: '16px' }}>
      <div className="skeleton skeleton-avatar" style={{ borderRadius: '10px' }}></div>
      <div style={{ flex: 1, marginLeft: '14px' }}>
        <div className="skeleton skeleton-text" style={{ width: '40%', height: '12px', marginBottom: '8px' }}></div>
        <div className="skeleton" style={{ width: '60%', height: '24px' }}></div>
      </div>
    </div>
  )
}
