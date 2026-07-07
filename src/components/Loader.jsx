export function Loader({ label = 'Loading...' }) {
  return (
    <div style={{padding:40, textAlign:'center', color:'var(--text-muted)'}}>
      <i className="fas fa-spinner fa-spin" style={{fontSize:24, color:'var(--primary-blue)', marginBottom:10}}></i>
      <div>{label}</div>
    </div>
  )
}

export function EmptyState({ icon = 'fa-inbox', title = 'Nothing here yet', message = '' }) {
  return (
    <div className="empty-state">
      <i className={`fas ${icon}`}></i>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
    </div>
  )
}

export function ErrorMessage({ error, onRetry }) {
  const msg = error?.response?.data?.message || error?.message || 'Something went wrong'
  return (
    <div className="notice-banner warning" style={{margin:'12px 0'}}>
      <i className="fas fa-exclamation-triangle"></i>
      <span>{msg}</span>
      {onRetry && <button className="btn btn-sm btn-secondary" onClick={onRetry} style={{marginLeft:'auto'}}>Retry</button>}
    </div>
  )
}
