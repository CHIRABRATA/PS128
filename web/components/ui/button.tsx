import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer min-h-[36px] hover-lift-sm",
  {
    variants: {
      variant: {
        default: "bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm border border-emerald-800/20 active:bg-emerald-900",
        destructive: "bg-red-700 text-white hover:bg-red-800 border border-red-800/20 shadow-sm active:bg-red-900",
        outline: "border border-[#D9D3C7] bg-white text-stone-800 hover:bg-stone-50 hover:text-stone-900 shadow-xs hover:border-stone-400 active:bg-stone-100",
        secondary: "bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-200 active:bg-stone-300",
        ghost: "text-stone-700 hover:bg-stone-100 hover:text-stone-900 shadow-none hover-lift-none active:bg-stone-200",
        link: "text-emerald-700 underline-offset-4 hover:underline shadow-none hover-lift-none",
        emerald: "bg-emerald-700 text-white hover:bg-emerald-800 border border-emerald-800/20 shadow-sm active:bg-emerald-900",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
