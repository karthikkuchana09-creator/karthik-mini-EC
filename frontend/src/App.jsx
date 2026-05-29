import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { StoreProvider } from './app/store.jsx';
import { ErrorBoundary } from './components/guards';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: { borderRadius: '12px', padding: '12px 16px', fontSize: '14px', fontWeight: 500 },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <StoreProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </StoreProvider>
    </ErrorBoundary>
  );
}

export default App;
