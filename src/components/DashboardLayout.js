import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
  const [currentTime, setCurrentTime] = useState('');

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };

    updateTime(); // Initial call
    const interval = setInterval(updateTime, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            {/* Location */}
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="w-5 h-5" />
              <span className="text-sm font-medium" style={{ fontFamily: 'Inter' }}>
                CUHK InnoPort
              </span>
            </div>

            {/* Real-time Clock */}
            <div className="text-xl font-medium text-gray-900" style={{ fontFamily: 'Inter' }}>
              {currentTime}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}