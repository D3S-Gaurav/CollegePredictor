import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "secondary" | "destructive" | "outline";
  }
>(({ className, variant = "default", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-blue-500/20 text-blue-400":
            variant === "default",
          "border-transparent bg-white/10 text-white/80":
            variant === "secondary",
          "border-transparent bg-red-500/20 text-red-400":
            variant === "destructive",
          "border-white/20 text-white/70": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
});
Badge.displayName = "Badge";

export { Badge };
