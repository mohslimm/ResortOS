import { useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import Lenis from 'lenis';
import { 
  LayoutDashboard, 
  BedDouble, 
  Users, 
  Car, 
  Sparkles,
  Bell,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VARIANTS } from '@/lib/variants';
import { useRealtime } from '@/hooks/useRealtime';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'PMS (Chambres)', path: '/pms', icon: BedDouble },
  { name: 'Ressources Humaines', path: '/hr', icon: Users },
  { name: 'Parking', path: '/parking', icon: Car },
  { name: 'Housekeeping', path: '/housekeeping', icon: Sparkles },
];

export function AdminLayout() {
  // Initialize WebSocket connection
  useRealtime();

  // Lenis Smooth Scroll Setup
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-void)]">
      
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-white/5 bg-[var(--bg-primary)] flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <h1 className="font-display text-2xl font-semibold italic text-gold-500">ResortOS</h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-gold-500/10 text-gold-400" 
                  : "text-text-muted hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 font-display text-lg">
              M
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">Manager</p>
              <p className="text-xs text-text-muted">ResortOS Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Topbar */}
        <header className="h-16 flex-shrink-0 border-b border-white/5 bg-[var(--bg-primary)]/80 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <div className="flex items-center bg-white/5 rounded-lg px-3 py-1.5 border border-white/5 w-64 focus-within:border-gold-500/50 transition-colors">
            <Search className="h-4 w-4 text-text-muted mr-2" />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-text-muted"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full text-text-muted hover:text-white hover:bg-white/5 transition-colors relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-gold-500"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8" id="main-scroll-container">
          <motion.div
            variants={VARIANTS.staggerContainer}
            initial="initial"
            animate="animate"
            className="max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
