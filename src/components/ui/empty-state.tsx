import { ReactNode } from 'react';
import { Card, CardContent } from './card';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={cn("shadow-card", className)}>
      <CardContent className="py-12 text-center">
        {icon && (
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
              {icon}
            </div>
          </div>
        )}
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
          {description}
        </p>
        {action && (
          <Button onClick={action.onClick} variant="default">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

