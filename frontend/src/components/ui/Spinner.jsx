function Spinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size] || sizeClasses.md} border-2 border-indigo-600 border-t-transparent rounded-full animate-spin`} />
    </div>
  );
}

export default Spinner;
