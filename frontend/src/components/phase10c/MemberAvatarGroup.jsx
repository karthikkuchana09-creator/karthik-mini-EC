const INITIAL_COLORS = [
  'from-indigo-500 to-indigo-600',
  'from-emerald-500 to-emerald-600',
  'from-violet-500 to-violet-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
];

function Avatar({ member, index }) {
  const name = member.name || member.email || '?';
  const gradient = INITIAL_COLORS[index % INITIAL_COLORS.length];
  return (
    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white shrink-0`}
      title={name}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function MemberAvatarGroup({ members = [], max = 5, size = 'md' }) {
  const visible = members.slice(0, max);
  const overflow = members.length - max;

  const sizeMap = { sm: 'w-6 h-6 text-[9px]', md: 'w-7 h-7 text-[10px]', lg: 'w-9 h-9 text-xs' };
  const ringMap = { sm: 'ring-1', md: 'ring-2', lg: 'ring-2' };
  const overlapMap = { sm: '-ml-1.5', md: '-ml-2', lg: '-ml-2.5' };

  return (
    <div className="flex items-center">
      {visible.map((m, i) => (
        <div key={m.user_id || m.id || i} className={`${i > 0 ? overlapMap[size] : ''}`}>
          <Avatar member={m} index={i} />
        </div>
      ))}
      {overflow > 0 && (
        <div className={`${sizeMap[size]} rounded-full bg-gray-100 text-gray-500 font-semibold ${ringMap[size]} ring-white flex items-center justify-center shrink-0 ${overflow > 0 ? overlapMap[size] : ''}`}>
          +{overflow}
        </div>
      )}
    </div>
  );
}
