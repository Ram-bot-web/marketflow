// Accessibility utilities and components

export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
    >
      Skip to main content
    </a>
  );
}

export function VisuallyHidden({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className="sr-only" {...props}>
      {children}
    </span>
  );
}

// ARIA live region for announcements
export function LiveRegion({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      {...props}
    >
      {children}
    </div>
  );
}

