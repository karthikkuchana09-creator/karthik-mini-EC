export default function PageLoading({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4 animate-fadeIn">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-[3px] border-indigo-100 rounded-full" />
          <div className="absolute inset-0 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-sm text-gray-500 font-medium">{message}</p>
      </div>
    </div>
  );
}
