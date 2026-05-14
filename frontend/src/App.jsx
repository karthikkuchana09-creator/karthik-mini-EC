import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import GoogleCallback from './pages/GoogleCallback';
import Dashboard from './pages/Dashboard';
import Kanban from './pages/Kanban';
import Approvals from './pages/Approvals';
import TaskList from './pages/TaskList';
import CreateTask from './pages/CreateTask';
import EditTask from './pages/EditTask';
import TaskDetail from './pages/TaskDetail';
import ApprovalHistory from './pages/ApprovalHistory';
import Admin from './pages/Admin';
import Notifications from './pages/Notifications';
import Documents from './pages/Documents';
import AuditLogs from './pages/AuditLogs';
import LeaveApplication from './pages/LeaveApplication';
import LeaveStatus from './pages/LeaveStatus';
import Unauthorized from './pages/Unauthorized';
import ProtectedRoute from './components/ProtectedRoute';

function RedirectIfAuthed({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <AuthPage />
          </RedirectIfAuthed>
        }
      />
      <Route path="/auth/google/callback" element={<GoogleCallback />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<Layout />}>
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/kanban" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}><Kanban /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}><TaskList /></ProtectedRoute>} />
        <Route path="/tasks/create" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><CreateTask /></ProtectedRoute>} />
        <Route path="/tasks/:id/edit" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}><EditTask /></ProtectedRoute>} />
        <Route path="/tasks/:id" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}><TaskDetail /></ProtectedRoute>} />
        <Route path="/approvals/:id/history" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ApprovalHistory /></ProtectedRoute>} />
        <Route path="/approvals" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Approvals /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><AuditLogs /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Admin /></ProtectedRoute>} />
        <Route path="/leave-application" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}><LeaveApplication /></ProtectedRoute>} />
        <Route path="/leave-status" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}><LeaveStatus /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '12px', padding: '12px 16px', fontSize: '14px', fontWeight: 500 },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
