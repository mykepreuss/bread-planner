import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** A titled card, used for the setup cards and the ingredient stages. */
export function Panel({
  title,
  description,
  children,
  icon,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('work-card', className)}>
      <CardHeader>
        <div className="card-title-row">
          <CardTitle>{title}</CardTitle>
          {icon}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
