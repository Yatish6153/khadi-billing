import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent } from './card';

/** Red strip with a retry button, shown when a list fails to load. */
export function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-destructive/40">
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
        <span className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-4 w-4" aria-hidden /> {message}
        </span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
