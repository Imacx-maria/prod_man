import * as React from "react"

import { cn } from "@/utils/tailwind"

const Card = React.forwardRef<HTMLDivElement, React.ComponentPropsWithRef<'div'>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card"
    className={cn(
      "rounded-base flex flex-col shadow-shadow border-2 gap-6 py-6 border-border text-foreground font-base bg-background",
      "Card",
      className,
    )}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.ComponentPropsWithRef<'div'>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-header"
    className={cn("flex flex-col px-6 space-y-1.5", className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLDivElement, React.ComponentPropsWithRef<'div'>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-title"
    className={cn("font-heading leading-none", className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLDivElement, React.ComponentPropsWithRef<'div'>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-description"
    className={cn("text-sm font-base", className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardAction = React.forwardRef<HTMLDivElement, React.ComponentPropsWithRef<'div'>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-action"
    className={cn(
      "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
      className,
    )}
    {...props}
  />
));
CardAction.displayName = 'CardAction';

const CardContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithRef<'div'>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-content"
    className={cn("px-6", className)}
    {...props}
  />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.ComponentPropsWithRef<'div'>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="card-footer"
    className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
}
