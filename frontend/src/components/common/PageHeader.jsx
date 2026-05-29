export default function PageHeader({ title, subtitle, actions, className = '', as: Heading = 'h1' }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 ${className}`}>
      <div className="min-w-0 flex-1">
        <Heading className="text-2xl font-bold text-gray-900 tracking-tight truncate">{title}</Heading>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
}
