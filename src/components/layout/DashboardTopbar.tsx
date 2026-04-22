import { Bell, Search, User, Menu, Download, Filter, CheckSquare2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { R } from '@/lib/routes';
import { isClientActivityHighlightType } from '@/lib/client-activity-highlights';

// 🔥 Firebase
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

interface DashboardTopbarProps {
  isAdmin?: boolean;
  onMenuClick?: () => void;
}

export function DashboardTopbar({ isAdmin = false, onMenuClick }: DashboardTopbarProps) {
  const navigate = useNavigate();
  const [userName,  setUserName]  = useState('User');
  const [userEmail, setUserEmail] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName  || 'User');
      setUserEmail(user.email       || '');
      
      // Get unread notifications count
      const unsub = onSnapshot(
        query(
          collection(db, 'activities'),
          where('clientId', '==', user.uid),
          orderBy('ts', 'desc')
        ),
        (snap) => {
          const now = Date.now();
          const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
          const recentCount = snap.docs.filter((d) => {
            const data = d.data();
            return (
              data.ts &&
              data.ts > sevenDaysAgo &&
              isClientActivityHighlightType(data.type)
            );
          }).length;
          setNotificationCount(recentCount > 0 ? Math.min(recentCount, 99) : 0);
        },
        (error) => {
          console.warn('Notifications query error:', error);
        }
      );
      
      return () => unsub();
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate(R.LOGIN);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden flex-shrink-0"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search */}
        <div className="relative flex-1 max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              isAdmin
                ? 'Search clients, pages…'
                : 'Search this app (use sidebar for pages)…'
            }
            className="pl-10 bg-secondary/50 border-0 focus-visible:ring-1"
            aria-label={isAdmin ? 'Search' : 'Search'}
          />
        </div>

        <Button variant="ghost" size="icon" className="sm:hidden">
          <Search className="h-5 w-5" />
        </Button>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <ThemeToggle />
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle light or dark mode</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative"
                  onClick={() => navigate(isAdmin ? R.ADMIN_ACTIVITY : R.NOTIFICATIONS)}
                  aria-label={
                    isAdmin
                      ? `Activity${notificationCount > 0 ? ` (${notificationCount} recent)` : ''}`
                      : `Recent updates${notificationCount > 0 ? ` (${notificationCount} in last 7 days)` : ''}`
                  }
                >
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {isAdmin
                    ? `Open activity${notificationCount > 0 ? ` (${notificationCount} recent items)` : ''}`
                    : `Open notifications${notificationCount > 0 ? ` — ${notificationCount} notable updates in the last 7 days` : ''}`}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2 md:px-3">
                <div className="h-8 w-8 rounded-full gradient-hero flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="hidden md:inline font-medium max-w-[120px] truncate">
                  {userName}
                </span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{userName}</span>
                  <span className="text-xs font-normal text-muted-foreground">{userEmail}</span>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {isAdmin ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link to={R.ADMIN}>Admin Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={R.ADMIN_MANAGE_ADMINS}>Manage Admins</Link>
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link to={R.PROFILE}>Profile & Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={R.NOTIFICATIONS}>Notifications</Link>
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive cursor-pointer"
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
