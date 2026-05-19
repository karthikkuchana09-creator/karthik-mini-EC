function Avatar({ name, email, src, size = 'md', className = '' }) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : email?.charAt(0).toUpperCase() || '?';

  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-12 h-12 text-base',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name || email || 'User'}
        className={`${sizeClasses[size] || sizeClasses.md} rounded-full object-cover ring-2 ring-white shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className={`${sizeClasses[size] || sizeClasses.md} rounded-full bg-indigo-100 text-indigo-700 font-semibold ring-2 ring-white flex items-center justify-center shrink-0 ${className}`}>
      {initials}
    </div>
  );
}

export default Avatar;
