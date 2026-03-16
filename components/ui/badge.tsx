import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest transition-all",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary/[0.08] text-primary",
        secondary: "border-border/40 bg-secondary/50 text-muted-foreground",
        destructive: "border-destructive/20 bg-destructive/[0.08] text-destructive",
        outline: "border-border/40 text-foreground/80",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
