import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { DashboardPage } from '@/app/dashboard/page';
import PmsPage from '@/app/pms/page';
import HrPage from '@/app/hr/page';
import ParkingPage from '@/app/parking/page';
import HousekeepingPage from '@/app/housekeeping/page';
import { useAuthStore } from '@/stores/useAuthStore';

export function App() {
  const { login, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(!isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    
    // Auto-login seeded developer admin
    fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@club.com',
        password: 'admin123',
      }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Auth failed');
        return res.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          if (data.access_token && data.user) {
            login(data.user, data.access_token);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('ResortOS auto-login failed:', err);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [login, isAuthenticated]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#060610] text-[#f0ede8]">
        <div className="animate-pulse space-y-4 text-center">
          <h1 className="font-display italic text-4xl text-[#c5a059] tracking-widest">ResortOS</h1>
          <div className="flex items-center justify-center space-x-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c5a059] animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#c5a059] animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#c5a059] animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
          <p className="font-body text-[#f0ede8]/45 text-[10px] tracking-[0.2em] uppercase">Initialisation de la session</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="pms" element={<PmsPage />} />
          <Route path="hr" element={<HrPage />} />
          <Route path="parking" element={<ParkingPage />} />
          <Route path="housekeeping" element={<HousekeepingPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

