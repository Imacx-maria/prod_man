import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import * as React from "react"

import { cn } from "@/utils/tailwind"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-base text-sm font-base ring-offset-white transition-all gap-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-main text-black border-2 border-border hover:translate-x-boxShadowX hover:translate-y-boxShadowY",
        secondary:
          "bg-[var(--color-orange)] text-secondary-foreground dark:text-black border-2 border-border hover:translate-x-boxShadowX hover:translate-y-boxShadowY",
        destructive:
          "bg-destructive text-destructive-foreground border-2 border-border hover:translate-x-boxShadowX hover:translate-y-boxShadowY",
        outline:
          "border-2 border-border text-foreground bg-background hover:translate-x-boxShadowX hover:translate-y-boxShadowY",
        ghost:
          "border-2 border-border text-foreground opacity-50 bg-transparent hover:bg-accent hover:text-accent-foreground hover:opacity-100",
        link:
          "border-2 border-border text-foreground underline underline-offset-4 bg-main hover:translate-x-boxShadowX hover:translate-y-boxShadowY",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

const Button = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithRef<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants }
