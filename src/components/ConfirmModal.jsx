// confirmStyle: 'danger' (red, destructive) | 'warning' (orange, reduces
// access/visibility) | 'primary' (the app's blue, neutral or positive
// actions — grant, activate, restore). Defaults to 'primary' so a caller
// that forgets to set it doesn't end up looking alarmingly orange/red for
// an ordinary action.
const STYLE_COLORS = {
  danger: 'var(--danger)',
  warning: 'var(--warning)',
  primary: 'var(--primary-blue)',
}
const STYLE_ICONS = {
  danger: 'fa-trash-alt',
  warning: 'fa-exclamation-triangle',
  primary: 'fa-check-circle',
}

export default function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', confirmStyle = 'primary', icon, onConfirm, onCancel }) {
  if (!open) return null
  const color = STYLE_COLORS[confirmStyle] || STYLE_COLORS.primary
  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={S.box} onClick={e => e.stopPropagation()}>
        <div style={S.iconWrap}>
          <i className={`fas ${icon || STYLE_ICONS[confirmStyle] || STYLE_ICONS.primary}`}
             style={{ fontSize: 26, color }} />
        </div>
        <div style={S.title}>{title}</div>
        <div style={S.message}>{message}</div>
        <div style={S.actions}>
          <button style={S.cancelBtn} onClick={onCancel}>Cancel</button>
          <button
            style={{ ...S.confirmBtn, background: color }}
            onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 99999,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  box: {
    background: 'var(--bg-white)', borderRadius: 12,
    padding: '32px 28px', maxWidth: 400, width: '90%',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: '50%',
    background: 'var(--bg-main)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17, fontWeight: 600, color: 'var(--text-primary)',
    marginBottom: 8,
  },
  message: {
    fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6,
    marginBottom: 24,
  },
  actions: {
    display: 'flex', gap: 10, width: '100%',
  },
  cancelBtn: {
    flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid var(--border-medium)',
    background: 'var(--bg-white)', color: 'var(--text-primary)',
    fontSize: 14, fontWeight: 500, cursor: 'pointer',
  },
  confirmBtn: {
    flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
    color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
}