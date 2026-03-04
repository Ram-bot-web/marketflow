import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Zap,
  LogOut,
  ChevronLeft,
  Users,
  ShieldCheck,
  LineChart,
  ClipboardList,
  UserCheck,
  Activity,
  CheckSquare,
  PenTool,
  CreditCard,
  Layers,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useTheme } from "@/components/theme/theme-provider";
import { R } from "@/lib/routes";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const clientNavItems: NavItem[] = [
  { title: 'Dashboard',       href: R.DASHBOARD, icon: LayoutDashboard },
  { title: 'Marketing Plan',  href: R.PLAN,      icon: FileText },
  { title: 'Results',         href: R.RESULTS,   icon: BarChart3 },
  { title: 'Tasks',           href: R.TASKS,     icon: CheckSquare },
  { title: 'Invoices',        href: R.INVOICES,  icon: CreditCard },
  { title: 'Activity',       href: R.ACTIVITY_TIMELINE, icon: Activity },
  { title: 'Calendar',      href: R.CALENDAR,          icon: Calendar },
];

const adminNavSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Clients',    href: R.ADMIN,            icon: Users },
      { title: 'Analytics',  href: R.ADMIN_ANALYTICS,  icon: LineChart },
    ],
  },
  {
    label: 'Campaigns',
    items: [
      { title: 'Reports',    href: R.ADMIN_REPORTS,    icon: ClipboardList },
      { title: 'Onboarding', href: R.ADMIN_ONBOARDING, icon: UserCheck },
      { title: 'Activity',   href: R.ADMIN_ACTIVITY,   icon: Activity },
      { title: 'Client Health', href: R.ADMIN_HEALTH,  icon: Activity },
    ],
  },
  {
    label: 'Tools',
    items: [
      { title: 'Tasks',          href: R.ADMIN_TASKS,          icon: CheckSquare },
      { title: 'Marketing Plans',href: R.ADMIN_PLAN_EDITOR,    icon: PenTool },
    ],
  },
  {
    label: 'Business',
    items: [
      { title: 'Billing',       href: R.ADMIN_BILLING,       icon: CreditCard },
      { title: 'Plan Manager',  href: R.ADMIN_PLAN_MANAGER,  icon: Layers },
    ],
  },
  {
    label: 'Settings',
    items: [
      { title: 'Manage Admins', href: R.ADMIN_MANAGE_ADMINS, icon: ShieldCheck },
      { title: 'Automation',    href: R.ADMIN_AUTOMATION,    icon: Zap },
    ],
  },
];

interface DashboardSidebarProps {
  isAdmin?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function SidebarContent({ isAdmin, collapsed, setCollapsed, onLinkClick }: {
  isAdmin: boolean;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  onLinkClick?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate(R.LOGIN);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isActive = (href: string) =>
    href === R.ADMIN
      ? location.pathname === R.ADMIN
      : location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/20 flex-shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
        <Link
          to={isAdmin ? R.ADMIN : R.DASHBOARD}
          className="flex items-center gap-2"
          onClick={onLinkClick}
        >
          <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Zap className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-white">MarketFlow</span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hidden lg:flex text-white hover:bg-white/20"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform text-white", collapsed && "rotate-180")} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {isAdmin ? (
          /* Admin: sectioned nav */
          <div className="space-y-4">
            {adminNavSections.map((section) => (
              <div key={section.label}>
                {!collapsed && (
                  <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/60">
                    {section.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={onLinkClick}
                      aria-label={item.title}
                      aria-current={isActive(item.href) ? 'page' : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 focus-ring focus-visible:ring-white/50",
                        isActive(item.href)
                          ? "bg-white/20 text-white shadow-[0_4px_12px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.2)]"
                          : "text-white/80 hover:bg-white/10 hover:text-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive(item.href) ? "text-white" : "text-white/80")} aria-hidden="true" />
                      {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Client: flat nav */
          <div className="space-y-0.5">
            {clientNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={onLinkClick}
                aria-label={item.title}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 focus-ring focus-visible:ring-white/50",
                  isActive(item.href)
                    ? "bg-white/20 text-white shadow-[0_4px_12px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.2)]"
                    : "text-white/80 hover:bg-white/10 hover:text-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                )}
              >
                <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive(item.href) ? "text-white" : "text-white/80")} aria-hidden="true" />
                {!collapsed && <span className="font-medium">{item.title}</span>}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/20 dark:border-white/20 flex-shrink-0 space-y-2">
        <div className="flex items-center gap-2">
          {!collapsed && (
            <div className="flex-1 flex items-center gap-2">
              <ThemeToggle className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10" />
              <span className="text-sm text-white/80">Theme</span>
            </div>
          )}
          {collapsed && (
            <div className="w-full flex justify-center">
              <ThemeToggle className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10" />
            </div>
          )}
        </div>
        <button
          onClick={() => {
            handleLogout();
            onLinkClick?.();
          }}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left",
            "text-white/80 hover:bg-white/10 hover:text-white"
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0 text-white/80" />
          {!collapsed && <span className="font-medium">Log out</span>}
        </button>
      </div>
    </div>
  );
}

export function DashboardSidebar({ isAdmin = false, mobileOpen = false, onMobileClose }: DashboardSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r transition-all duration-300",
          "hidden lg:block shadow-[4px_0_20px_rgba(0,0,0,0.3),8px_0_30px_rgba(0,0,0,0.2)]",
          "bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 dark:from-blue-900 dark:via-blue-950 dark:to-slate-900",
          "border-white/20 dark:border-white/10",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent
          isAdmin={isAdmin}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose?.()}>
        <SheetContent side="left" className="w-64 p-0 bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 dark:from-blue-900 dark:via-blue-950 dark:to-slate-900 border-r border-white/20 dark:border-white/10 shadow-[4px_0_20px_rgba(0,0,0,0.3),8px_0_30px_rgba(0,0,0,0.2)]">
          <VisuallyHidden.Root>
            <SheetTitle>Navigation Menu</SheetTitle>
          </VisuallyHidden.Root>
          <SidebarContent
            isAdmin={isAdmin}
            collapsed={false}
            setCollapsed={() => { }}
            onLinkClick={onMobileClose}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
