import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#60724C]",
  {
    variants: {
      variant: {
        default: "border-emerald-200 bg-emerald-50 text-emerald-800",
        secondary: "border-stone-200 bg-stone-100 text-stone-700",
        destructive: "border-red-200 bg-red-50 text-red-700",
        warning: "border-amber-200 bg-amber-50 text-amber-800",
        success: "border-emerald-200 bg-emerald-50 text-emerald-800",
        outline: "border-stone-300 text-stone-700 bg-white",
        critical: "border-red-500 bg-red-600 text-white font-bold shadow-sm shadow-red-200",
        elevated: "border-amber-300 bg-amber-100 text-amber-900",
        low: "border-emerald-200 bg-emerald-50 text-emerald-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
