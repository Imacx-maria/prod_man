import React from 'react';

interface StopInDrawerProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

/**
 * A component that prevents the drawer from closing when clicking on its children.
 * 
 * Use this to wrap interactive elements inside drawers that shouldn't cause the drawer to close
 * when clicked. This component captures the pointerdown event and stops its propagation.
 * 
 * @example
 * <Drawer>
 *   <DrawerContent>
 *     <StopInDrawer>
 *       <Button>Click me safely</Button>
 *     </StopInDrawer>
 *   </DrawerContent>
 * </Drawer>
 */
const StopInDrawer = ({ children, className = "", asChild = false }: StopInDrawerProps) => {
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only stop propagation if we're inside a drawer
    const isInDrawer = !!e.currentTarget.closest('[data-drawer="true"]');
    if (isInDrawer) {
      e.stopPropagation();
    }
  };
  
  // If asChild is true, we clone the child and add the onPointerDown handler
  if (asChild && React.Children.count(children) === 1) {
    const child = React.Children.only(children) as React.ReactElement<{
      onPointerDown?: (e: React.PointerEvent) => void;
      className?: string;
    }>;
    
    return React.cloneElement(child, {
      onPointerDown: (e: React.PointerEvent) => {
        handlePointerDown(e);
        // Call the original onPointerDown if it exists
        if (child.props.onPointerDown) {
          child.props.onPointerDown(e);
        }
      },
      className: `${child.props.className || ''} ${className}`.trim() || undefined
    });
  }

  return (
    <div className={className || undefined} onPointerDown={handlePointerDown}>
      {children}
    </div>
  );
};

export default StopInDrawer; 