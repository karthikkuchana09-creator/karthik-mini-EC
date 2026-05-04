import { Link } from 'react-router-dom';

function Unauthorized() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
        <h2 className="text-3xl font-bold text-red-500 mb-4">403</h2>
        <h1 className="text-2xl font-semibold mb-2">Unauthorized Access</h1>
        <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
        <Link
          to="/dashboard"
          className="text-blue-500 hover:underline"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default Unauthorized;
