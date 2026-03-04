import { ReactNode, useState, useEffect } from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardTopbar } from './DashboardTopbar';
import { SkipToContent } from '@/components/ui/accessibility';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

interface DashboardLayoutProps {
  children: ReactNode;
  isAdmin?: boolean;
}

export function DashboardLayout({ children, isAdmin = false }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      handler: () => {
        // Focus search input
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        searchInput?.focus();
      },
      description: 'Focus search'
    },
    {
      key: 'Escape',
      handler: () => {
        if (mobileOpen) setMobileOpen(false);
      },
      description: 'Close mobile menu'
    }
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SkipToContent />
      <DashboardSidebar
        isAdmin={isAdmin}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      {/* Main content - no margin on mobile, ml-64 on desktop */}
      <div className="lg:ml-64 transition-all duration-300">
        <DashboardTopbar
          isAdmin={isAdmin}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main id="main-content" className="p-4 md:p-6" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
