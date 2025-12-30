import * as React from "react";
import { cn } from "../../lib/utils";

export type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: number;
};

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-slate-200", className)}
      {...props}
    >
      <div
        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
);

Progress.displayName = "Progress";
