import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { WebSocketProvider } from '../../context/WebSocketContext';
import { NotificationProvider } from '../../context/NotificationContext';

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const isMobile = useMediaQuery('(max-width: 1023px)');

  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

  function handleToggleCollapse() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  }

  return (
    <WebSocketProvider>
      <NotificationProvider>
        <div className="min-h-screen bg-gray-900">
          {/* Sidebar */}
          <Sidebar
            open={sidebarOpen}
            collapsed={isMobile ? false : sidebarCollapsed}
            onClose={() => setSidebarOpen(false)}
            onToggleCollapse={handleToggleCollapse}
          />

          {/* Main content area */}
          <div className={`transition-all duration-300 ease-out min-h-screen flex flex-col ${
            sidebarCollapsed && !isMobile ? 'lg:pl-16' : 'lg:pl-64'
          }`}>
            <Navbar onMenuClick={() => setSidebarOpen(true)} />

            <main className="flex-1 bg-gray-900">
              <div className="p-4 sm:p-6 lg:p-8">
                <Outlet />
              </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-800 px-6 py-4">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>&copy; {new Date().getFullYear()} Enterprise Cloud. All rights reserved.</span>
                <span>v2.0</span>
              </div>
            </footer>
          </div>
        </div>
      </NotificationProvider>
    </WebSocketProvider>
  );
}
