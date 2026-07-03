import * as React from 'react';

import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3.5 py-2 text-sm text-[#F0F4FF]',
        'placeholder:text-[#475569] outline-none transition-colors',
        'focus-visible:border-[#2D7A27] focus-visible:ring-1 focus-visible:ring-[#2D7A27]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
