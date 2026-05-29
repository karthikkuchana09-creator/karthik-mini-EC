export default function Card({ children, className = '', hover = false, padding = 'md', accent = false }) {
  const paddingMap = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-card ${
        hover ? 'hover:shadow-card-hover hover:border-gray-300 cursor-pointer transition-all duration-200' : ''
      } ${accent ? 'border-l-4 border-l-indigo-500' : ''} ${paddingMap[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
