import { Link } from 'react-router-dom';

function Breadcrumb({ items, className = '' }) {
  return (
    <nav className={`flex items-center gap-1.5 text-sm ${className}`}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <div key={idx} className="flex items-center gap-1.5">
            {idx > 0 && (
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
            {isLast ? (
              <span className="text-gray-900 font-medium truncate max-w-[200px]">{item.label}</span>
            ) : item.to ? (
              <Link to={item.to} className="text-gray-500 hover:text-indigo-600 transition-colors truncate max-w-[200px]">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-500">{item.label}</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default Breadcrumb;
