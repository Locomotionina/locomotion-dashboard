import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
        outline: "text-foreground border-border",
        success:
          "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        warning:
          "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        cyan:
          "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
        purple:
          "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
