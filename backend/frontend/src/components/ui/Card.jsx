export default function Card({ children, className = '', hover = false, padding = 'md' }) {
  const paddingMap = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm ${
        hover ? 'hover:shadow-md hover:border-gray-300 transition-all duration-200' : ''
      } ${paddingMap[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
