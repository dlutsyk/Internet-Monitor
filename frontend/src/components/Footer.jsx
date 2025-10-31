import { cn } from '../utils/cn';

export default function Footer() {
  return (
    <div className={cn("bg-white border-t border-neutral-200 py-4 w-full flex-shrink-0")}>
      <div className={cn("flex justify-between items-center px-6")}>
        <p className={cn("text-sm text-neutral-600")}>
          Last updated: 2025-01-15 15:42:33
        </p>
        <div className={cn("flex items-center gap-2 text-sm text-neutral-600")}>
          <p>Monitoring since: 2025-01-01</p>
          <p>•</p>
          <p>Data points: 1,247,892</p>
        </div>
      </div>
    </div>
  );
}
