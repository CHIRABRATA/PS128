import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-sm text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60724C] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer min-h-[36px]",
  {
    variants: {
      variant: {
        default: "bg-[#274C36] text-[#FBF9F3] hover:bg-[#203D2C] shadow-none border border-[#274C36] active:bg-[#172D20]",
        destructive: "bg-red-700 text-white hover:bg-red-800 border border-red-800/20 shadow-sm active:bg-red-900",
        outline: "border border-[#BFB69E] bg-[#FBF9F3] text-[#30372D] hover:bg-[#E9E4D6] hover:text-[#20271F] shadow-none hover:border-[#60724C] active:bg-[#DED7C5]",
        secondary: "bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-200 active:bg-stone-300",
        ghost: "text-[#4F5649] hover:bg-[#E9E4D6] hover:text-[#20271F] shadow-none hover-lift-none active:bg-[#DED7C5]",
        link: "text-emerald-700 underline-offset-4 hover:underline shadow-none hover-lift-none",
        emerald: "bg-[#274C36] text-[#FBF9F3] hover:bg-[#203D2C] border border-[#274C36] shadow-none active:bg-[#172D20]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-sm",
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
