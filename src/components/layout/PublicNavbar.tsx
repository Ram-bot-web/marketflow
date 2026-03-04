import { Link } from 'react-router-dom';
import { R } from '@/lib/routes';
import { Button } from '@/components/ui/button';
import { Zap, Menu } from 'lucide-react';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to={R.HOME} className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg gradient-hero flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-foreground">MarketFlow</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden sm:flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to={R.LOGIN}>Log in</Link>
          </Button>
          <Button asChild>
            <Link to={R.REGISTER}>Get Started</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>

        {/* Mobile Menu */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="right" className="w-[280px] sm:w-[320px]">
            <VisuallyHidden.Root>
              <SheetTitle>Navigation Menu</SheetTitle>
            </VisuallyHidden.Root>
            <div className="flex flex-col gap-4 mt-8">
              <Link
                to={R.LOGIN}
                onClick={() => setMobileOpen(false)}
                className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2"
              >
                Log in
              </Link>
              <Button asChild className="w-full">
                <Link to={R.REGISTER} onClick={() => setMobileOpen(false)}>
                  Get Started
                </Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
