import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-glow hover:brightness-105',
        destructive:
          'bg-destructive text-destructive-foreground shadow-[0_12px_28px_-10px_hsl(var(--destructive)/0.6)] hover:brightness-105',
        outline: 'bg-card shadow-soft hover:text-primary active:shadow-neu-inset',
        secondary: 'bg-card text-secondary-foreground shadow-neu-sm hover:text-primary',
        ghost: 'hover:bg-card hover:shadow-neu-sm',
        link: 'text-primary underline-offset-4 hover:underline',
        win: 'bg-win text-white shadow-[0_12px_28px_-10px_hsl(var(--win)/0.65)] hover:brightness-105',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3.5 text-xs',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
