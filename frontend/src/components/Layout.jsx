import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { WebSocketProvider } from '../context/WebSocketContext';
import { NotificationProvider } from '../context/NotificationContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useIsMobile } from '../hooks/useMediaQuery';

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });
  const isMobile = useIsMobile();

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      return next;
    });
  };

  return (
    <WebSocketProvider>
      <NotificationProvider>
        <div className="min-h-screen bg-gray-50">
          <Navbar
            onMenuClick={() => setSidebarOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleCollapse}
          />
          <Sidebar
            open={sidebarOpen}
            collapsed={isMobile ? false : sidebarCollapsed}
            onClose={() => setSidebarOpen(false)}
            onToggleCollapse={handleToggleCollapse}
          />
          <main
            className={`pt-16 min-h-screen transition-all duration-300 ease-out ${
              sidebarCollapsed && !isMobile ? 'lg:pl-16' : 'lg:pl-64'
            }`}
          >
            <Outlet />
          </main>
        </div>
      </NotificationProvider>
    </WebSocketProvider>
  );
}

export default Layout;
