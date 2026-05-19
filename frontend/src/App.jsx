import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute, ErrorBoundary } from './components/guards';
import Layout from './components/Layout';
import { SkeletonPage, Spinner } from './components/ui';

const AuthPage = lazy(() => import('./pages/AuthPage'));
const GoogleCallback = lazy(() => import('./pages/GoogleCallback'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Kanban = lazy(() => import('./pages/Kanban'));
const Approvals = lazy(() => import('./pages/Approvals'));
const TaskList = lazy(() => import('./pages/TaskList'));
const CreateTask = lazy(() => import('./pages/CreateTask'));
const EditTask = lazy(() => import('./pages/EditTask'));
const TaskDetail = lazy(() => import('./pages/TaskDetail'));
const ApprovalHistory = lazy(() => import('./pages/ApprovalHistory'));
const Admin = lazy(() => import('./pages/Admin'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Documents = lazy(() => import('./pages/Documents'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const LeaveApplication = lazy(() => import('./pages/LeaveApplication'));
const LeaveStatus = lazy(() => import('./pages/LeaveStatus'));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  );
}

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
            <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <AuthPage />
              </Suspense>
            </ErrorBoundary>
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/auth/google/callback"
        element={
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <GoogleCallback />
            </Suspense>
          </ErrorBoundary>
        }
      />
      <Route
        path="/unauthorized"
        element={
          <Suspense fallback={<PageLoader />}>
            <Unauthorized />
          </Suspense>
        }
      />

      <Route element={<Layout />}>
        <Route path="/dashboard" element={<ProtectedRoute><ErrorBoundary><Suspense fallback={<SkeletonPage />}><Dashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/manager-dashboard" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ErrorBoundary><Suspense fallback={<SkeletonPage />}><ManagerDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/kanban" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}><ErrorBoundary><Suspense fallback={<SkeletonPage />}><Kanban /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}><ErrorBoundary><Suspense fallback={<SkeletonPage />}><TaskList /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/tasks/create" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ErrorBoundary><Suspense fallback={<SkeletonPage />}><CreateTask /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/tasks/:id/edit" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}><ErrorBoundary><Suspense fallback={<SkeletonPage />}><EditTask /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/tasks/:id" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}><ErrorBoundary><Suspense fallback={<SkeletonPage />}><TaskDetail /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/approvals/:id/history" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ErrorBoundary><Suspense fallback={<SkeletonPage />}><ApprovalHistory /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/approvals" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ErrorBoundary><Suspense fallback={<SkeletonPage />}><Approvals /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><ErrorBoundary><Suspense fallback={<SkeletonPage />}><Documents /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><ErrorBoundary><Suspense fallback={<SkeletonPage />}><Notifications /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/audit-logs" element={<ProtectedRoute allowedRoles={['admin']}><ErrorBoundary><Suspense fallback={<SkeletonPage />}><AuditLogs /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><ErrorBoundary><Suspense fallback={<SkeletonPage />}><Admin /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={['admin']}><ErrorBoundary><Suspense fallback={<SkeletonPage />}><AdminDashboard /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/leave-application" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}><ErrorBoundary><Suspense fallback={<SkeletonPage />}><LeaveApplication /></Suspense></ErrorBoundary></ProtectedRoute>} />
        <Route path="/leave-status" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'employee']}><ErrorBoundary><Suspense fallback={<SkeletonPage />}><LeaveStatus /></Suspense></ErrorBoundary></ProtectedRoute>} />
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
