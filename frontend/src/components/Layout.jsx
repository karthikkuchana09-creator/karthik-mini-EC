import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { NotificationProvider } from '../context/NotificationContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gray-50">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="pt-16 lg:pl-64 min-h-screen">
          <Outlet />
        </main>
      </div>
    </NotificationProvider>
  );
}

export default Layout;
