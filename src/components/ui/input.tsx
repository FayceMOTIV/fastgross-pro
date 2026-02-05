import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors",
            "placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-danger-500 focus:ring-danger-500 focus:border-danger-500",
            icon && "pl-10",
            className
          )}
          ref={ref}
          aria-invalid={error}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors",
          "placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-danger-500 focus:ring-danger-500 focus:border-danger-500",
          className
        )}
        ref={ref}
        aria-invalid={error}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="text-danger-500 ml-1">*</span>}
      </label>
    );
  }
);
Label.displayName = "Label";

export { Input, Textarea, Label };
