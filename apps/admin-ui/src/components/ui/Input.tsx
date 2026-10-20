import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-text-muted ml-1">
            {label}
          </label>
        )}
        <input
          className={cn(
            "flex h-10 w-full rounded-lg border border-border-subtle bg-white/5 px-3 py-2 text-sm text-white",
            "ring-offset-bg-void file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50",
            "disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
            error && "border-danger ring-danger/20",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="text-xs text-danger ml-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
