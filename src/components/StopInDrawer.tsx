import React from 'react';

interface StopInDrawerProps {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}

/**
 * Component that was previously used to prevent click propagation inside drawers.
 * Now simplified since we use Radix UI's modal={false} instead.
 */
const StopInDrawer = React.forwardRef<HTMLDivElement, StopInDrawerProps>(
  ({ children, className = "", asChild = false }, ref) => {
    if (asChild && React.isValidElement(children)) {
      type ChildProps = {
        className?: string;
        ref?: React.Ref<any>;
      };
      const child = children as React.ReactElement<ChildProps>;
      return React.cloneElement(child, {
        className: `${child.props.className || ''} ${className}`.trim() || undefined,
        ref,
      });
    }
    return (
      <div className={className || undefined} ref={ref}>
        {children}
      </div>
    );
  }
);
StopInDrawer.displayName = 'StopInDrawer';
export default StopInDrawer; 