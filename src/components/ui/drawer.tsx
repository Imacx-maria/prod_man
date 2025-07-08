"use client"

import { Drawer as DrawerPrimitive } from "vaul"

import * as React from "react"

import { cn } from "@/utils/tailwind"

// Create a custom DrawerContent component that uses inert instead of aria-hidden
const CustomDrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Use a ref to access the DOM element
  const contentRef = React.useRef<HTMLDivElement>(null);
  
  // Create a unique ID for the description if needed
  const descriptionId = React.useId();
  
  // Check if we have a DrawerDescription among children
  const hasDescription = React.Children.toArray(children).some(
    child => React.isValidElement(child) && child.type === DrawerDescription
  );
  
  // Only add aria-describedby if there's no explicit one provided in props
  const describedbyProps = !props["aria-describedby"] && hasDescription 
    ? { "aria-describedby": descriptionId } 
    : {};

  // If aria-describedby is missing completely, add a default one  
  const ariaProps: { "aria-describedby": string } = { 
    "aria-describedby": props["aria-describedby"] || (hasDescription ? descriptionId : "drawer-content-description")
  };
  
  // Use a callback ref to combine the forwarded ref and our local ref
  const setRefs = React.useCallback(
    (node: HTMLDivElement) => {
      // Update our local ref
      contentRef.current = node;
      
      // Forward the ref
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref]
  );

  // Use an effect to set the inert attribute instead of aria-hidden
  React.useEffect(() => {
    if (!mounted || !contentRef.current) return;
    
    // Set up a mutation observer to replace aria-hidden with inert
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          const element = mutation.target as HTMLElement;
          if (element.hasAttribute('aria-hidden')) {
            // Get the value and then remove it
            const isHidden = element.getAttribute('aria-hidden') === 'true';
            element.removeAttribute('aria-hidden');
            
            // Only add inert if it was hidden
            if (isHidden) {
              element.setAttribute('inert', '');
            } else {
              element.removeAttribute('inert');
            }
          }
        }
      });
    });
    
    observer.observe(contentRef.current, { 
      attributes: true, 
      subtree: true, 
      attributeFilter: ['aria-hidden'] 
    });
    
    return () => observer.disconnect();
  }, [mounted]);

  return (
    <DrawerPrimitive.Portal data-slot="drawer-portal" data-no-aria-hidden="true">
      <DrawerPrimitive.Overlay
        data-slot="drawer-overlay"
        data-no-aria-hidden="true"
        className={cn(
          "fixed inset-0 z-50 bg-overlay"
        )}
      />
      <DrawerPrimitive.Content
        ref={setRefs}
        data-slot="drawer-content"
        data-no-aria-hidden="true"
        className={cn(
          "bg-background group/drawer-content fixed z-50 flex h-auto flex-col",
          "max-w-[95vw] mx-auto", // Global width constraint for visual consistency
          "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-base data-[vaul-drawer-direction=top]:border-t data-[vaul-drawer-direction=top]:border-t-border",
          "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-base data-[vaul-drawer-direction=bottom]:border-b data-[vaul-drawer-direction=bottom]:border-b-border",
          "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:sm:max-w-[95vw] data-[vaul-drawer-direction=right]:border-r data-[vaul-drawer-direction=right]:border-r-border",
          "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:sm:max-w-[95vw] data-[vaul-drawer-direction=left]:border-l data-[vaul-drawer-direction=left]:border-l-border",
          "border border-border ring-0", // 1px border, no shadow
          className,
        )}
        {...ariaProps}
        {...props}
      >
        <div id="drawer-content-description" className="sr-only">Drawer content</div>
        <div className="mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block bg-current" />
        {/* Map children to add description ID if needed */}
        {React.Children.map(children, child => {
          if (React.isValidElement(child) && child.type === DrawerDescription) {
            return React.cloneElement(child as React.ReactElement<any>, {
              id: descriptionId,
            });
          }
          return child;
        })}
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  )
});
CustomDrawerContent.displayName = "DrawerContent";

function Drawer({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root> & { shouldScaleBackground?: boolean }) {
  return (
    <DrawerPrimitive.Root
      data-slot="drawer"
      shouldScaleBackground={shouldScaleBackground}
      {...props}
    />
  );
}

const DrawerTrigger = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  return (
    <DrawerPrimitive.Trigger
      ref={ref}
      data-slot="drawer-trigger"
      className={cn("bg-main text-black", className)}
      {...props}
    />
  );
});
DrawerTrigger.displayName = "DrawerTrigger";

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

const DrawerClose = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Close>
>(({ ...props }, ref) => {
  return (
    <DrawerPrimitive.Close 
      ref={ref}
      data-slot="drawer-close" 
      {...props} 
    />
  );
});
DrawerClose.displayName = "DrawerClose";

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Use an effect to replace aria-hidden with inert attribute
  React.useEffect(() => {
    if (!mounted || !overlayRef.current) return;
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          const element = mutation.target as HTMLElement;
          if (element.hasAttribute('aria-hidden')) {
            // Get the value and then remove it
            const isHidden = element.getAttribute('aria-hidden') === 'true';
            element.removeAttribute('aria-hidden');
            
            // Only add inert if it was hidden
            if (isHidden) {
              element.setAttribute('inert', '');
            } else {
              element.removeAttribute('inert');
            }
          }
        }
      });
    });
    
    observer.observe(overlayRef.current, { 
      attributes: true, 
      subtree: true, 
      attributeFilter: ['aria-hidden'] 
    });
    
    return () => observer.disconnect();
  }, [mounted]);
  
  return (
    <DrawerPrimitive.Overlay
      ref={overlayRef}
      data-slot="drawer-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-overlay",
        className,
      )}
      {...props}
    />
  )
}

const DrawerHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="drawer-header"
      className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
      {...props}
    />
  );
});
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-3 p-4", className)}
      {...props}
    />
  );
});
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => {
  return (
    <DrawerPrimitive.Title
      ref={ref}
      data-slot="drawer-title"
      className={cn(
        "text-lg font-heading leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  );
});
DrawerTitle.displayName = "DrawerTitle";

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => {
  return (
    <DrawerPrimitive.Description
      ref={ref}
      data-slot="drawer-description"
      className={cn("text-sm font-base text-foreground", className)}
      {...props}
    />
  );
});
DrawerDescription.displayName = "DrawerDescription";

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  CustomDrawerContent as DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
