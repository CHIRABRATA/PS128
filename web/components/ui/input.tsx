import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-sm border border-[#BFB69E] bg-[#FBF9F3] px-4 py-2 text-sm text-[#20271F] placeholder:text-[#858878] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60724C] focus-visible:border-[#60724C] disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
