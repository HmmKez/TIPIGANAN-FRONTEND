export default function PageHeader({ breadcrumb, title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        {breadcrumb && <div className="breadcrumb">{breadcrumb}</div>}
        <div className="page-title">{title}</div>
        {subtitle && <div className="page-subtitle">{subtitle}</div>}
      </div>
      {actions && <div className="flex gap-2" style={{gap:10}}>{actions}</div>}
    </div>
  )
}
